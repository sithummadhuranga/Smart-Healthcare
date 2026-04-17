const axios = require('axios');
const FormData = require('form-data');

const DEFAULT_BASE_URL =
  process.env.SMOKE_BASE_URL ||
  process.env.VITE_API_URL ||
  'http://127.0.0.1:3000';

const DEFAULT_CREDENTIALS = {
  admin: {
    email: process.env.SMOKE_ADMIN_EMAIL || 'admin@healthcare.dev',
    password: process.env.SMOKE_ADMIN_PASSWORD || 'Admin@1234!',
  },
  patient: {
    email: process.env.SMOKE_PATIENT_EMAIL || 'patient@healthcare.dev',
    password: process.env.SMOKE_PATIENT_PASSWORD || 'Patient@1234!',
  },
  doctor: {
    email: process.env.SMOKE_DOCTOR_EMAIL || 'doctor@healthcare.dev',
    password: process.env.SMOKE_DOCTOR_PASSWORD || 'Doctor@1234!',
  },
};

class ApiSession {
  constructor({ baseURL = DEFAULT_BASE_URL, email, password, label }) {
    this.baseURL = baseURL;
    this.email = email;
    this.password = password;
    this.label = label;
    this.token = null;
    this.cookieHeader = '';
    this.client = axios.create({
      baseURL,
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    });
  }

  captureCookies(response) {
    const setCookie = response.headers['set-cookie'];
    if (Array.isArray(setCookie) && setCookie.length > 0) {
      this.cookieHeader = setCookie.map((value) => value.split(';')[0]).join('; ');
    }
  }

  async request(method, url, options = {}) {
    const headers = { ...(options.headers || {}) };

    if (options.auth !== false && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    if (this.cookieHeader) {
      headers.Cookie = this.cookieHeader;
    }

    const response = await requestWithRateLimitRetry(this.client, {
      method,
      url,
      data: options.data,
      params: options.params,
      headers,
    });

    this.captureCookies(response);
    return response;
  }

  async login() {
    const response = await this.request('post', '/api/auth/login', {
      auth: false,
      data: {
        email: this.email,
        password: this.password,
      },
    });

    if (response.status >= 200 && response.status < 300 && typeof response.data?.accessToken === 'string') {
      this.token = response.data.accessToken;
    }

    return response;
  }

  async refresh() {
    const response = await this.request('post', '/api/auth/refresh', {
      auth: false,
    });

    if (response.status >= 200 && response.status < 300 && typeof response.data?.accessToken === 'string') {
      this.token = response.data.accessToken;
    }

    return response;
  }

  async logout() {
    const response = await this.request('post', '/api/auth/logout');
    this.token = null;
    this.cookieHeader = '';
    return response;
  }

  get(url, options) {
    return this.request('get', url, options);
  }

  post(url, data, options = {}) {
    return this.request('post', url, { ...options, data });
  }

  put(url, data, options = {}) {
    return this.request('put', url, { ...options, data });
  }

  patch(url, data, options = {}) {
    return this.request('patch', url, { ...options, data });
  }

  delete(url, options) {
    return this.request('delete', url, options);
  }

  async postMultipart(url, fields, file) {
    const form = new FormData();

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined && value !== null) {
        form.append(key, value);
      }
    }

    form.append(file.fieldName, file.buffer, {
      filename: file.filename,
      contentType: file.contentType,
    });

    return this.request('post', url, {
      data: form,
      headers: form.getHeaders(),
    });
  }
}

async function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function retryDelayFromHeaders(headers, attempt) {
  const retryAfter = headers?.['retry-after'];
  if (typeof retryAfter === 'string' && retryAfter.trim()) {
    const numeric = Number(retryAfter);
    if (Number.isFinite(numeric)) {
      return Math.min(15000, Math.max(500, numeric * 1000));
    }

    const asDate = Date.parse(retryAfter);
    if (!Number.isNaN(asDate)) {
      return Math.min(15000, Math.max(500, asDate - Date.now()));
    }
  }

  return Math.min(15000, 1500 * (attempt + 1));
}

async function requestWithRateLimitRetry(client, requestConfig, attempt = 0) {
  const response = await client.request(requestConfig);
  const maxAttempts = 5;

  if (response.status !== 429 || attempt >= maxAttempts) {
    return response;
  }

  await delay(retryDelayFromHeaders(response.headers, attempt));
  return requestWithRateLimitRetry(client, requestConfig, attempt + 1);
}

function expect2xx(response) {
  expect(response.status).toBeGreaterThanOrEqual(200);
  expect(response.status).toBeLessThan(300);
  return response;
}

function uniqueEmail(prefix = 'smoke') {
  return `${prefix}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@healthcare.dev`;
}

function createFutureSlot(dayOffset, startHour, startMinute) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + dayOffset);
  date.setUTCHours(0, 0, 0, 0);

  const endHour = startMinute >= 30 ? startHour + 1 : startHour;
  const endMinute = (startMinute + 30) % 60;

  const slotDate = date.toISOString().slice(0, 10);
  const startTime = `${String(startHour).padStart(2, '0')}:${String(startMinute).padStart(2, '0')}`;
  const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`;

  return {
    date: slotDate,
    startTime,
    endTime,
  };
}

function tinyPngBuffer() {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+y3fUAAAAASUVORK5CYII=',
    'base64'
  );
}

module.exports = {
  ApiSession,
  DEFAULT_BASE_URL,
  DEFAULT_CREDENTIALS,
  createFutureSlot,
  expect2xx,
  tinyPngBuffer,
  uniqueEmail,
};
