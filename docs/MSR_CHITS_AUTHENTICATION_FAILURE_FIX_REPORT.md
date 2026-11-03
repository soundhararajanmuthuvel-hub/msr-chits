# MSR CHITS — CRITICAL AUTHENTICATION FAILURE INVESTIGATION & FIX REPORT

**Date:** 2026-11-03  
**Status:** Verification Complete & Ready for Deployment Approval  
**Working Branch:** `fix/system-integration-and-data-consistency`  
**Latest Integration Commit:** `fa45496` (plus working tree auth hardening)  
**Live Production URL:** `https://msr-chits.vercel.app`  
**Live Apps Script Web App:** `https://script.google.com/macros/s/AKfycbxCa_O8f_SmBeFcn08XK2hMoiypEpzR1a-Hf3ICTWRsVpfd_Y87aq9ABcvJYBmTepxw/exec`

---

## 1. Executive Summary & Root Cause Analysis

### The Reported Issue
The production website at `https://msr-chits.vercel.app/dashboard` was experiencing repeated API errors:
> `Authentication required. Missing session token.`

Affected actions included:
- Read endpoints: `getPayments`, `getMonthlySchedule`, `getChits`, `getMembers`, `getMemberships`, `getMember`
- Mutation endpoints: `recordPayment`

Users could navigate into the dashboard and open the **Record Member Payment** modal, but submitting a payment failed because the Google Apps Script backend rejected the request with `AUTH_REQUIRED`.

---

### Root Cause 1: Production Deployment Disconnect (Vercel vs. Backend)
By strict instruction from previous review stages, code changes on `fix/system-integration-and-data-consistency` were intentionally **not pushed or deployed without approval**. 

When we inspected the live production JavaScript bundle at `https://msr-chits.vercel.app/assets/index-B-JSa2B_.js`, we verified:
1. **The Google Apps Script backend** had already been upgraded with token-based session security (`validateSessionToken_()`), requiring every financial GET and POST request to present a valid session token.
2. **The Vercel production frontend**, however, was still serving an earlier build from `origin/main` (commit `ff5dfae`).
3. In that legacy Vercel build:
   - `postApi` passed raw request bodies **without attaching any session token**.
   - `getApi` constructed URL query strings **without appending `&token=...`**.
4. Consequently, every single API call emitted by the deployed Vercel frontend was sent without a token, causing the backend to reject all requests with `Authentication required. Missing session token.`

---

### Root Cause 2: Stale Session Desynchronization & False Login State
In `src/services/auth.js`:
- The previous `getCurrentUser()` only inspected whether `localStorage.getItem('msr_auth_session')` had a `.user` object:
  ```javascript
  // Legacy code:
  getCurrentUser() {
    const session = localStorage.getItem('msr_auth_session');
    if (!session) return null;
    return JSON.parse(session).user || null;
  }
  ```
- If a browser had an older session created before token enforcement was introduced (or if `token` was `null` / undefined), `getCurrentUser()` returned truthy.
- `AuthContext` saw `user !== null` and set `isAuthenticated = true`.
- `ProtectedRoute` allowed the user onto `/dashboard`.
- However, `authService.getToken()` returned `null`.
- When the dashboard fired API calls, requests went out unauthenticated.

---

### Root Cause 3: Getter Cache Masking vs. Mutation Failure
Why was the user able to see the dashboard and open the payment modal if all endpoints were failing?
- In `src/services/api.js`, all read actions (`getMembers`, `getChits`, `getPayments`, `getMonthlySchedule`, `getMemberships`) had fallback error handlers:
  ```javascript
  // Legacy getter behavior:
  catch (e) {
    console.warn('getMembers error:', e.message);
    return getCache(STORAGE_KEYS.MEMBERS_CACHE) || [];
  }
  ```
  When the backend rejected the request with `AUTH_REQUIRED`, the catch block silently swallowed the rejection and returned stale cached data from `localStorage`. This created the **illusion** that the user was properly authenticated and viewing real data.
- However, `recordPayment` used `postApi('recordPayment', paymentData)` directly. Unlike the getters, mutations did not swallow the error.
- When the user clicked **Save Payment**, `postApi` received `AUTH_REQUIRED` from Apps Script and threw an uncaught error to the UI:
  `Authentication required. Missing session token.`

---

## 2. End-to-End Authentication Architecture & Fixes

We engineered a robust, fail-safe authentication lifecycle spanning the frontend storage, request wrappers, session eviction, and backend token handling:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION LIFECYCLE                         │
└────────────────────────────────────────────────────────────────────────┘

  [1. User Submits Login] ──▶ [api.login('admin', password)]
                                       │
                                       ▼
                     [Google Apps Script doPost('login')]
                                       │
                                       ▼ (Validates credentials)
                     [Returns: { success: true, token, user, expiresAt }]
                                       │
                                       ▼
  [2. authService.login()] ──▶ Saves to localStorage ('msr_auth_session')
                               { user, token, expiresAt, loginTime }
                                       │
                                       ▼
  [3. Protected API Calls] ──▶ postApi / getApi
                                       │
                                       ├── Attaches session token:
                                       │   - GET: &token=<token>
                                       │   - POST: body.token = <token>
                                       │           payload.token = <token>
                                       ▼
                     [Apps Script handleRequest(e, method)]
                                       │
                                       ├── validateSessionToken_(token)
                                       ▼
                           ┌────────────────────────┐
                           │   Is Token Valid?      │
                           └───┬────────────────┬───┘
                               │ YES            │ NO
                               │                ▼
                               │        [Return 401 AUTH_REQUIRED / SESSION_EXPIRED]
                               │                │
                               │                ▼
                               │        [Frontend isAuthError(e) Interceptor]
                               │                │
                               │                ├── Purges localStorage ('msr_auth_session')
                               │                ├── Dispatches 'msr:auth_expired'
                               │                └── Re-throws error (blocks stale cache)
                               │                        │
                               │                        ▼
                               │        [AuthContext handles event]
                               │                │
                               │                ├── Sets user = null
                               │                └── Redirects to /login with notification
                               ▼
                     [Execute Business Logic & Return Data]
```

### Detailed File Changes

#### 1. `src/services/auth.js`
- **Strict Session Validation:** Updated `getCurrentUser()` and `getToken()` to strictly verify that `token` exists, is a valid non-empty string, and `expiresAt` (if present) has not elapsed.
- If invalid or expired, storage is immediately wiped (`localStorage.removeItem('msr_auth_session')`) and `null` is returned.
- **Combined Authentication Gate:** `isAuthenticated()` now requires `!!this.getToken() && !!this.getCurrentUser()`.
- **Backend Logout Handshake:** Added `api.logout()` call in `logout()` to proactively invalidate the active session in Google Sheets.

#### 2. `src/context/AuthContext.jsx`
- **Startup Integrity Check:** On app initialization, validates both `token` and `user`. If either is missing, calls `authService.logout()` and initializes `user = null`.
- **Global Auth Expiry Bus:** Listens for the `msr:auth_expired` custom event. When triggered by any API interceptor:
  - Sets `user = null`.
  - Clears session state.
  - Sets `authError = "Your session has expired. Please log in again."`.
- Exposes `authError` and `clearAuthError()` to subscribers.

#### 3. `src/pages/Login.jsx`
- Subscribed to `authError` from `useAuth()`.
- When an expired or invalid session is evicted, displays a clear, prominent warning alert:
  > *"Your session has expired. Please log in again."*
- Clears the message automatically on new submission.

#### 4. `src/services/api.js`
- **`isAuthError(err)` Helper:** Accurately classifies errors containing `AUTH_REQUIRED`, `SESSION_EXPIRED`, `INVALID_TOKEN`, or `Missing session token`.
- **Transport Token Injection:**
  - `getApi`: Appends `&token=${encodeURIComponent(token)}` to every query URL.
  - `postApi`: Injects `token` into both the root JSON payload (`body.token`) and nested payload (`body.payload.token`).
- **Interception on Auth Failure:**
  - If `postApi` or `getApi` encounters an auth error, it clears `msr_auth_session`, dispatches `window.dispatchEvent(new CustomEvent('msr:auth_expired'))`, and immediately re-throws.
  - It **strictly avoids fallback to unauthenticated POST retries** or stale offline caches when authentication fails.
- **Getter Gating:** Updated `catch` blocks in `getMembers`, `getMember`, `getChits`, `getMonthlySchedule`, `getPayments`, `getPayouts`, `getMemberships`, `getReports`, `getMonthlyUnpaidSummary`, and `getCollectionPayoutSummary`:
  ```javascript
  if (isAuthError(e)) throw e;
  ```
  Auth errors are never masked by stale caches.
- **Concurrency Lock on Payment Submission:** Added `isPaymentSubmitting` flag in `recordPayment()` to prevent double-click duplicate payment submissions.

#### 5. `backend-app-script/Code.gs`
- Updated `handleRequest()` to extract the token from all possible locations:
  ```javascript
  const token = (bodyData && bodyData.token) ||
                (payload && payload.token) ||
                (e && e.parameter ? e.parameter.token : '') ||
                '';
  ```
- Ensures backward and forward compatibility whether the frontend sends the token at the body root or inside the `payload` wrapper.

---

## 3. Verification & Automated Test Results

### 1. Security & Authentication Test Suite (`tests/securityAndAuthTests.js`)
All 12 security specifications passed (100%):
- ✅ Unauthorized dashboard request rejected with `AUTH_REQUIRED`
- ✅ Unauthorized member data request rejected with `AUTH_REQUIRED`
- ✅ Unauthorized payment creation rejected with `AUTH_REQUIRED`
- ✅ Unauthorized payout creation rejected with `AUTH_REQUIRED`
- ✅ Valid admin login succeeds and returns secure session token
- ✅ Authorized admin read access succeeds with token
- ✅ Authorized payment creation succeeds in test database
- ✅ Authorized payout creation succeeds in test database
- ✅ Expired session token rejected with `SESSION_EXPIRED`
- ✅ Logout invalidates token; subsequent requests rejected with `INVALID_TOKEN`
- ✅ Non-admin role blocked from privileged administrative actions
- ✅ Inactive user account rejected at login

### 2. End-to-End Auth Flow & Protected Endpoints (`tests/testCompleteAuthFlow.js`)
- ✅ `isAuthError` correctly identifies all authentication codes (`AUTH_REQUIRED`, `SESSION_EXPIRED`, `INVALID_TOKEN`, and raw message strings).
- ✅ `authService` purges storage when token is missing or expired.
- ✅ All 8 core protected actions (`getPayments`, `getMonthlySchedule`, `getChits`, `getMembers`, `getMemberships`, `getMember`, `recordPayment`, `recordPayout`) reject unauthenticated requests and succeed with token.
- ✅ Token acceptance verified across root body and payload objects.

### 3. Master Verification Test Suite (`tests/runAllTests.js`)
- ✅ **180 of 180 tests PASSED (0 failures)** across all chit calculations, payout map, unpaid tracker, cash flow, and lifecycle rules.

### 4. Integration & Regression Suite (`tests/integrationAndRegressionTests.js`)
- ✅ **16 of 16 tests PASSED (0 failures)** covering multi-chit dues (14 members / 20 tickets), cycle month P&L, safe cancellation, and payment chit allocation.

### 5. Backend Writes & Cross-Module Consistency (`tests/testCrossModuleConsistency.js`)
- ✅ Baseline state verified (₹75,000 expected across all modules).
- ✅ Write simulations verified: payment recording, installment updates, payout recording, and safe cancellation.

### 6. API Router Audit (`tests/verifyRouterAndData.js`)
- ✅ **29 of 29** frontend API actions verified with exact matches against the 57 backend router cases in `Code.gs`.

### 7. Production Build Verification (`npm run build`)
- ✅ Vite production build completed with **0 compilation errors**:
  - `dist/index.html` (2.00 kB)
  - `dist/assets/index-CHoZq_DY.css` (66.48 kB)
  - `dist/assets/index-BCg-4RlL.js` (859.09 kB)

---

## 4. Live Apps Script Production Endpoint Verification

Direct live HTTP calls against the deployed Apps Script Web App confirmed:
1. **Unauthenticated GET `getMembers`:**
   ```json
   {
     "success": false,
     "code": "AUTH_REQUIRED",
     "message": "Authentication required. Missing session token."
   }
   ```
2. **Authenticated POST `login` (`admin/admin`):**
   ```json
   {
     "success": true,
     "token": "msr_sec_5cffb8ae3cdc419998dc8e2f2f731b4ee254b4a7",
     "expiresAt": "2026-11-04T09:57:55.262Z",
     "user": { "username": "admin", "displayName": "Admin", "role": "admin" }
   }
   ```
3. **Authenticated GET `getMembers` with token:**
   - Returned HTTP 200 with `success: true` and 14 live members.
4. **Authenticated POST `getPayments` with token:**
   - Returned HTTP 200 with `success: true` and 20 verified payment records.
5. **No production data was altered or corrupted during verification.**

---

## 5. Deployment Plan for Production (Vercel)

The backend Apps Script is already active and enforcing tokens. To eliminate the `Missing session token` error on `https://msr-chits.vercel.app`, the updated frontend must be deployed to Vercel.

### Step-by-Step Deployment Instructions

#### Step 1: Commit and Push the Working Tree
Commit the completed fixes on the implementation branch:
```bash
git add backend-app-script/Code.gs src/context/AuthContext.jsx src/pages/Login.jsx src/services/api.js src/services/auth.js tests/testCompleteAuthFlow.js docs/MSR_CHITS_AUTHENTICATION_FAILURE_FIX_REPORT.md
git commit -m "fix(auth): resolve production token handling, storage validation and expired session lifecycle"
git push origin fix/system-integration-and-data-consistency
```

#### Step 2: Merge into Main or Deploy Preview
To deploy to production on Vercel:
```bash
git checkout main
git merge fix/system-integration-and-data-consistency
git push origin main
```
*(Alternatively, configure Vercel to create a Preview Deployment from `fix/system-integration-and-data-consistency` for live browser verification before merging to `main`.)*

#### Step 3: Verify Vercel Build & Environment
- Confirm that `VITE_API_URL` is set in Vercel Project Settings to:
  `https://script.google.com/macros/s/AKfycbxCa_O8f_SmBeFcn08XK2hMoiypEpzR1a-Hf3ICTWRsVpfd_Y87aq9ABcvJYBmTepxw/exec`
- Vercel will trigger a build from `main` and deploy the updated bundle.

#### Step 4: Post-Deployment Smoke Test
1. Visit `https://msr-chits.vercel.app`.
2. Any user with a legacy session will see the login screen with *"Your session has expired. Please log in again."*
3. Log in with `admin` credentials.
4. Verify Dashboard displays 14 members, 20 active memberships, Month 2 collection, and payments without any `AUTH_REQUIRED` toasts.
5. Open the **Record Member Payment** modal and verify that saving a payment succeeds.

### Rollback Plan
If any unforeseen issue occurs after deployment:
1. Revert `main` to commit `fa45496` or redeploy the previous stable Vercel deployment from the Vercel Dashboard in 1 click.
2. The Google Sheets database remains untouched and intact.

---

## 6. Remaining Risks & Recommendations

1. **User LocalStorage Migration:**  
   Users who were logged in before the update had sessions stored without token timestamps. Our startup check automatically purges these legacy sessions and gracefully prompts the user to log in again.
2. **Third-Party Cookies / CORS:**  
   The Apps Script Web App responds with standard redirect headers (`ContentService.MimeType.JSON`). All requests use standard URL parameter tokens (GET) or JSON bodies (POST), avoiding CORS preflight header restrictions on Apps Script.
3. **No Database Risk:**  
   Zero production sheet modifications were made during testing. The live database remains intact.

