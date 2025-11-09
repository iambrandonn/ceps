/**
 * Phase -1 Analysis: Fetch API patterns for parser instrumentation
 */

// Pattern 1: Basic fetch call
export async function fetchData() {
  const response = await fetch('https://api.example.com/data');
  return response.json();
}

// Pattern 2: Fetch with options
export async function postData(data: any) {
  const response = await fetch('https://api.example.com/data', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });
  return response.json();
}

// Pattern 3: Fetch wrapper
export async function apiGet(url: string) {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer token123'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Pattern 4: Error handling wrapper
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
