# tests/fixtures/http-clients-integration

**Directory Overview:** This directory contains 5 entities.

## api-client.ts

<a id="MRXkqCpHPj"></a>

### fetchUsers

**Signature:** `(): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `fetchUsers`. Calls `fetch()` with URL `https://api.example.com/users`.

**Side effects:**
- network

**Errors thrown:**
- new Error(`HTTP error! status: ${response.status}`);

<a id="1BmUECcI15"></a>

### getUserData

**Signature:** `(userId: string): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Parses JSON response data in `getUserData` using `response.json()`.

<a id="GuRlUTIbMaJEj1QZ"></a>

### safeFetch

**Signature:** `(url: string): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `safeFetch`. Calls `fetch()` with URL `Fetch failed:`.

**Side effects:**
- network

**Errors thrown:**
- new Error(`HTTP ${response.status}: ${response.statusText}`);
- error;

<a id="MEPKxFdaIr"></a>

### createUser

**Signature:** `(userData: any): Promise<Response>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `createUser`. Calls `fetch()` with URL `https://api.example.com/users`.

**Side effects:**
- network

<a id="FkQ0ZnwIod"></a>

### apiClient

**Visibility:** Public (exported)

**Behavior:**

- Creates Axios client `apiClient`. with base URL `https://api.example.com`. Configures 5000ms timeout for requests. Includes default headers in all requests.

