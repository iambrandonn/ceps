/**
 * Integration test fixture: Complete HTTP client module
 * Tests all I1 patterns in a realistic scenario.
 */

import axios from 'axios';

// Pattern 1: Axios Client Instance
export const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Pattern 2: Fetch API Wrapper
export async function fetchUsers() {
  const response = await fetch('https://api.example.com/users');

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Pattern 3: Request/Response Transform
export async function getUserData(userId: string) {
  const response = await apiClient.get(`/users/${userId}`);
  return response.json(); // Transform response to JSON
}

// Pattern 4: Error Handling with Try-Catch
export async function safeFetch(url: string) {
  try {
    const response = await fetch(url);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch failed:', error);
    throw error;
  }
}

// Pattern 5: POST with JSON serialization
export async function createUser(userData: any) {
  return fetch('https://api.example.com/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });
}
