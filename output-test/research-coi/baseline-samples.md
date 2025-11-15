# Sample Entity Descriptions (Pre-Pivot Baseline)

This file captures representative entity descriptions from the current fact-based architecture
for comparison with post-pivot LLM-first output.

**Baseline Date:** 2025-11-15
**System:** Fact-based pattern matching with LLM polish disabled
**Metrics:** High: 212 (47.9%), Medium: 231 (52.1%), Low: 0 (0.0%)

---

## 1. buildCache (function)

**File:** `src/server/cache.js`  
**Confidence:** Medium

**Signature:** `(keyPrefix, options): { get: (key: any, school: any) => Promise<any>; set: (key: any, value: any, school: any) => Promise<any>; del: (key: any, school: any) => Promise<any>; }`

**Visibility:** Public (exported)

**Behavior:**

- Builds cache based on keyPrefix.

*Note: Description inferred from function name. Specific implementation details may vary.*

---

## 2. DISCLOSURE_STATUS (constant)

**File:** `src/coi-constants.js`  
**Confidence:** High

**Behavior:**

Enumeration constant `DISCLOSURE_STATUS` defining numeric status codes: IN_PROGRESS (1), SUBMITTED_FOR_APPROVAL (2), UP_TO_DATE (3), REVISION_REQUIRED (4), EXPIRED (5), RESUBMITTED (6), UPDATE_REQUIRED (7), RETURNED (8), ARCHIVED (9).

---

## 3. formatDate (function)

**File:** `src/server/date-utils.js`
**Confidence:** Medium

**Behavior:**

Formats date based on date and timezone.

*Note: Description inferred from function name. Specific implementation details may vary.*

---

## 4. changeSummary (function)

**File:** `src/config-changes.js`
**Confidence:** High

**Behavior:**

Compares two configuration objects and generates a detailed summary of changes across screening questions, entity questions, relationship person types, and declaration types, identifying differences in their structures and properties.

---

## 5. ROLES (constant)

**File:** `src/coi-constants.js`
**Confidence:** High

**Behavior:**

String constant mapping `ROLES` defining: ADMIN ("admin"), REVIEWER ("reviewer"), VIEWER ("viewer"), USER ("user").

---

## 6. hashCode (function)

**File:** `src/hash.js`
**Confidence:** Medium

**Behavior:**

Checks if h code based on toHash.

*Note: Description inferred from function name. Specific implementation details may vary.*

---

## 7. run (function)

**File:** `src/server/app.js`
**Confidence:** High

**Behavior:**

Express configuration function run that sets application configuration via app.set, reads configuration values via app.get.

---

## 8. memCache (function)

**File:** `src/server/cache.js`
**Confidence:** High

**Behavior:**

Converts request data to JSON format via `JSON.stringify()` for serialization. Parses JSON response data using `JSON.parse()`.

---

## 9. NOTIFICATION_TYPE (constant)

**File:** `src/coi-constants.js`
**Confidence:** High

**Behavior:**

String constant mapping `NOTIFICATION_TYPE` defining: ADMIN ("Admin Notifications"), REVIEWER ("Additional Reviewer Notifications"), REPORTER ("Reporter Notifications").

---

## 10. configureSecurity (function)

**File:** `src/server/app.js`
**Confidence:** Medium

**Behavior:**

Configures security based on server.

*Note: Description inferred from function name. Specific implementation details may vary.*

---

