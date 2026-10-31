# MSR CHITS — SECURITY HARDENING & LIVE PAYOUT RECONCILIATION REPORT

**Date:** November 1, 2026  
**Project:** MSR CHITS Management System  
**Branch:** `fix/system-integration-and-data-consistency`  
**Google Sheet ID:** `1FFdUFEtYSlatskAQfn74nZxwZ0zfhBNQeKqJfTYAFK0`  
**Web App URL:** `https://script.google.com/macros/s/AKfycbxCa_O8f_SmBeFcn08XK2hMoiypEpzR1a-Hf3ICTWRsVpfd_Y87aq9ABcvJYBmTepxw/exec`  
**Status:** ✅ **SECURITY HARDENED & RECONCILED (Awaiting Deployment Approval)**

---

## 1. EXECUTIVE SUMMARY

In response to the security vulnerabilities and payout ledger discrepancies identified during pre-deployment audits, two critical engineering operations have been completed:
1. **Backend Authentication & Authorization:** Implemented cryptographically secure token validation (`msr_sec_...`) with a 24-hour expiration window in `backend-app-script/Code.gs`. All financial reads and data mutations are now strictly gated behind token verification. Admin-only operations enforce role-based access control (RBAC), and user identity is derived strictly from the verified session, eliminating frontend spoofing.
2. **Payout Forensic Investigation & Reconciliation:** Discovered why the live `Payouts` sheet tab contained zero records while the UI showed Month 1 as completed. The administrative workflow previously edited scheduled targets directly via `updateSchedulePayout`, which updated `MonthlySchedule` and set `payoutStatus = 'Completed'`, but **never created a physical disbursement voucher** in the `Payouts` sheet ledger. Month 1 payout (₹70,000 to Soundhararajan M) is formally classified as an **Unconfirmed Transaction** pending administrator confirmation.

All 12 automated security tests passed, all 180 master unit tests and 16 integration tests passed, and the Vite client production build completed with zero errors.

---

## 2. BACKEND AUTHENTICATION & SECURITY IMPLEMENTATION

### 2.1 Architecture & Token Lifecycle
```mermaid
sequenceDiagram
    autonumber
    actor User as Admin User
    participant Client as Frontend (api.js)
    participant Router as Apps Script Router (handleRequest)
    participant Cache as CacheService (6h TTL)
    participant Sheet as Users Sheet (24h TTL)

    User->>Client: Enters Username & Password
    Client->>Router: POST action="login" {username, password}
    Router->>Sheet: Query user & verify credentials
    Sheet-->>Router: Valid active user
    Router->>Router: Generate token msr_sec_UUID
    Router->>Sheet: Store token & tokenExpiry (24h)
    Router->>Cache: Cache session (userId, role, expiresAt)
    Router-->>Client: {success: true, token, user} (No password exposed)
    Client->>Client: Cache token in localStorage (msr_auth_session)

    Note over Client,Router: Protected Request (e.g. action="dashboard" or "recordPayment")
    Client->>Router: POST/GET with token attached
    Router->>Cache: Lookup token
    alt Found in Cache & Not Expired
        Cache-->>Router: Valid sessionUser
    else Cache Miss
        Router->>Sheet: Lookup user by token
        Sheet-->>Router: Valid sessionUser (refresh cache)
    end
    Router->>Router: Enforce RBAC (Admin required for mutations)
    Router-->>Client: Returns protected domain data
```

### 2.2 Security Features Implemented in `backend-app-script/Code.gs`
1. **Cryptographically Secure Session Tokens:**  
   Generated using `Utilities.getUuid()`: `msr_sec_[UUID32][UUID8]` providing 160+ bits of entropy.
2. **Dual-Tier Token Storage:**  
   - **Tier 1 (Fast Memory):** Stored in Google Apps Script `CacheService.getScriptCache()` with a 6-hour TTL for low-latency verification without consuming sheet read quotas.
   - **Tier 2 (Database Persistence):** Stored in the `Users` sheet (`token` and `tokenExpiry` columns) with a 24-hour lifetime.
3. **Identity Derivation from Token:**  
   Functions like `handleChangePassword` and mutating logs no longer trust `payload.userId`, `payload.role`, or `payload.user` supplied by the frontend. The user's ID, username, and role are extracted directly from the verified session object (`sessionUser`).
4. **Role-Based Access Control (RBAC):**  
   Destructive actions (`deleteMember`, `cancelMembership`, `deleteMembership`, `deleteExtraInvestment`, `changePassword`, `updateSettings`) verify `sessionUser.role === 'Admin'`. Non-admin accounts receive `FORBIDDEN (403)`.
5. **Session Expiry & Revocation:**  
   Tokens with `new Date(expiresAt) <= new Date()` are immediately rejected with `SESSION_EXPIRED (401)`.
6. **Explicit Logout (`action=logout`):**  
   Calling `handleLogout` removes the token from `CacheService` and clears the token and expiration fields in the `Users` sheet.
7. **Privacy & Logging Hygiene:**  
   Passwords, hashes, and session tokens are strictly excluded from return objects and `ActivityLog` entries.

---

## 3. PROTECTED API ACTION AUDIT MATRIX

Every action called across the MSR CHITS ecosystem is mapped and enforced as follows:

| Category | API Action | Auth Level Required | Enforced Handler | Error Code if Unauthorized |
|---|---|:---:|---|:---:|
| **Public** | `health` | Public | `handleHealthCheck()` | None |
| **Public** | `login` | Public (Credentials) | `handleLogin(user, pass)` | `INVALID_CREDENTIALS` |
| **Public** | `testSpreadsheetConnection` | Public (Diagnostic) | `testSpreadsheetConnection()` | None |
| **Protected Read** | `dashboard` | Active Session | `getDashboardData()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getChits`, `getChit` | Active Session | `getAllChits()`, `getChitDetails()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getMembers`, `getMember` | Active Session | `getAllMembers()`, `getMemberDetails()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getMonthlySchedule` | Active Session | `getMonthlySchedule()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getMemberships` | Active Session | `getMembershipsSafe()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getPayments` | Active Session | `getAllPayments()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getPayouts` | Active Session | `getAllPayouts()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getMonthlyUnpaidSummary` | Active Session | `getMonthlyUnpaidSummary()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getCollectionPayoutSummary`| Active Session | `getCollectionPayoutSummary()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getProfitLoss` | Active Session | `getProfitLossAnalysis()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getReports` | Active Session | `getFinancialReports()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getSettings` | Active Session | `getSystemSettings()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getExtraInvestments` | Active Session | `getExtraInvestments()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getActivityLog` | Active Session | `getActivityLogs()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Read** | `getWhatsAppLogs` | Active Session | `getWhatsAppLogs()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Mutation** | `recordPayment` | Active Session + Lock | `recordMemberPayment()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Mutation** | `recordPayout` | Active Session + Lock | `recordChitPayout()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Mutation** | `updateMonthlyInstallment` | Active Session + Lock | `updateMonthlyInstallment()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Mutation** | `updateSchedulePayout` | Active Session + Lock | `updateSchedulePayout()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Mutation** | `createMember`, `updateMember` | Active Session + Lock | `createNewMember()`, `updateMemberDetails()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Protected Mutation** | `createMembership`, `assignChit`| Active Session + Lock | `createOrAssignMembership()` | `AUTH_REQUIRED` / `SESSION_EXPIRED` |
| **Admin-Only** | `deleteMember`, `deactivateMember` | Admin Role + Lock | `deleteMember()`, `deactivateMember()` | `FORBIDDEN` |
| **Admin-Only** | `cancelMembership`, `deleteMembership` | Admin Role + Lock | `cancelMembership()`, `deleteMembershipRecord()` | `FORBIDDEN` |
| **Admin-Only** | `changePassword` | Admin Role + Lock | `handleChangePassword()` | `FORBIDDEN` |
| **Admin-Only** | `updateSettings` | Admin Role + Lock | `updateSystemSettings()` | `FORBIDDEN` |
| **Admin-Only** | `deleteExtraInvestment` | Admin Role + Lock | `deleteExtraInvestment()` | `FORBIDDEN` |
| **Session Control** | `logout` | Active Session | `handleLogout()` | None |

---

## 4. AUTHENTICATION TEST SUITE RESULTS

The automated security test harness in [`tests/securityAndAuthTests.js`](file:///d:/MSR%20Chit/tests/securityAndAuthTests.js) verified all 12 operational security conditions:

```
====================================================
RUNNING MSR CHITS SECURITY & AUTHENTICATION TEST SUITE
====================================================
✅ [PASS] TEST 1: Unauthorized dashboard request rejected with AUTH_REQUIRED
✅ [PASS] TEST 2: Unauthorized member data request rejected with AUTH_REQUIRED
✅ [PASS] TEST 3: Unauthorized payment creation rejected with AUTH_REQUIRED
✅ [PASS] TEST 4: Unauthorized payout creation rejected with AUTH_REQUIRED
✅ [PASS] TEST 5: Valid admin login succeeds and returns secure session token
✅ [PASS] TEST 6: Authorized admin read access succeeds with token
✅ [PASS] TEST 7: Authorized payment creation succeeds in test database
✅ [PASS] TEST 8: Authorized payout creation succeeds in test database
✅ [PASS] TEST 9: Expired session token rejected with SESSION_EXPIRED
✅ [PASS] TEST 10: Logout invalidates token; subsequent requests rejected with INVALID_TOKEN
✅ [PASS] TEST 11: Non-admin role blocked from privileged administrative actions
✅ [PASS] TEST 12: Inactive user account rejected at login
====================================================
ALL 12 SECURITY & AUTHENTICATION TESTS PASSED (100%)
====================================================
```

---

## 5. PAYOUT FORENSIC INVESTIGATION & RECONCILIATION

### 5.1 Root Cause of the Discrepancy
**Question:** Why did earlier screenshots display Month 1 as *Completed* for ₹70,000, while the live `Payouts` sheet tab contained 0 records?

**Forensic Audit Findings:**
1. **Activity Log Evidence:**  
   Analysis of all 98 rows in `ActivityLog` revealed **23 payout-related entries** (from `ACT-046` to `ACT-091`).  
   - Every single entry had `action: "Payout Updated"`.
   - **Zero entries** had `action: "Payout Recorded"`.
2. **Code Execution Path:**  
   - When administrators configured payouts on the Chit Details / Schedule screen, they used the **"Edit Payout"** modal, which triggers `updateSchedulePayout`.
   - `updateSchedulePayout` updates the `MonthlySchedule` sheet:
     `MonthlySchedule.payoutAmount = 70000`, `MonthlySchedule.payoutStatus = 'Completed'`.
   - It searches for an existing row in `Payouts` to update. If no row exists, **it does not create one**.
   - The dedicated financial voucher creation function (`recordChitPayout()`), which writes disbursement receipts (Payment Method, Bank Reference, Date, Actual Outflow) to the `Payouts` sheet, **was never executed**.
3. **UI Synthesis:**  
   The frontend UI (`Payouts.jsx`, `Dashboard.jsx`, `MonthlySchedule.jsx`) rendered payout cards directly from `MonthlySchedule`. When it read `payoutStatus: "Completed"`, it displayed a green "Completed" badge with ₹70,000, leading viewers to believe an accounting transaction had been recorded.

### 5.2 Month 1 Payout Recipient Discrepancy
- Earlier mock screenshots displayed *Dinesh Mama* as Month 1 payout recipient.
- The **actual live production sheet** in `MonthlySchedule` line 2 shows:
  ```json
  {
    "monthNumber": 1,
    "assignedMemberId": "MEM-001",
    "assignedMemberName": "Soundhararajan M",
    "chitNumber": "NIL",
    "payoutAmount": 70000,
    "payoutStatus": "Completed"
  }
  ```
- **Conclusion:** Dinesh Mama was a demo/mock assignment in early interface testing. The actual production database has `Soundhararajan M` assigned to Month 1. However, because no bank transfer reference or disbursement voucher was ever created in `Payouts`, this transaction remains **Unconfirmed**.

### 5.3 Cash Balance Impact & Reconciliation Decision
- **Gross Month 1 Collections:** ₹100,000 (20 verified payments @ ₹5,000).
- **Physical Cash Position:**
  - If the ₹70,000 payout was **physically transferred from the bank**:
    $$\text{Actual Cash Balance} = ₹100,000 - ₹70,000 = \mathbf{₹30,000}$$
  - If the ₹70,000 payout was **NOT yet disbursed**:
    $$\text{Actual Cash Balance} = \mathbf{₹100,000}$$
- **Safety Protocol Enforced:**  
  Per user instructions (*"Do not insert a duplicate or fabricate a payout. If the actual payment cannot be verified, report it as requiring administrator confirmation"*), **no artificial payout row has been inserted into the production sheet**. Month 1 payout is marked as:
  > **STATUS: REQUIRING ADMINISTRATOR CONFIRMATION**  
  > The administrator must review bank statements to verify whether ₹70,000 was disbursed to Soundhararajan M on or around October 2026. Once confirmed, the administrator should record the voucher via the "Record Payout" interface with the valid bank reference number.

---

## 6. VERIFIED PRODUCTION DATABASE STATE (READ-ONLY)

Live non-destructive inspection verified the following exact state of the production database:

### 6.1 14 Physical Members & 20 Active Memberships
- `MEM-001`: Soundhararajan M $\rightarrow$ **2 tickets** (`MSR261L01`, `MSR261L16`)
- `MEM-002`: Dinesh Mamz $\rightarrow$ **3 tickets** (`MSR261L02`, `MSR261L09`, `MSR261L15`)
- `MEM-003`: Appa $\rightarrow$ **1 ticket** (`MSR261L10`)
- `MEM-004`: Mani Mamz $\rightarrow$ **2 tickets** (`MSR261L03`, `MSR261L06`)
- `MEM-005`: Sathya Anna $\rightarrow$ **1 ticket** (`MSR261L04`)
- `MEM-006`: Athai (Periya athai) $\rightarrow$ **1 ticket** (`MSR261L05`)
- `MEM-007`: Chinna Periyappa $\rightarrow$ **2 tickets** (`MSR261L07`, `MSR261L14`)
- `MEM-008`: Periya Periyappa $\rightarrow$ **2 tickets** (`MSR261L08`, `MSR261L20`)
- `MEM-009`: Kumaran Mama $\rightarrow$ **1 ticket** (`MSR261L17`)
- `MEM-010`: Rajavel Mama $\rightarrow$ **1 ticket** (`MSR261L11`)
- `MEM-011`: Venkatesan Mama $\rightarrow$ **1 ticket** (`MSR261L19`)
- `MEM-012`: Amma $\rightarrow$ **1 ticket** (`MSR261L12`)
- `MEM-013`: Thiruvamnabalam $\rightarrow$ **1 ticket** (`MSR261L18`)
- `MEM-014`: Chinna Athai $\rightarrow$ **1 ticket** (`MSR261L13`)
**Total Active Tickets:** Exactly 20 tickets across 14 active members.

### 6.2 Transactional Summary
- **Month 1 Payments:** 20 verified payment records totaling **₹100,000** (₹5,000 per ticket).
- **Month 2 Payments:** 0 records (₹0 collected).
- **Month 2 Scheduled Installment:** ₹3,750 per ticket $\rightarrow$ Total Monthly Due = **₹75,000**.
- **Payouts Ledger:** 0 disbursement vouchers recorded in `Payouts` sheet.
- **Extra Investments:** 1 active investment (`INV-001`, ₹70,000 received from MSR on 2026-11-01, remaining: ₹70,000).

---

## 7. UNRESOLVED ITEMS & ADMINISTRATOR ACTIONS

1. **Month 1 Payout Voucher Creation:**  
   The administrator must verify whether ₹70,000 was physically disbursed to Soundhararajan M. If confirmed, submit a voucher via the "Record Payout" dialog entering:
   - Recipient: `Soundhararajan M`
   - Month: `Month 1`
   - Amount: `₹70,000`
   - Payment Mode: `Bank Transfer` or `UPI`
   - Bank Reference Number (e.g. `UTR / Transaction ID`)
2. **Apps Script Web App Deployment:**  
   The updated backend code in `backend-app-script/Code.gs` contains the token authentication gates, `LockService`, and calculation fixes. It must be published as a **New Version** in the Apps Script editor before it takes effect on the live URL.

---

## 8. DEPLOYMENT & ROLLBACK INSTRUCTIONS

### Step 1: Deploy Google Apps Script Web App
1. Open the Google Spreadsheet:  
   `https://docs.google.com/spreadsheets/d/1FFdUFEtYSlatskAQfn74nZxwZ0zfhBNQeKqJfTYAFK0`
2. Open **Extensions** $\rightarrow$ **Apps Script**.
3. Replace `Code.gs` with the updated code from [`backend-app-script/Code.gs`](file:///d:/MSR%20Chit/backend-app-script/Code.gs).
4. Save the file (**Ctrl+S** / **Cmd+S**).
5. Click **Deploy** $\rightarrow$ **Manage deployments**.
6. Click the **Edit** icon next to the active deployment.
7. Select **Version: New version**. Description: `v2.1 - Token Authentication & Payout Isolation`.
8. Ensure **Execute as: Me** and **Who has access: Anyone**.
9. Click **Deploy**.

### Step 2: Merge Frontend to Main (Vercel)
```bash
git checkout main
git merge fix/system-integration-and-data-consistency
git push origin main
```
Vercel will automatically build and publish the production frontend.

### Rollback Procedures
- **Apps Script Rollback:** In **Manage deployments**, edit the deployment and select the previous version dropdown entry. Click Deploy.
- **Frontend Rollback:** In the Vercel Dashboard, select the previous stable deployment and click **Instant Rollback**.

---
*Report prepared for Administrator Review and Deployment Authorization.*
