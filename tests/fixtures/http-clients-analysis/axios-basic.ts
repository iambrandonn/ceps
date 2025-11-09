/**
 * Phase -1 Analysis: Basic Axios patterns for parser instrumentation
 *
 * This file contains various Axios usage patterns to understand
 * what entities and facts the parser emits.
 */

import axios from 'axios';

// Pattern 1: Direct axios.create() call
export const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  }
});

// Pattern 2: Multiple Axios instances
export const authClient = axios.create({
  baseURL: 'https://auth.example.com',
  timeout: 3000
});

// Pattern 3: Direct axios calls
export async function fetchUsers() {
  const response = await axios.get('https://api.example.com/users');
  return response.data;
}

// Pattern 4: Instance method calls
export async function getUserById(id: string) {
  const response = await apiClient.get(`/users/${id}`);
  return response.data;
}

// Pattern 5: POST with data
export async function createUser(userData: any) {
  const response = await apiClient.post('/users', userData);
  return response.data;
}

// Pattern 6: Error handling
export async function fetchWithErrorHandling() {
  try {
    const response = await apiClient.get('/data');
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error('Axios error:', error.message);
      throw error;
    }
    throw error;
  }
}

// Pattern 7: Request config override
export async function fetchWithTimeout(url: string) {
  const response = await apiClient.get(url, {
    timeout: 10000
  });
  return response.data;
}
