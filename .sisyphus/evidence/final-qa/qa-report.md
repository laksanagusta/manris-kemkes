# [REAL MANUAL QA]

## Workflow 1: Super Admin Sets Context
  ✅ Page loads without redirect (URL: /admin/settings/organization-context)
  ✅ Org dropdown populated (shows 10 of 57 orgs - **BUG: only first page loaded**)
  ❌ Context saves successfully via UI (**BUG: `name` sent as empty string, causes 500**)
  ✅ Context saves via API (PUT /organizations/{id} returns 200)
  ✅ Context persists after refresh (verified via GET API)
  ✅ API returns context field (GET /organizations/{id} includes context)

  **ROOT CAUSE BUG**: `fetchOrgDetails` in page.tsx calls `api.get<{ data: Organization }>` 
  but `api.ts` auto-unwraps `{ data: ... }` responses (line 54). So `res.data` is `undefined`, 
  `orgName` never gets set, and PUT sends `name: ""` → backend 500 "name cannot be empty".

  **SECONDARY BUG**: Organization dropdown only fetches first 10 of 57 orgs (no `limit=100` param).

## Workflow 2: Unit User Edits Own Org
  ✅ Page loads for unit user (tested with unit_makassar)
  ✅ Org field shows read-only display (NOT dropdown) - correct for unit role
  ❌ Org name shows "Tidak ada nama organisasi" (**same auto-unwrap bug**)
  ❌ Context not loaded from server (**same auto-unwrap bug**)
  ✅ Context saves via API (PUT returns 200 for own org)
  ✅ API reflects update (GET confirms context saved)

## Workflow 3: Character Limit
  ✅ UI blocks input at 2000 chars (maxlength="2000" attribute on textarea)
  ⚠️ API rejects 2001+ chars but returns **500 instead of 400** (bug: wrong status code)
  ✅ Error message clear ("context must not exceed 2000 characters")
  ✅ Exactly 2000 chars accepted and saved

## Workflow 4: Empty Context
  ✅ Empty context saves (PUT with context:"" → 200)
  ✅ Database shows null (GET returns context: null)
  ✅ AI endpoints still work with empty context (fishbone returns valid categories)

## Workflow 5: AI Integration
  ✅ AI endpoint returns 200 (POST /ai/causes)
  ✅ Response looks reasonable (5 categories with 3 causes each)
  ✅ Evidence saved to .sisyphus/evidence/final-qa/ai-response-with-context.txt
  ✅ Org context fetched in use case via `orgRepo.GetContext()` (confirmed in fishbone.go:51)

## Edge Cases:
  ✅ Special characters handled (& ' " () [] all preserved correctly)
  ✅ Unicode/emoji handled (🏥 🌍 saved and retrieved correctly)

## VERDICT: FAIL - 3 bugs found

### Critical Bugs:
1. **[CRITICAL] Frontend auto-unwrap mismatch**: `fetchOrgDetails` expects `res.data` but `api.ts` 
   already unwraps, so org name and context never load into the form. **Saving always sends `name: ""`** 
   causing 500 error. Both superadmin and unit user affected.
   - File: `frontend/src/app/(app)/admin/settings/organization-context/page.tsx` lines 77-81
   - Fix: Change `const org = res.data;` to `const org = res as unknown as Organization;` 
     or change the type to `api.get<Organization>`.

2. **[MEDIUM] Org dropdown pagination**: Only 10 of 57 orgs shown in dropdown.
   - File: Same page, line 50 - `api.get<{data: Organization[]}>("/organizations", authToken)` 
     needs `?limit=100` or similar.

3. **[LOW] API returns 500 instead of 400** for context length validation error.
   - File: Backend validation returns domain error but handler maps to 500 instead of 400/422.

## Evidence Location: .sisyphus/evidence/final-qa/
- ai-response-with-context.txt - AI fishbone response with org context
- unit-user-org-context-page.png - Screenshot of unit user page
- qa-report.md - This report
