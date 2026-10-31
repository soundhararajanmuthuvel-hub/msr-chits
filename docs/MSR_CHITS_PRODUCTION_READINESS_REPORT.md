# MSR CHITS — PRODUCTION READINESS & PRE-DEPLOYMENT VERIFICATION REPORT

**Date:** November 1, 2026  
**Project:** MSR CHITS Management System  
**Repository:** `https://github.com/soundhararajanmuthuvel-hub/msr-chits.git`  
**Git Branch:** `fix/system-integration-and-data-consistency`  
**Verified Commit:** `fa4549616404f322e4238366b516135c566938d0`  
**Google Sheet ID:** `1FFdUFEtYSlatskAQfn74nZxwZ0zfhBNQeKqJfTYAFK0`  
**Live Apps Script Web App URL:** `https://script.google.com/macros/s/AKfycbxCa_O8f_SmBeFcn08XK2hMoiypEpzR1a-Hf3ICTWRsVpfd_Y87aq9ABcvJYBmTepxw/exec`  
**Status:** 🟡 **CONDITIONALLY READY FOR DEPLOYMENT** (Pending Manual Apps Script New Version Deployment & Security Token Enforcement)

---

## EXECUTIVE SUMMARY

A full pre-deployment production readiness verification of MSR CHITS was conducted in accordance with strict non-destructive safety constraints. All 196 test cases passed independently, the client build completed with zero errors, and all 28 API actions in `src/services/api.js` were verified against `backend-app-script/Code.gs`. Safe read-only inspection confirmed that live production data and UPI bank settings remain 100% intact.

Crucially, this audit identified **two key operational gates** that must be noted before production release:
1. **Google Apps Script Code Staleness:** Google Apps Script Web App deployments freeze code at deployment time. The live URL is currently executing the legacy `Code.gs` version; the new `Code.gs` changes (LockService, dynamic ticket dues calculation, installment router endpoint) will only become active once a **New Version** is deployed from the Apps Script editor.
2. **Backend Authentication & Authorization:** In `Code.gs`, `handleRequest()` does not validate session tokens before executing mutations. Anyone with knowledge of the Web App URL can trigger mutating actions anonymously.

---

## SECTION 1 — VERIFICATION AUDIT MATRIX

| Category | Item Description | Expected Standard | Observed Result | Status |
|---|---|---|---|:---:|
| **Git & Branch** | Branch & Commit verification | Branch: `fix/system-integration-and-data-consistency`, Commit: `fa45496` | Verified exact SHA `fa45496` | ✅ **PASS** |
| **Unit Testing** | Master Verification Suite (`runAllTests.js`) | 180/180 passing tests | 180 passing, 0 failing | ✅ **PASS** |
| **Regression Testing** | Integration Suite (`integrationAndRegressionTests.js`) | 16/16 passing tests covering Bugs 001–012 | 16 passing, 0 failing | ✅ **PASS** |
| **Client Build** | Vite Production Bundle (`npm run build`) | Zero JSX, styling, or compilation errors | Generated `dist/` cleanly in 2.54s | ✅ **PASS** |
| **API Router** | Action Coverage Audit | 100% of frontend actions handled in `Code.gs` | All 28 frontend actions matched to router cases | ✅ **PASS** |
| **Live Database** | Google Sheets Connection | Sheet Name: "MSR CHITS", 11 Tabs | Confirmed ID `1FFdUFEtY...` with 11 sheets | ✅ **PASS** |
| **Database Safety** | Production Data Integrity | Zero row deletions or overwrites in live sheet | All 14 members, 1 chit, 20 memberships intact | ✅ **PASS** |
| **Settings Integrity** | Bank & UPI Configuration | Correct account holder, IFSC, UPI ID | Verified Soundhararajan . M, SBI, `soundhararajanmuthuvel@oksbi` | ✅ **PASS** |
| **Cross-Module Sync** | Data Consistency across 6 Views | Dashboard, Unpaid, Payments, P&L, Reports, Cash Flow match | Verified on test replica (Month 2 ₹75,000) | ✅ **PASS** |
| **Vercel Config** | Environment Variables | Only `VITE_API_URL` required | Confirmed no new env variables needed | ✅ **PASS** |
| **Backend Auth** | Token Check on Mutations | Validate session token on every mutating action | **No token validation found in `handleRequest()`** | 🔴 **FAIL** |
| **Live Script Version**| Google Apps Script Deployment | Web App executing commit `fa45496` code | **Web App executing legacy deployment snapshot** | 🟡 **PENDING DEPLOY** |

---

## SECTION 2 — DETAILED AUDIT FINDINGS

### 2.1 Live Integration Results (Safe Read-Only Inspection)
Direct HTTPS read-only diagnostic requests were executed against the live deployed Web App URL:
- **Health Check (`action=health`):**
  - Status: `ONLINE`
  - Spreadsheet Name: `MSR CHITS`
  - Sheets Count: `11`
- **Spreadsheet Connection Diagnostic (`action=testSpreadsheetConnection`):**
  - Spreadsheet ID: `1FFdUFEtYSlatskAQfn74nZxwZ0zfhBNQeKqJfTYAFK0`
  - Verified Tabs: `Users`, `ExtraInvestment`, `Memberships`, `WhatsAppLog`, `Chits`, `Members`, `MonthlySchedule`, `Payments`, `Settings`, `Payouts`, `ActivityLog`.
- **Live Entity Counts (`getMembers`, `getChits`, `getMemberships`, `getPayments`, `getPayouts`):**
  - Registered Physical Members: `14`
  - Active Chit Schemes: `1`
  - Active Ticket Memberships: `20`
  - Recorded Month 1 Payments: `20`
  - Recorded Payouts: `0`
- **Settings & Banking Inspection (`action=getSettings`):**
  - Company: `MSR CHITS`
  - UPI ID: `soundhararajanmuthuvel@oksbi`
  - Bank Name: `STATE BANK OF INDIA`
  - Account Holder: `Soundhararajan . M`
  - Account Number: `45411804514`
  - IFSC Code: `SBIN0000864`
  - Branch: `KUMBAKONAM`
  - Phone: `9489417493`

### 2.2 API Router Completeness (100% Verified)
A automated audit comparing `src/services/api.js` against `backend-app-script/Code.gs` verified that all **28 distinct API actions** called by the frontend are fully mapped to switch cases in `Code.gs`:
`allocateExtraInvestment`, `assignChit`, `cancelMembership`, `changePassword`, `createChit`, `createExtraInvestment`, `createMember`, `createMembership`, `deactivateMember`, `deleteExtraInvestment`, `deleteMember`, `deleteMembership`, `getCollectionPayoutSummary`, `getProfitLoss`, `logWhatsApp`, `login`, `reactivateMember`, `recordActualRecord`, `recordInvestmentRecovery`, `recordPayment`, `recordPayout`, `updateChit`, `updateExtraInvestment`, `updateMember`, `updateMonthlyInstallment`, `updateSchedulePayout`, `updateSettings`, `updateWhatsAppStatus`.

### 2.3 Write Simulation & Cross-Module Consistency (Test Replica)
Using an isolated in-memory test database replicating the exact live production structure (14 members, 20 memberships, Month 1 complete, Month 2 upcoming):
1. **Baseline Month 2 Dues:**
   - Evaluated across Dashboard, Monthly Unpaid, and Financial Reports: **₹75,000** ($20 \text{ tickets} \times ₹3,750$).
   - Cash Balance: **₹0** (Month 1 collections ₹1,00,000 $-$ payout ₹1,00,000).
2. **Partial Payment Write:**
   - Recorded ₹3,750 for `MSR261L01` (Soundhararajan M).
   - Recalculated Dashboard: Collected = ₹3,750, Pending = ₹71,250.
   - Recalculated Monthly Unpaid: Soundhararajan's ticket 1 marked Paid (₹0 unpaid); ticket 2 remains Unpaid (₹3,750). Total Unpaid: ₹71,250.
   - Cash Balance dynamically increased to ₹3,750.
3. **Monthly Installment Update:**
   - Updated Month 2 installment from ₹3,750 to ₹4,000 via `updateMonthlyInstallment` without requiring `payoutAmount`.
   - New expected collection dynamically calculated as $20 \times ₹4,000 = \mathbf{₹80,000}$.
4. **Payout Write:**
   - Scheduled payout ₹75,000 vs. actual recorded payout ₹70,000.
   - Cash balance decreased strictly by actual payout (₹70,000), leaving scheduled amounts isolated.
5. **Safe Membership Cancellation:**
   - Cancelled membership `MSR261L02` (Dinesh Mamz).
   - Status updated to `CANCELLED`; permanent ticket `MSR261L02` preserved in database.
   - Active tickets dropped to 19; future Month 3 dues dynamically adjusted to $19 \times ₹3,825 = \mathbf{₹72,675}$.
   - Month 1 historical payment records remained intact.

---

## SECTION 3 — SECURITY AUDIT (MUTATION AUTHENTICATION & AUTHORIZATION)

> [!CAUTION]
> **CRITICAL SECURITY VULNERABILITY: UNPROTECTED BACKEND MUTATIONS**

### Finding:
In `backend-app-script/Code.gs` lines 3286–3336:
```javascript
function handleRequest(e, method) {
  try {
    let action = '';
    let payload = {};
    // ... extracts action and payload ...
    const isMutating = MUTATING_ACTIONS.indexOf(action) !== -1;
    // ... acquires lock ...
    switch (action) {
      case 'deleteMember':
        result = deleteMember(payload.memberId);
        break;
      case 'changePassword':
        result = handleChangePassword(payload);
        break;
      // ... executes action immediately without token check!
    }
```

1. **Authentication Token Never Validated:**  
   While `handleLogin` generates a session token (`msr_token_...`), `handleRequest` **never validates** the token or authorization headers on incoming requests.
2. **Public Web App Access:**  
   The Apps Script Web App is deployed with `"Who has access: Anyone"` (standard for Google Apps Script Web Apps consumed by client-side SPAs). Consequently, anyone who possesses or discovers the Web App URL can trigger destructive or administrative actions (`deleteMember`, `recordPayment`, `changePassword`, `updateSettings`) via a simple HTTP request without logging in.

### Immediate Hardening Recommendation:
Implement token validation in `handleRequest` by requiring `payload.token` or an `Authorization` parameter for all `MUTATING_ACTIONS`, verifying it against active sessions stored in the `Users` tab or Script Properties.

---

## SECTION 4 — REQUIRED DEPLOYMENT STEPS

Because Google Apps Script Web Apps freeze the code at deployment time, deploying this release requires two distinct actions:

### Step 1: Deploy New Version of Google Apps Script Backend
1. Open the Google Sheet: `https://docs.google.com/spreadsheets/d/1FFdUFEtYSlatskAQfn74nZxwZ0zfhBNQeKqJfTYAFK0`
2. In the top menu, go to **Extensions** $\rightarrow$ **Apps Script**.
3. Select `Code.gs` in the editor.
4. Replace its entire contents with the updated code from [`backend-app-script/Code.gs`](file:///d:/MSR%20Chit/backend-app-script/Code.gs).
5. Click **Save** (Ctrl+S / Cmd+S).
6. Click **Deploy** $\rightarrow$ **Manage deployments**.
7. Click the **Edit** (pencil) icon next to the active deployment.
8. In the **Version** dropdown, select **New version**.
9. In the Description box, enter: `v2.0 - System Integration, Concurrency Locks & Data Consistency`.
10. Ensure:
    - **Execute as:** `Me (soundhararajanmuthuvel@gmail.com)`
    - **Who has access:** `Anyone`
11. Click **Deploy**.
12. Verify whether the Web App URL changed. If the existing deployment was edited, the URL remains identical to `https://script.google.com/macros/s/AKfycbxCa_O8f_SmBeFcn08XK2hMoiypEpzR1a-Hf3ICTWRsVpfd_Y87aq9ABcvJYBmTepxw/exec`. If a brand new deployment was created, copy the new URL.

### Step 2: Deploy Frontend to Vercel
1. Ensure the `VITE_API_URL` in `.env` matches the deployed Apps Script URL.
2. Merge `fix/system-integration-and-data-consistency` into `main`:
   ```bash
   git checkout main
   git merge fix/system-integration-and-data-consistency
   git push origin main
   ```
3. Vercel will automatically trigger a deployment from the `main` branch.
4. Verify in the Vercel Project Dashboard that `VITE_API_URL` is set in **Project Settings $\rightarrow$ Environment Variables** (no additional environment variables are required).

---

## SECTION 5 — ROLLBACK INSTRUCTIONS

If any unexpected behavior occurs post-deployment, follow these rollback procedures immediately:

### Rollback Google Apps Script (Backend)
1. In the Apps Script Editor, click **Deploy** $\rightarrow$ **Manage deployments**.
2. Select the active deployment and click **Edit** (pencil icon).
3. In the **Version** dropdown, select the previous version (e.g., Version 1 or the pre-migration version).
4. Click **Deploy**.
5. The backend immediately reverts to the previous logic without modifying existing sheet rows.

### Rollback Frontend (Vercel)
1. In the Vercel Dashboard, navigate to the **Deployments** tab.
2. Locate the previous stable production deployment (commit `ff5dfae` or prior).
3. Click the three dots menu ($\dots$) and select **Instant Rollback**.
4. Alternatively, revert via Git:
   ```bash
   git checkout main
   git revert -m 1 HEAD
   git push origin main
   ```

---

## SECTION 6 — PRE-DEPLOYMENT CHECKLIST SUMMARY

- [x] All 196 tests passing independently (`16` regression + `180` master).
- [x] Vite build tested and verified error-free.
- [x] All 28 frontend API actions verified in Apps Script router.
- [x] Zero production rows deleted or corrupted.
- [x] Settings, banking, and UPI information verified intact.
- [x] Working branch cleanly committed on `fa45496`.
- [ ] **Awaiting user approval before triggering Apps Script version deployment or Git merge to `main`.**

---
*Report prepared for User Review and Pre-Deployment Approval.*
