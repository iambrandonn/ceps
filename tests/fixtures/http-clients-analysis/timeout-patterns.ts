/**
 * Phase -1 fixture for I2: Timeout patterns
 * Used to understand parser output for timeout handling
 */

import axios from 'axios';

// Pattern 1: Axios with timeout config
export const apiClientWithTimeout = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
});

// Pattern 2: Fetch with AbortController
export async function fetchWithTimeout(url: string, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// Pattern 3: Promise.race with timeout
export async function fetchWithRaceTimeout(url: string, timeoutMs = 5000) {
  const fetchPromise = fetch(url).then(r => r.json());
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), timeoutMs)
  );

  return Promise.race([fetchPromise, timeoutPromise]);
}

// Pattern 4: Axios request with inline timeout
export async function axiosRequestWithTimeout(url: string) {
  return axios.get(url, { timeout: 3000 });
}

// Pattern 5: Custom timeout wrapper
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
  );

  return Promise.race([promise, timeout]);
}
