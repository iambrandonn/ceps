# tests/fixtures/http-clients-analysis

**Directory Overview:** This directory contains 24 entities.

## axios-basic.ts

<a id="46xzEhj0ht"></a>

### fetchUsers

**Signature:** `(): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function fetchUsers (intent unclear from static analysis)

**Side effects:**
- network

<a id="KqNyMYxl1v"></a>

### getUserById

**Signature:** `(id: string): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function getUserById: Retrieves data or value

<a id="iM1UqSnb71"></a>

### createUser

**Signature:** `(userData: any): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function createUser: Creates or constructs a new instance

<a id="I5S9vKfv9k"></a>

### fetchWithErrorHandling

**Signature:** `(): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function fetchWithErrorHandling (intent unclear from static analysis)

**Side effects:**
- network

**Errors thrown:**
- error;
- error;

<a id="DHEPUfuHJd"></a>

### fetchWithTimeout

**Signature:** `(url: string): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function fetchWithTimeout (intent unclear from static analysis)

<a id="OLQWfbch9f"></a>

### apiClient

**Visibility:** Public (exported)

**Behavior:**

- Creates Axios client `apiClient`. with base URL `https://api.example.com`. Configures 5000ms timeout for requests. Includes default headers in all requests.

<a id="x0LI0hctZY"></a>

### authClient

**Visibility:** Public (exported)

**Behavior:**

- Creates Axios client `authClient`. with base URL `https://auth.example.com`. Configures 3000ms timeout for requests.

## fetch-patterns.ts

<a id="b0Qxhl3CcA"></a>

### fetchData

**Signature:** `(): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `fetchData`. Calls `fetch()` with URL `https://api.example.com/data`.

**Side effects:**
- network

<a id="SzhtnYuyXk"></a>

### postData

**Signature:** `(data: any): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `postData`. Calls `fetch()` with URL `https://api.example.com/data`.

**Side effects:**
- network

<a id="c0gKK53Mxs"></a>

### apiGet

**Signature:** `(url: string): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `apiGet`. Calls `fetch()` with dynamic URL.

**Side effects:**
- network

**Errors thrown:**
- new Error(`HTTP error! status: ${response.status}`);

<a id="IbMaJEj1QZ"></a>

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

## interceptor-patterns.ts

<a id="GUjhRORPif"></a>

### setupLoggingInterceptor

**Signature:** `(client: typeof axios): void`

**Visibility:** Public (exported)

**Behavior:**

- Function setupLoggingInterceptor: Updates or modifies data

<a id="KzB7GmPVuh"></a>

### setupRetryInterceptor

**Signature:** `(client: typeof axios): void`

**Visibility:** Public (exported)

**Behavior:**

- Function setupRetryInterceptor: Updates or modifies data

<a id="yEoatfTuk7"></a>

### authClient

**Visibility:** Public (exported)

**Behavior:**

- Creates Axios client `authClient` with dynamic configuration. Configuration details are determined at runtime.

## retry-patterns.ts

<a id="lOxtj16uAX"></a>

### fetchWithRetry

**Signature:** `(url: string, maxRetries = 3): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `fetchWithRetry`. Calls `fetch()` with dynamic URL.

**Side effects:**
- network

**Errors thrown:**
- lastError;

<a id="dMbuAkhBGd"></a>

### fetchWithBackoff

**Signature:** `(url: string, maxRetries = 3): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `fetchWithBackoff`. Calls `fetch()` with URL `2`.

**Side effects:**
- network

<a id="uZquZcPEcm"></a>

### axiosWithRetry

**Signature:** `(): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Performs Mongoose write query (create): axios (model not resolved).

**Side effects:**
- network

**Open Questions:**
- q:qqovuBkKKj: What is the purpose and behavior of function `axiosWithRetry` at tests/fixtures/http-clients-analysis/retry-patterns.ts?

<a id="E97KEcCEOY"></a>

### retryWithDelay

**Signature:** `(fn: () => Promise<any>, retries = 3, delay = 1000): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function retryWithDelay (intent unclear from static analysis)

**Errors thrown:**
- error;

<a id="m7h2dgftHH"></a>

### retryOn5xx

**Signature:** `(url: string, maxRetries = 3): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `retryOn5xx`. Calls `fetch()` with dynamic URL.

**Side effects:**
- network

## timeout-patterns.ts

<a id="P2eVbjexDU"></a>

### fetchWithTimeout

**Signature:** `(url: string, timeoutMs = 5000): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `fetchWithTimeout`. Calls `fetch()` with dynamic URL.

**Side effects:**
- network

**Errors thrown:**
- error;

<a id="dOu5r6YbRX"></a>

### fetchWithRaceTimeout

**Signature:** `(url: string, timeoutMs = 5000): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Makes HTTP request using Fetch API in `fetchWithRaceTimeout`. Calls `fetch()` with dynamic URL.

**Side effects:**
- network

<a id="fF9rC8j3t3"></a>

### axiosRequestWithTimeout

**Signature:** `(url: string): Promise<any>`

**Visibility:** Public (exported)

**Behavior:**

- Function axiosRequestWithTimeout (intent unclear from static analysis)

**Side effects:**
- network

<a id="UPh3PdWYNS"></a>

### withTimeout

**Signature:** `(promise: Promise<T>, timeoutMs: number): Promise<T>`

**Visibility:** Public (exported)

**Behavior:**

- Function withTimeout: Enhances or augments data with additional information

<a id="xBsXTcvpLa"></a>

### apiClientWithTimeout

**Visibility:** Public (exported)

**Behavior:**

- Creates Axios client `apiClientWithTimeout`. with base URL `https://api.example.com`. Configures 5000ms timeout for requests.

