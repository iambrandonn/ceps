/**
 * Phase -1 fixture for I2: Retry & backoff patterns
 * Used to understand parser output for retry logic
 */

import axios from 'axios';

// Pattern 1: Basic retry loop
export async function fetchWithRetry(url: string, maxRetries = 3) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return response.json();
      }
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

// Pattern 2: Exponential backoff
export async function fetchWithBackoff(url: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url);
      return response.json();
    } catch (error) {
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Pattern 3: Axios retry with axios-retry library
export async function axiosWithRetry() {
  const client = axios.create();

  // Note: In real code, would use axiosRetry(client, { retries: 3 })
  // This is just to see what parser extracts

  return client.get('/api/data');
}

// Pattern 4: Manual retry with configurable delay
export async function retryWithDelay(
  fn: () => Promise<any>,
  retries = 3,
  delay = 1000
) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Pattern 5: Retry with status code checking
export async function retryOn5xx(url: string, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = await fetch(url);

    if (response.status >= 500 && response.status < 600) {
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
    }

    return response.json();
  }
}
