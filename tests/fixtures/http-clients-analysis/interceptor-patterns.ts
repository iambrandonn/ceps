/**
 * Phase -1 fixture for I2: Axios Interceptors
 * Used to understand parser output for interceptor patterns
 */

import axios from 'axios';

// Pattern 1: Request interceptor for auth token injection
const apiClient = axios.create({ baseURL: 'https://api.example.com' });

apiClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Pattern 2: Response interceptor for error transformation
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirect to login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Pattern 3: Logging interceptor
export function setupLoggingInterceptor(client: typeof axios) {
  client.interceptors.request.use(config => {
    console.log(`[HTTP] ${config.method} ${config.url}`);
    return config;
  });

  client.interceptors.response.use(response => {
    console.log(`[HTTP] ${response.status} ${response.config.url}`);
    return response;
  });
}

// Pattern 4: Retry interceptor (via library)
export function setupRetryInterceptor(client: typeof axios) {
  client.interceptors.response.use(
    response => response,
    async error => {
      const config = error.config;

      if (!config || config.__retryCount >= 3) {
        return Promise.reject(error);
      }

      config.__retryCount = config.__retryCount || 0;
      config.__retryCount += 1;

      await new Promise(resolve => setTimeout(resolve, 1000));
      return client.request(config);
    }
  );
}

// Pattern 5: Multiple interceptors on same instance
export const authClient = axios.create();

// Auth token
authClient.interceptors.request.use(config => {
  config.headers.Authorization = `Bearer ${process.env.API_TOKEN}`;
  return config;
});

// Correlation ID
authClient.interceptors.request.use(config => {
  config.headers['X-Correlation-ID'] = crypto.randomUUID();
  return config;
});

// Response timing
authClient.interceptors.response.use(response => {
  const duration = Date.now() - response.config.metadata?.startTime;
  console.log(`Request took ${duration}ms`);
  return response;
});
