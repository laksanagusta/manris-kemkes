# Task 6 — Impact Criteria Matrix

## Status: COMPLETE ✅

**Goal:** Implement 90-row impact criteria matrix from kmk.md Tabel 2, with selector UI in risk forms.

## Steps

- [x] Step 1: Write failing entity test
- [x] Step 2: Run test — verify FAIL
- [x] Step 3: Create migration 000048 with 90-row seed
- [x] Step 4: Create ImpactCriteria entity
- [x] Step 5: Repository + UseCase + Handler
- [x] Step 6: Add to risk entity (ImpactCriteriaID, ImpactJustification)
- [x] Step 7: Update risk repository persistence
- [x] Step 8: Run backend verification (go test + migrate-up)
- [x] Step 9: Create frontend types
- [x] Step 10: Create API client
- [x] Step 11: Commit

**Note: Step 13 (selector component) skipped per user feedback — no new UI component. Use existing impact buttons instead.**

## Notes

- Seed data: 6 categories × 3 UPR levels × 5 impact levels = 90 rows
- API endpoint: GET /impact-criteria?category=&uprLevel=&impactLevel=
- Risk entity has ImpactCriteriaID + ImpactJustification fields
- Backend tests pass, frontend build passes

## Commit
bde769d — feat: add KMK impact criteria matrix backend + frontend types