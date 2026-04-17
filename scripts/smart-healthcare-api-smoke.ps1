$ErrorActionPreference = 'Stop'

$results = New-Object System.Collections.Generic.List[object]
$RepoRoot = Split-Path $PSScriptRoot -Parent
$EnvPath = Join-Path $RepoRoot '.env'
$tempFile = $null

function Add-Result {
  param(
    [string]$Name,
    [int]$Status,
    [string]$Note = ''
  )

  $script:results.Add([pscustomobject]@{
      Name   = $Name
      Status = $Status
      Note   = $Note
    }) | Out-Null
}

function Test-SuccessStatus {
  param([int]$Status)
  return $Status -ge 200 -and $Status -lt 300
}

function Ensure-Success {
  param(
    [string]$Name,
    $Response
  )

  if (-not (Test-SuccessStatus $Response.Status)) {
    throw "$Name failed with status $($Response.Status)"
  }
}

function Ensure-Value {
  param(
    [string]$Name,
    $Value
  )

  if ($null -eq $Value -or [string]::IsNullOrWhiteSpace([string]$Value)) {
    throw "$Name did not return a usable value"
  }
}

function Get-JsonValue {
  param(
    $Object,
    [string[]]$Path
  )

  $current = $Object
  foreach ($segment in $Path) {
    if ($null -eq $current) {
      return $null
    }

    $property = $current.PSObject.Properties[$segment]
    if ($null -eq $property) {
      return $null
    }

    $current = $property.Value
  }

  return $current
}

function Get-FirstSlotId {
  param(
    $ResponseJson,
    [string]$Raw = ''
  )

  $slotId = Get-JsonValue $ResponseJson @('slotId')
  if (-not [string]::IsNullOrWhiteSpace([string]$slotId)) {
    return [string]$slotId
  }

  $slots = Get-JsonValue $ResponseJson @('slots')
  if ($slots) {
    if ($slots -is [System.Collections.IEnumerable] -and -not ($slots -is [string])) {
      foreach ($slot in $slots) {
        $candidate = Get-JsonValue $slot @('slotId')
        if (-not [string]::IsNullOrWhiteSpace([string]$candidate)) {
          return [string]$candidate
        }
      }
    }

    $candidate = Get-JsonValue $slots @('slotId')
    if (-not [string]::IsNullOrWhiteSpace([string]$candidate)) {
      return [string]$candidate
    }
  }

  if ($Raw) {
    $match = [regex]::Match($Raw, '"slotId"\s*:\s*"([^"]+)"')
    if ($match.Success) {
      return $match.Groups[1].Value
    }
  }

  return $null
}

function Get-RetryDelayMilliseconds {
  param(
    $Headers,
    [int]$Attempt
  )

  $retryAfter = $null
  if ($Headers) {
    $retryAfter = $Headers['Retry-After']
    if ($retryAfter -is [System.Array] -and $retryAfter.Count -gt 0) {
      $retryAfter = $retryAfter[0]
    }
  }

  if (-not [string]::IsNullOrWhiteSpace([string]$retryAfter)) {
    $numeric = 0
    if ([int]::TryParse([string]$retryAfter, [ref]$numeric)) {
      return [Math]::Min(15000, [Math]::Max(500, $numeric * 1000))
    }

    $parsedDate = [DateTime]::MinValue
    if ([DateTime]::TryParse([string]$retryAfter, [ref]$parsedDate)) {
      $delay = [int][Math]::Max(500, ($parsedDate.ToUniversalTime() - [DateTime]::UtcNow).TotalMilliseconds)
      return [Math]::Min(15000, $delay)
    }
  }

  return [Math]::Min(15000, 1500 * ($Attempt + 1))
}

function Invoke-JsonRequest {
  param(
    [string]$Method,
    [string]$Url,
    [hashtable]$Headers = @{},
    $Body = $null,
    [Microsoft.PowerShell.Commands.WebRequestSession]$Session = $null,
    [string]$ContentType = 'application/json',
    [int]$MaxAttempts = 5
  )

  for ($attempt = 0; $attempt -le $MaxAttempts; $attempt++) {
    $params = @{
      Method          = $Method
      Uri             = $Url
      Headers         = $Headers
      TimeoutSec      = 90
      UseBasicParsing = $true
      ErrorAction     = 'Stop'
    }

    if ($null -ne $Session) {
      $params.WebSession = $Session
    }

    if ($null -ne $Body) {
      if ($ContentType -eq 'application/json' -and -not ($Body -is [string])) {
        $params.Body = $Body | ConvertTo-Json -Depth 20 -Compress
      } else {
        $params.Body = $Body
      }
      $params.ContentType = $ContentType
    }

    try {
      $response = Invoke-WebRequest @params
      $json = $null
      if ($response.Content) {
        try {
          $json = $response.Content | ConvertFrom-Json
        } catch {
        }
      }

      return [pscustomobject]@{
        Status = [int]$response.StatusCode
        Json   = $json
        Raw    = $response.Content
      }
    } catch {
      $status = 0
      $raw = ''
      $retryHeaders = $null
      if ($_.Exception.Response) {
        $status = [int]$_.Exception.Response.StatusCode
        $retryHeaders = $_.Exception.Response.Headers
        $stream = $_.Exception.Response.GetResponseStream()
        if ($stream) {
          $reader = New-Object System.IO.StreamReader($stream)
          $raw = $reader.ReadToEnd()
          $reader.Close()
        }
      }

      if ($status -eq 429 -and $attempt -lt $MaxAttempts) {
        Start-Sleep -Milliseconds (Get-RetryDelayMilliseconds -Headers $retryHeaders -Attempt $attempt)
        continue
      }

      $json = $null
      if ($raw) {
        try {
          $json = $raw | ConvertFrom-Json
        } catch {
        }
      }

      return [pscustomobject]@{
        Status = $status
        Json   = $json
        Raw    = $raw
      }
    }
  }
}

function Invoke-MultipartUpload {
  param(
    [string]$Url,
    [string]$Token,
    [string]$FilePath,
    [string]$Title,
    [string]$Description,
    [string]$ReportType,
    [int]$MaxAttempts = 5
  )

  $mimeType = if ([System.IO.Path]::GetExtension($FilePath).ToLowerInvariant() -eq '.png') { 'image/png' } else { 'application/octet-stream' }

  for ($attempt = 0; $attempt -le $MaxAttempts; $attempt++) {
    $output = & curl.exe -s -o - -w "`nHTTPSTATUS:%{http_code}" -X POST $Url -H "Authorization: Bearer $Token" -F "title=$Title" -F "description=$Description" -F "reportType=$ReportType" -F "file=@$FilePath;type=$mimeType"
    $joined = $output | Out-String
    $match = [regex]::Match($joined, 'HTTPSTATUS:(\d{3})\s*$')
    if (-not $match.Success) {
      throw "Failed to parse multipart response for $Url"
    }

    $status = [int]$match.Groups[1].Value
    $body = $joined.Substring(0, $match.Index).Trim()
    if ($status -eq 429 -and $attempt -lt $MaxAttempts) {
      Start-Sleep -Milliseconds (Get-RetryDelayMilliseconds -Headers $null -Attempt $attempt)
      continue
    }

    $json = $null
    if ($body) {
      try {
        $json = $body | ConvertFrom-Json
      } catch {
      }
    }

    return [pscustomobject]@{
      Status = $status
      Json   = $json
      Raw    = $body
    }
  }
}

function Get-EnvValue {
  param([string]$Name)

  if (-not (Test-Path $script:EnvPath)) {
    throw ".env file not found at $script:EnvPath"
  }

  $content = Get-Content $script:EnvPath -Raw
  $match = [regex]::Match($content, "(?m)^$([regex]::Escape($Name))=(.+)$")
  if (-not $match.Success) {
    throw "Missing $Name in .env"
  }
  return $match.Groups[1].Value.Trim()
}

Push-Location $RepoRoot
try {
  $base = 'http://127.0.0.1'
  $gateway = "${base}:3000"
  $authDirect = "${base}:3001"
  $patientDirect = "${base}:3002"
  $doctorDirect = "${base}:3003"
  $appointmentDirect = "${base}:3004"
  $teleDirect = "${base}:3005"
  $paymentDirect = "${base}:3006"
  $notificationDirect = "${base}:3007"
  $aiDirect = "${base}:8000"

  $internalApiKey = Get-EnvValue 'INTERNAL_SERVICE_API_KEY'
  $webhookSecret = Get-EnvValue 'STRIPE_WEBHOOK_SECRET'

  $healthChecks = @(
    @{ Name = 'gateway health'; Url = "$gateway/health" },
    @{ Name = 'auth health'; Url = "$authDirect/health" },
    @{ Name = 'patient health'; Url = "$patientDirect/health" },
    @{ Name = 'doctor health'; Url = "$doctorDirect/health" },
    @{ Name = 'appointment health'; Url = "$appointmentDirect/health" },
    @{ Name = 'telemedicine health'; Url = "$teleDirect/health" },
    @{ Name = 'payment health'; Url = "$paymentDirect/health" },
    @{ Name = 'notification health'; Url = "$notificationDirect/health" },
    @{ Name = 'notification direct api health'; Url = "$notificationDirect/api/notifications/health" },
    @{ Name = 'ai health'; Url = "$aiDirect/api/ai/health" },
    @{ Name = 'gateway docs index'; Url = "$gateway/api-docs" },
    @{ Name = 'gateway auth docs'; Url = "$gateway/api-docs/auth" },
    @{ Name = 'gateway auth docs json'; Url = "$gateway/api-docs/auth.json" },
    @{ Name = 'gateway patient docs'; Url = "$gateway/api-docs/patient" },
    @{ Name = 'gateway patient docs json'; Url = "$gateway/api-docs/patient.json" },
    @{ Name = 'auth docs json'; Url = "$authDirect/api-docs.json" },
    @{ Name = 'patient docs json'; Url = "$patientDirect/api-docs.json" },
    @{ Name = 'doctor docs json'; Url = "$doctorDirect/api-docs.json" },
    @{ Name = 'appointment docs json'; Url = "$appointmentDirect/api-docs.json" },
    @{ Name = 'telemedicine docs json'; Url = "$teleDirect/api-docs.json" },
    @{ Name = 'payment docs json'; Url = "$paymentDirect/api-docs.json" },
    @{ Name = 'ai docs json'; Url = "$aiDirect/openapi.json" }
  )

  foreach ($check in $healthChecks) {
    $response = Invoke-JsonRequest -Method 'GET' -Url $check.Url
    Add-Result -Name $check.Name -Status $response.Status
  }

  $adminSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $patientSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
  $doctorSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession

  $adminLogin = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/login" -Body @{ email = 'admin@healthcare.dev'; password = 'Admin@1234!' } -Session $adminSession
  Add-Result -Name 'auth login admin' -Status $adminLogin.Status
  Ensure-Success -Name 'auth login admin' -Response $adminLogin
  $adminToken = Get-JsonValue $adminLogin.Json @('accessToken')
  Ensure-Value -Name 'admin token' -Value $adminToken

  $patientLogin = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/login" -Body @{ email = 'patient@healthcare.dev'; password = 'Patient@1234!' } -Session $patientSession
  Add-Result -Name 'auth login patient' -Status $patientLogin.Status
  Ensure-Success -Name 'auth login patient' -Response $patientLogin
  $patientToken = Get-JsonValue $patientLogin.Json @('accessToken')
  Ensure-Value -Name 'patient token' -Value $patientToken

  $doctorLogin = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/login" -Body @{ email = 'doctor@healthcare.dev'; password = 'Doctor@1234!' } -Session $doctorSession
  Add-Result -Name 'auth login doctor' -Status $doctorLogin.Status
  Ensure-Success -Name 'auth login doctor' -Response $doctorLogin
  $doctorToken = Get-JsonValue $doctorLogin.Json @('accessToken')
  Ensure-Value -Name 'doctor token' -Value $doctorToken

  $adminHeaders = @{ Authorization = "Bearer $adminToken" }
  $patientHeaders = @{ Authorization = "Bearer $patientToken" }
  $doctorHeaders = @{ Authorization = "Bearer $doctorToken" }

  $adminMe = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/auth/me" -Headers $adminHeaders
  Add-Result -Name 'auth me admin' -Status $adminMe.Status
  Ensure-Success -Name 'auth me admin' -Response $adminMe

  $patientMe = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/auth/me" -Headers $patientHeaders
  Add-Result -Name 'auth me patient' -Status $patientMe.Status
  Ensure-Success -Name 'auth me patient' -Response $patientMe

  $doctorMe = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/auth/me" -Headers $doctorHeaders
  Add-Result -Name 'auth me doctor' -Status $doctorMe.Status
  Ensure-Success -Name 'auth me doctor' -Response $doctorMe

  $patientUserId = Get-JsonValue $patientMe.Json @('userId')
  $doctorUserId = Get-JsonValue $doctorMe.Json @('userId')
  Ensure-Value -Name 'patient user id' -Value $patientUserId
  Ensure-Value -Name 'doctor user id' -Value $doctorUserId

  $notificationGatewayHealth = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/notifications/health" -Headers $adminHeaders
  Add-Result -Name 'notification gateway health' -Status $notificationGatewayHealth.Status

  $authRefresh = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/refresh" -Session $adminSession
  Add-Result -Name 'auth refresh' -Status $authRefresh.Status

  $authUsers = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/auth/users" -Headers $adminHeaders
  Add-Result -Name 'auth users list' -Status $authUsers.Status

  $tempEmail = "tempdoctor$(Get-Random -Minimum 1000 -Maximum 9999)@healthcare.dev"
  $tempRegister = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/register" -Body @{ name = 'Temp Doctor'; email = $tempEmail; password = 'Doctor@1234!'; role = 'doctor' }
  Add-Result -Name 'auth register temp doctor' -Status $tempRegister.Status
  Ensure-Success -Name 'auth register temp doctor' -Response $tempRegister
  $tempUserId = Get-JsonValue $tempRegister.Json @('userId')
  Ensure-Value -Name 'temp user id' -Value $tempUserId

  $doctorPending = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors/pending" -Headers $adminHeaders
  Add-Result -Name 'doctor pending list' -Status $doctorPending.Status

  $authVerify = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/auth/users/$tempUserId/verify" -Headers $adminHeaders -Body @{}
  Add-Result -Name 'auth verify temp doctor' -Status $authVerify.Status

  $authDeactivate = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/auth/users/$tempUserId/deactivate" -Headers $adminHeaders -Body @{}
  Add-Result -Name 'auth deactivate temp doctor' -Status $authDeactivate.Status

  $doctorProfile = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors/profile" -Headers $doctorHeaders
  Add-Result -Name 'doctor profile get' -Status $doctorProfile.Status

  $doctorProfileUpdate = Invoke-JsonRequest -Method 'PUT' -Url "$gateway/api/doctors/profile" -Headers $doctorHeaders -Body @{ specialty = 'Cardiology'; bio = 'Consultant cardiologist for smoke test'; consultationFee = 25; qualifications = @('MBBS', 'MD Cardiology'); phone = '+94771234567' }
  Add-Result -Name 'doctor profile update' -Status $doctorProfileUpdate.Status

  $doctorSchedule = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors/schedule" -Headers $doctorHeaders
  Add-Result -Name 'doctor schedule get' -Status $doctorSchedule.Status

  $doctorPublicList = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors" -Headers $patientHeaders
  Add-Result -Name 'doctor public list' -Status $doctorPublicList.Status

  $doctorInternalByUser = Invoke-JsonRequest -Method 'GET' -Url "$doctorDirect/api/doctors/internal/user/$doctorUserId"
  Add-Result -Name 'doctor internal by user' -Status $doctorInternalByUser.Status
  Ensure-Success -Name 'doctor internal by user' -Response $doctorInternalByUser
  $doctorDocId = Get-JsonValue $doctorInternalByUser.Json @('_id')
  Ensure-Value -Name 'doctor document id' -Value $doctorDocId

  $doctorById = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors/$doctorDocId" -Headers $patientHeaders
  Add-Result -Name 'doctor public by id' -Status $doctorById.Status

  $doctorVerify = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/doctors/$doctorDocId/verify" -Headers $adminHeaders -Body @{ verified = $true }
  Add-Result -Name 'doctor verify endpoint' -Status $doctorVerify.Status

  $slotBaseDate = (Get-Date).ToUniversalTime().AddDays((Get-Random -Minimum 20 -Maximum 60)).Date
  $baseHour = Get-Random -Minimum 8 -Maximum 12

  function Add-Slot {
    param(
      [string]$Label,
      [int]$Hour
    )

    for ($attempt = 0; $attempt -lt 12; $attempt++) {
      $candidateOffset = ($Hour - $baseHour) + $attempt
      $candidateDate = $slotBaseDate.AddDays([Math]::Floor($candidateOffset / 10))
      $candidateHour = 8 + ($candidateOffset % 10)
      if ($candidateHour -lt 8) {
        $candidateHour += 10
      }

      $response = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/doctors/schedule" -Headers $doctorHeaders -Body @{ date = $candidateDate.ToString('yyyy-MM-dd'); startTime = ('{0:00}:00' -f $candidateHour); endTime = ('{0:00}:30' -f $candidateHour) }

      if ($response.Status -eq 409) {
        continue
      }

      Add-Result -Name "doctor add slot $Label" -Status $response.Status
      Ensure-Success -Name "doctor add slot $Label" -Response $response
      $slotId = Get-FirstSlotId -ResponseJson $response.Json -Raw $response.Raw
      Ensure-Value -Name "slot id $Label" -Value $slotId
      return $slotId
    }

    Add-Result -Name "doctor add slot $Label" -Status 409 -Note 'No unique slot found after repeated conflicts'
    throw "doctor add slot $Label failed with repeated 409 conflicts"
  }

  $slotPaymentOriginal = Add-Slot -Label 'payment original' -Hour $baseHour
  $slotPaymentModified = Add-Slot -Label 'payment modified' -Hour ($baseHour + 1)
  $slotReject = Add-Slot -Label 'reject' -Hour ($baseHour + 2)
  $slotInternal = Add-Slot -Label 'internal lifecycle' -Hour ($baseHour + 3)
  $slotStartVisit = Add-Slot -Label 'start visit' -Hour ($baseHour + 4)
  $slotCancel = Add-Slot -Label 'cancel' -Hour ($baseHour + 5)
  $slotDeletable = Add-Slot -Label 'deletable' -Hour ($baseHour + 6)

  $patientProfile = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/profile" -Headers $patientHeaders
  Add-Result -Name 'patient profile get' -Status $patientProfile.Status

  $patientProfileUpdate = Invoke-JsonRequest -Method 'PUT' -Url "$gateway/api/patients/profile" -Headers $patientHeaders -Body @{ name = 'Amal Perera'; gender = 'male'; phone = '+94710000000'; bloodGroup = 'O+'; address = @{ street = '42 Galle Road'; city = 'Colombo'; district = 'Colombo'; country = 'Sri Lanka' }; allergies = @('Penicillin'); chronicConditions = @('Mild Hypertension'); emergencyContact = @{ name = 'Kamala Perera'; phone = '+94719876543'; relationship = 'Mother' } }
  Add-Result -Name 'patient profile update' -Status $patientProfileUpdate.Status

  $patientReports = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/reports" -Headers $patientHeaders
  Add-Result -Name 'patient reports list' -Status $patientReports.Status

  $patientHistory = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/history" -Headers $patientHeaders
  Add-Result -Name 'patient history' -Status $patientHistory.Status

  $patientHostory = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/hostory" -Headers $patientHeaders
  Add-Result -Name 'patient hostory alias' -Status $patientHostory.Status

  $patientList = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients?page=1&limit=20" -Headers $adminHeaders
  Add-Result -Name 'patient admin list' -Status $patientList.Status
  Ensure-Success -Name 'patient admin list' -Response $patientList
  $patientMongoId = Get-JsonValue $patientList.Json @('patients')
  if ($patientMongoId -and $patientMongoId.Count -gt 0) {
    $patientMongoId = $patientMongoId[0]._id
  } else {
    $patientMongoId = $null
  }
  Ensure-Value -Name 'patient mongo id' -Value $patientMongoId

  $patientById = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/$patientMongoId" -Headers $adminHeaders
  Add-Result -Name 'patient admin by id' -Status $patientById.Status

  $patientInternal = Invoke-JsonRequest -Method 'GET' -Url "$patientDirect/api/patients/internal/$patientUserId"
  Add-Result -Name 'patient internal by user' -Status $patientInternal.Status

  $patientInternalReports = Invoke-JsonRequest -Method 'GET' -Url "$patientDirect/api/patients/internal/$patientUserId/reports"
  Add-Result -Name 'patient internal reports' -Status $patientInternalReports.Status

  $tempFile = Join-Path $env:TEMP 'smart-healthcare-api-smoke-report.png'
  [System.IO.File]::WriteAllBytes($tempFile, [System.Convert]::FromBase64String('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a0f8AAAAASUVORK5CYII='))
  $patientUpload = Invoke-MultipartUpload -Url "$gateway/api/patients/reports" -Token $patientToken -FilePath $tempFile -Title 'API Smoke Report' -Description 'Smoke test upload' -ReportType 'other'
  Add-Result -Name 'patient report upload' -Status $patientUpload.Status

  $patientReportsAfter = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/reports" -Headers $patientHeaders
  Add-Result -Name 'patient reports list after upload' -Status $patientReportsAfter.Status

  $doctorPatientReports = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors/patients/$patientUserId/reports" -Headers $doctorHeaders
  Add-Result -Name 'doctor patient reports' -Status $doctorPatientReports.Status

  $appointmentA = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/appointments" -Headers $patientHeaders -Body @{ doctorId = $doctorDocId; slotId = $slotPaymentOriginal; reason = 'Smoke test appointment A' }
  Add-Result -Name 'appointment create A' -Status $appointmentA.Status
  Ensure-Success -Name 'appointment create A' -Response $appointmentA
  $appointmentAId = Get-JsonValue $appointmentA.Json @('id')
  Ensure-Value -Name 'appointment A id' -Value $appointmentAId

  $appointmentPatientList = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/appointments" -Headers $patientHeaders
  Add-Result -Name 'appointment patient list' -Status $appointmentPatientList.Status

  $appointmentAdminRoot = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/appointments?status=PENDING" -Headers $adminHeaders
  Add-Result -Name 'appointment admin list root' -Status $appointmentAdminRoot.Status

  $appointmentAdminAll = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/appointments/admin/all?page=1&limit=20" -Headers $adminHeaders
  Add-Result -Name 'appointment admin all' -Status $appointmentAdminAll.Status

  $appointmentById = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/appointments/$appointmentAId" -Headers $patientHeaders
  Add-Result -Name 'appointment by id' -Status $appointmentById.Status

  $appointmentModify = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentAId/modify" -Headers $patientHeaders -Body @{ doctorId = $doctorDocId; slotId = $slotPaymentModified; reason = 'Smoke test appointment A modified' }
  Add-Result -Name 'appointment modify' -Status $appointmentModify.Status

  $appointmentAcceptA = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentAId/accept" -Headers $doctorHeaders -Body @{}
  Add-Result -Name 'appointment accept A' -Status $appointmentAcceptA.Status

  $paymentIntent = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/payments/intent" -Headers $patientHeaders -Body @{ appointmentId = $appointmentAId }
  Add-Result -Name 'payment intent create' -Status $paymentIntent.Status
  Ensure-Success -Name 'payment intent create' -Response $paymentIntent
  $paymentIntentId = Get-JsonValue $paymentIntent.Json @('paymentIntentId')
  $paymentId = Get-JsonValue $paymentIntent.Json @('paymentId')
  Ensure-Value -Name 'payment intent id' -Value $paymentIntentId
  Ensure-Value -Name 'payment row id' -Value $paymentId

  $paymentBeforeWebhook = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/payments/$appointmentAId" -Headers $patientHeaders
  Add-Result -Name 'payment by appointment before webhook' -Status $paymentBeforeWebhook.Status

  $webhookEventId = "evt_smoke_$(Get-Random -Minimum 100000 -Maximum 999999)"
  $chargeId = "ch_smoke_$(Get-Random -Minimum 100000 -Maximum 999999)"
  $webhookPayload = [ordered]@{
    id = $webhookEventId
    object = 'event'
    type = 'payment_intent.succeeded'
    data = @{
      object = @{
        id = $paymentIntentId
        object = 'payment_intent'
        amount = 2500
        currency = 'usd'
        payment_method_types = @('card')
        latest_charge = $chargeId
        metadata = @{
          appointmentId = $appointmentAId
          patientId = $patientUserId
          paymentId = $paymentId
        }
      }
    }
  }
  $webhookPayloadJson = $webhookPayload | ConvertTo-Json -Depth 20 -Compress
  $env:STRIPE_TEST_PAYLOAD = $webhookPayloadJson
  $env:STRIPE_TEST_SECRET = $webhookSecret
  $env:STRIPE_MODULE_PATH = (Join-Path $RepoRoot 'payment-service/node_modules/stripe')
  $signature = node -e "const Stripe=require(process.env.STRIPE_MODULE_PATH); process.stdout.write(Stripe.webhooks.generateTestHeaderString({payload: process.env.STRIPE_TEST_PAYLOAD, secret: process.env.STRIPE_TEST_SECRET}));"
  Remove-Item Env:STRIPE_TEST_PAYLOAD
  Remove-Item Env:STRIPE_TEST_SECRET
  Remove-Item Env:STRIPE_MODULE_PATH

  $paymentWebhook = Invoke-JsonRequest -Method 'POST' -Url "$paymentDirect/api/payments/webhook" -Headers @{ 'stripe-signature' = $signature } -Body $webhookPayloadJson -ContentType 'application/json'
  Add-Result -Name 'payment webhook' -Status $paymentWebhook.Status

  $paymentAfterWebhook = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/payments/$appointmentAId" -Headers $patientHeaders
  Add-Result -Name 'payment by appointment after webhook' -Status $paymentAfterWebhook.Status

  $paymentAdminAll = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/payments/admin/all" -Headers $adminHeaders
  Add-Result -Name 'payment admin all' -Status $paymentAdminAll.Status

  $teleToken = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/telemedicine/token" -Headers $patientHeaders -Body @{ appointmentId = $appointmentAId }
  Add-Result -Name 'telemedicine token' -Status $teleToken.Status

  $teleStart = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/telemedicine/start" -Headers $doctorHeaders -Body @{ appointmentId = $appointmentAId }
  Add-Result -Name 'telemedicine start' -Status $teleStart.Status

  $teleInfo = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/telemedicine/$appointmentAId" -Headers $patientHeaders
  Add-Result -Name 'telemedicine info' -Status $teleInfo.Status

  $teleEnd = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/telemedicine/end" -Headers $doctorHeaders -Body @{ appointmentId = $appointmentAId }
  Add-Result -Name 'telemedicine end' -Status $teleEnd.Status

  $appointmentD = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/appointments" -Headers $patientHeaders -Body @{ doctorId = $doctorDocId; slotId = $slotInternal; reason = 'Smoke test appointment D' }
  Add-Result -Name 'appointment create D' -Status $appointmentD.Status
  Ensure-Success -Name 'appointment create D' -Response $appointmentD
  $appointmentDId = Get-JsonValue $appointmentD.Json @('id')
  Ensure-Value -Name 'appointment D id' -Value $appointmentDId

  $appointmentAcceptD = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentDId/accept" -Headers $doctorHeaders -Body @{}
  Add-Result -Name 'appointment accept D' -Status $appointmentAcceptD.Status

  $appointmentPayInternal = Invoke-JsonRequest -Method 'PATCH' -Url "$appointmentDirect/api/appointments/$appointmentDId/pay" -Headers @{ 'x-internal-api-key' = $internalApiKey } -Body @{}
  Add-Result -Name 'appointment internal pay' -Status $appointmentPayInternal.Status

  $appointmentStartInternal = Invoke-JsonRequest -Method 'PATCH' -Url "$appointmentDirect/api/appointments/$appointmentDId/start" -Headers @{ 'x-internal-api-key' = $internalApiKey } -Body @{}
  Add-Result -Name 'appointment internal start' -Status $appointmentStartInternal.Status

  $appointmentCompleteD = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentDId/complete" -Headers $doctorHeaders -Body @{}
  Add-Result -Name 'appointment complete' -Status $appointmentCompleteD.Status

  $appointmentE = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/appointments" -Headers $patientHeaders -Body @{ doctorId = $doctorDocId; slotId = $slotStartVisit; reason = 'Smoke test appointment E' }
  Add-Result -Name 'appointment create E' -Status $appointmentE.Status
  Ensure-Success -Name 'appointment create E' -Response $appointmentE
  $appointmentEId = Get-JsonValue $appointmentE.Json @('id')
  Ensure-Value -Name 'appointment E id' -Value $appointmentEId

  $appointmentAcceptE = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentEId/accept" -Headers $doctorHeaders -Body @{}
  Add-Result -Name 'appointment accept E' -Status $appointmentAcceptE.Status

  $appointmentPayInternalE = Invoke-JsonRequest -Method 'PATCH' -Url "$appointmentDirect/api/appointments/$appointmentEId/pay" -Headers @{ 'x-internal-api-key' = $internalApiKey } -Body @{}
  Add-Result -Name 'appointment internal pay E' -Status $appointmentPayInternalE.Status

  $appointmentStartVisit = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentEId/start-visit" -Headers $doctorHeaders -Body @{}
  Add-Result -Name 'appointment start visit' -Status $appointmentStartVisit.Status

  $appointmentB = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/appointments" -Headers $patientHeaders -Body @{ doctorId = $doctorDocId; slotId = $slotPaymentOriginal; reason = 'Smoke test appointment B' }
  Add-Result -Name 'appointment create B' -Status $appointmentB.Status
  Ensure-Success -Name 'appointment create B' -Response $appointmentB
  $appointmentBId = Get-JsonValue $appointmentB.Json @('id')
  Ensure-Value -Name 'appointment B id' -Value $appointmentBId

  $appointmentC = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/appointments" -Headers $patientHeaders -Body @{ doctorId = $doctorDocId; slotId = $slotReject; reason = 'Smoke test appointment C' }
  Add-Result -Name 'appointment create C' -Status $appointmentC.Status
  Ensure-Success -Name 'appointment create C' -Response $appointmentC
  $appointmentCId = Get-JsonValue $appointmentC.Json @('id')
  Ensure-Value -Name 'appointment C id' -Value $appointmentCId

  $appointmentDoctorList = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/appointments" -Headers $doctorHeaders
  Add-Result -Name 'appointment doctor list' -Status $appointmentDoctorList.Status

  $slotBookingsInternal = Invoke-JsonRequest -Method 'POST' -Url "$appointmentDirect/api/appointments/internal/slot-bookings" -Body @{ doctorId = $doctorUserId; slotIds = @($slotPaymentModified, $slotInternal, $slotStartVisit, $slotReject, $slotPaymentOriginal) }
  Add-Result -Name 'appointment internal slot bookings' -Status $slotBookingsInternal.Status

  $appointmentCancelB = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentBId/cancel" -Headers $patientHeaders -Body @{}
  Add-Result -Name 'appointment cancel' -Status $appointmentCancelB.Status

  $appointmentRejectC = Invoke-JsonRequest -Method 'PATCH' -Url "$gateway/api/appointments/$appointmentCId/reject" -Headers $doctorHeaders -Body @{ reason = 'Schedule conflict' }
  Add-Result -Name 'appointment reject' -Status $appointmentRejectC.Status

  $doctorCreatePrescription = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/doctors/prescriptions" -Headers $doctorHeaders -Body @{ patientId = $patientUserId; appointmentId = $appointmentDId; medications = @(@{ name = 'Paracetamol'; dosage = '500mg'; frequency = 'Twice daily' }); notes = 'Smoke test prescription' }
  Add-Result -Name 'doctor create prescription' -Status $doctorCreatePrescription.Status

  $appointmentPrescriptionIssued = Invoke-JsonRequest -Method 'POST' -Url "$appointmentDirect/api/appointments/$appointmentDId/prescription-issued" -Headers @{ 'x-internal-api-key' = $internalApiKey } -Body @{}
  Add-Result -Name 'appointment internal prescription issued' -Status $appointmentPrescriptionIssued.Status

  $doctorPrescriptions = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/doctors/prescriptions" -Headers $doctorHeaders
  Add-Result -Name 'doctor prescriptions list' -Status $doctorPrescriptions.Status

  $doctorPatientPrescriptions = Invoke-JsonRequest -Method 'GET' -Url "$doctorDirect/api/doctors/internal/patients/$patientUserId/prescriptions"
  Add-Result -Name 'doctor internal patient prescriptions' -Status $doctorPatientPrescriptions.Status

  $patientPrescriptions = Invoke-JsonRequest -Method 'GET' -Url "$gateway/api/patients/prescriptions" -Headers $patientHeaders
  Add-Result -Name 'patient prescriptions list' -Status $patientPrescriptions.Status

  $doctorDeleteSlot = Invoke-JsonRequest -Method 'DELETE' -Url "$gateway/api/doctors/schedule/$slotDeletable" -Headers $doctorHeaders
  Add-Result -Name 'doctor delete free slot' -Status $doctorDeleteSlot.Status

  $aiCheck = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/ai/check" -Headers $patientHeaders -Body @{ symptoms = @('cough', 'fever') }
  Add-Result -Name 'ai symptom check' -Status $aiCheck.Status

  $authLogoutAdmin = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/logout" -Headers $adminHeaders -Body @{} -Session $adminSession
  Add-Result -Name 'auth logout admin' -Status $authLogoutAdmin.Status

  $authLogoutPatient = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/logout" -Headers $patientHeaders -Body @{} -Session $patientSession
  Add-Result -Name 'auth logout patient' -Status $authLogoutPatient.Status

  $authLogoutDoctor = Invoke-JsonRequest -Method 'POST' -Url "$gateway/api/auth/logout" -Headers $doctorHeaders -Body @{} -Session $doctorSession
  Add-Result -Name 'auth logout doctor' -Status $authLogoutDoctor.Status

  $failed = $results | Where-Object { -not (Test-SuccessStatus -Status $_.Status) }
  $results | Format-Table -AutoSize | Out-String -Width 240 | Write-Host

  if (@($failed).Count -gt 0) {
    Write-Host 'FAILED_ENDPOINTS'
    $failed | Format-Table -AutoSize | Out-String -Width 240 | Write-Host
    exit 1
  }

  Write-Host 'ALL_API_CHECKS_PASSED'
} catch {
  $results | Format-Table -AutoSize | Out-String -Width 240 | Write-Host
  Write-Host "SMOKE_SCRIPT_ABORTED: $($_.Exception.Message)"
  exit 1
} finally {
  if ($tempFile -and (Test-Path $tempFile)) {
    Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
  }
  Pop-Location
}