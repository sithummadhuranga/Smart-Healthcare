SE3020 — Distributed Systems | GroupID-DS-Assignment
AI-Enabled Smart Healthcare Appointment & Telemedicine Platform
=============================================================
Member 1 (Infrastructure Lead) | Deployment Guide
=============================================================

TABLE OF CONTENTS
-----------------
1. Prerequisites
2. PATH 1 — Docker Compose (Local Development)
3. PATH 2 — Kubernetes with Minikube
4. Access URLs
5. Troubleshooting Common Issues
6. Third-Party Account Setup Guide


=============================================================
1. PREREQUISITES
=============================================================

Software required on every developer machine:

  a) Docker Desktop (v4.x or later)
       Windows/Mac: https://www.docker.com/products/docker-desktop
       Verify: docker --version && docker-compose --version

  b) Git
       https://git-scm.com/downloads
       Verify: git --version

  c) Node.js 20 LTS (for running services locally without Docker)
       https://nodejs.org/en/download
       Verify: node --version   # should print v20.x.x

  d) Python 3.11 (for AI service local dev without Docker)
       https://www.python.org/downloads/
       Verify: python --version # should print 3.11.x

Third-party accounts you MUST create before running the platform:
  - Agora Console     : https://console.agora.io/
  - Stripe            : https://stripe.com/ (use test/sandbox mode only)
  - SendGrid          : https://app.sendgrid.com/
  - Twilio            : https://console.twilio.com/
  - Cloudinary        : https://cloudinary.com/
  - Google AI Studio  : https://aistudio.google.com/ (for Gemini API key)

Instructions for extracting each API key are in Section 6 below.


=============================================================
2. PATH 1 — DOCKER COMPOSE (LOCAL DEVELOPMENT)
=============================================================

STEP 1 — Clone the repository
  git clone https://github.com/[YOUR-REPO-URL].git
  cd GroupID-DS-Assignment

STEP 2 — Set up environment variables
  Copy the example file:
    Windows (Command Prompt): copy .env.example .env
    Windows (PowerShell):     Copy-Item .env.example .env
    Mac/Linux:                cp .env.example .env

  Open .env in any text editor and fill in ALL blank values.
  Required fields before first run:
    JWT_SECRET          — any long random string (min 32 chars)
    JWT_REFRESH_SECRET  — different long random string (min 32 chars)
    POSTGRES_USER       — postgres  (keep default)
    POSTGRES_PASSWORD   — postgres  (keep default or choose your own)

  Optional for stub/Day-1 testing (can fill in later):
    AGORA_APP_ID, AGORA_APP_CERTIFICATE
    STRIPE_SECRET_KEY, STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
    TWILIO_*, SENDGRID_API_KEY
    CLOUDINARY_*, GEMINI_API_KEY

  Generate a secure JWT_SECRET:
    node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

STEP 3 — Build and start all containers
  docker-compose up --build

  First build takes 5-10 minutes (downloading base images + npm install).
  Subsequent starts: docker-compose up (no --build needed unless code changed)

  To run in background (detached mode):
    docker-compose up --build -d

STEP 4 — Verify all containers are healthy
  Open a new terminal and run:
    docker-compose ps

  All containers should show status "healthy" or "running".
  Expected containers:
    mongodb            — healthy
    postgres           — healthy
    rabbitmq           — healthy
    api-gateway        — healthy
    auth-service       — healthy
    patient-service    — healthy
    doctor-service     — healthy
    appointment-service — healthy
    telemedicine-service — healthy
    payment-service    — healthy
    notification-service — healthy
    ai-symptom-service — healthy
    frontend           — healthy

  If any container shows "unhealthy" or "exited":
    docker-compose logs <container-name>
    See Section 5 for troubleshooting.

STEP 5 — Access the application
  Frontend (Vite build served by Nginx) : http://localhost
  API Gateway            : http://localhost:3000
  RabbitMQ Management UI : http://localhost:15672  (user: guest / pass: guest)
  Auth Service (direct)  : http://localhost:3001
  Patient Service        : http://localhost:3002
  Doctor Service         : http://localhost:3003
  Appointment Service    : http://localhost:3004
  Telemedicine Service   : http://localhost:3005
  Payment Service        : http://localhost:3006
  Notification Service   : http://localhost:3007
  AI Symptom Checker     : http://localhost:8000
  AI Service API Docs    : http://localhost:8000/docs

STEP 6 — Stop the application
  docker-compose down           # stops containers, keeps volumes (data preserved)
  docker-compose down -v        # stops containers AND deletes all data volumes
  docker-compose down --rmi all # also removes built images (clean slate)


=============================================================
3. PATH 2 — KUBERNETES WITH MINIKUBE
=============================================================

STEP 1 — Install Minikube and kubectl
  Minikube: https://minikube.sigs.k8s.io/docs/start/
  kubectl:  https://kubernetes.io/docs/tasks/tools/

  Verify:
    minikube version
    kubectl version --client

STEP 2 — Start Minikube
  minikube start --memory=4096 --cpus=2

  Wait for Minikube to fully start (1-3 minutes).
  Verify: minikube status  — should show: host: Running, kubelet: Running

STEP 3 — Point Docker CLI to Minikube's Docker daemon
  Run this command in EVERY terminal session you use for building:
    eval $(minikube docker-env)

  This makes Docker commands build images inside Minikube's daemon
  instead of your local daemon. Required because k8s manifests use
  imagePullPolicy: Never (local images only — no Docker Hub needed).

STEP 4 — Build all service images inside Minikube
  docker-compose build

  This builds all 10 images into Minikube's Docker registry.
  Verify images exist: docker images | grep -E "api-gateway|auth-service|..."

STEP 5 — Create the app-secrets Secret
  Never commit real secrets to Git. Create them via kubectl:

  kubectl create secret generic app-secrets \
    --from-literal=JWT_SECRET="your-jwt-secret-here" \
    --from-literal=JWT_REFRESH_SECRET="your-refresh-secret-here" \
    --from-literal=STRIPE_SECRET_KEY="sk_test_..." \
    --from-literal=STRIPE_WEBHOOK_SECRET="whsec_..." \
    --from-literal=AGORA_APP_CERTIFICATE="your-agora-certificate" \
    --from-literal=GEMINI_API_KEY="your-gemini-key" \
    --from-literal=TWILIO_ACCOUNT_SID="ACxxxxx" \
    --from-literal=TWILIO_AUTH_TOKEN="your-twilio-token" \
    --from-literal=SENDGRID_API_KEY="SG.xxxxx" \
    --from-literal=CLOUDINARY_API_SECRET="your-cloudinary-secret" \
    --from-literal=POSTGRES_PASSWORD="postgres"

  Verify: kubectl get secrets

STEP 6 — Deploy all Kubernetes manifests
  kubectl apply -f k8s/

  This creates: Deployments, Services, ConfigMap, Ingress for all services,
                plus StatefulSets for MongoDB, PostgreSQL, RabbitMQ.

STEP 7 — Verify all pods are Running
  kubectl get pods

  All pods should reach "Running" status within 2-3 minutes.
  If pods are still "Pending" or "ContainerCreating" after 5 minutes:
    kubectl describe pod <pod-name>
    kubectl logs deployment/<service-name>

STEP 8 — Expose the Ingress
  minikube tunnel

  Keep this terminal open. It exposes the Ingress on 127.0.0.1.

STEP 9 — Add healthcare.local to hosts file

  Windows (run as Administrator):
    echo 127.0.0.1 healthcare.local >> C:\Windows\System32\drivers\etc\hosts

  Mac/Linux:
    echo "127.0.0.1 healthcare.local" | sudo tee -a /etc/hosts

STEP 10 — Access the application via Ingress
  Frontend + API : http://healthcare.local


=============================================================
4. ACCESS URLS SUMMARY
=============================================================

  Docker Compose                  Kubernetes (Minikube)
  -------------------------       -------------------------
  http://localhost                http://healthcare.local
  http://localhost:3000           http://healthcare.local/api/*
  http://localhost:15672          minikube service rabbitmq --url
  http://localhost:8000/docs      (same as above via Ingress)


=============================================================
5. TROUBLESHOOTING COMMON ISSUES
=============================================================

ISSUE: Container shows "unhealthy" after docker-compose up
  CAUSE: Service failed its health check (usually DB not ready or bad config).
  FIX:
    1. docker-compose logs <container-name>
    2. Check .env has the correct DB URLs and credentials.
    3. Ensure POSTGRES_USER/POSTGRES_PASSWORD match the APPOINTMENT_DB_URL and PAYMENT_DB_URL.
    4. Try: docker-compose down -v && docker-compose up --build

ISSUE: auth-service or patient-service unhealthy — MongoDB connection error
  CAUSE: auth-service/patient-service started before MongoDB was fully ready.
  FIX:
    docker-compose restart auth-service patient-service
    (services retry on startup — subsequent attempts usually succeed)

ISSUE: RabbitMQ connection refused on startup
  CAUSE: notification-service or appointment-service started before RabbitMQ finished initializing.
  FIX:
    docker-compose restart notification-service appointment-service
    The services have built-in retry logic (retries 5 times with 5s delay).

ISSUE: Pod in CrashLoopBackOff (Kubernetes)
  STEPS:
    kubectl logs <pod-name> --previous    # view logs from crashed container
    kubectl describe pod <pod-name>       # see events leading to crash
  COMMON CAUSES:
    a) Missing secret key — check kubectl get secrets and compare to k8s/configmap.yaml
    b) Wrong image name — ensure eval $(minikube docker-env) was run before docker-compose build
    c) Service URL wrong — all inter-service URLs must use K8s service names (not localhost)

ISSUE: Service unreachable in Kubernetes
  FIX:
    kubectl get services                  # confirm service exists
    kubectl exec -it <any-pod> -- wget -qO- http://<service-name>:<port>/health
    # If that works, the issue is with Ingress routing, not the service itself.

ISSUE: Frontend shows blank page
  CAUSE: VITE_API_URL is wrong at build time, or API Gateway is not reachable.
  FIX:
    1. Check http://localhost:3000/health returns {"status":"ok","service":"api-gateway"}
    2. Check browser console for CORS errors.
    3. Ensure CORS_ORIGIN in .env includes the frontend origin.
    4. If VITE_API_URL changed, rebuild the frontend image: docker-compose up --build frontend

ISSUE: Stripe webhook not received locally
  FIX:
    Install Stripe CLI: https://stripe.com/docs/stripe-cli
    stripe login
    stripe listen --forward-to localhost:3006/api/payments/webhook
    Copy the whsec_ secret it prints into STRIPE_WEBHOOK_SECRET in .env
    Restart payment-service.


=============================================================
6. THIRD-PARTY ACCOUNT SETUP GUIDE
=============================================================

AGORA (Video Consultations — 10,000 min/month free)
  1. https://console.agora.io/ → Register
  2. Create a new project → set Authentication as "App ID + App Certificate"
  3. Copy: App ID → paste as AGORA_APP_ID in .env
  4. Under "App Certificate", click "Enabled" → copy → paste as AGORA_APP_CERTIFICATE

STRIPE (Payment Processing — free sandbox)
  1. https://stripe.com/ → Register → stay in "Test mode" (toggle top-right)
  2. Developers → API Keys
  3. Copy Publishable key (pk_test_...) → STRIPE_PUBLISHABLE_KEY
  4. Copy Secret key (sk_test_...)  → STRIPE_SECRET_KEY
  5. For webhook secret: stripe listen --forward-to localhost:3006/api/payments/webhook
     Copy the whsec_... printed → STRIPE_WEBHOOK_SECRET
  6. Test card: 4242 4242 4242 4242 | any future date | any 3-digit CVV

SENDGRID (Email — 100 emails/day free)
  1. https://app.sendgrid.com/ → Register
  2. Settings → API Keys → Create API Key → Full Access
  3. Copy key (SG.xxx...) → SENDGRID_API_KEY
  4. Settings → Sender Authentication → verify FROM_EMAIL address

TWILIO (SMS — trial credits free with GitHub Education)
  1. https://console.twilio.com/ → Register
  2. Copy Account SID → TWILIO_ACCOUNT_SID
  3. Copy Auth Token → TWILIO_AUTH_TOKEN
  4. Get a trial phone number → TWILIO_PHONE_NUMBER (format: +1xxxxxxxxxx)
  5. Trial accounts can only SMS verified numbers — verify your test phone.

CLOUDINARY (File Storage — 25 GB free)
  1. https://cloudinary.com/ → Register
  2. Dashboard shows: Cloud Name, API Key, API Secret
  3. Copy all three → CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET

GOOGLE GEMINI API (AI — 1 million tokens/month free)
  1. https://aistudio.google.com/ → Sign in with Google
  2. Click "Get API key" → "Create API key in new project"
  3. Copy key → GEMINI_API_KEY
  4. Test: curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
       -H "Content-Type: application/json" \
       -d '{"contents":[{"parts":[{"text":"Say hello in JSON"}]}]}'
     If you get JSON back, the key works.
