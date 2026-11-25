# AF Management v1.9 — Reproducible Test Report

**Baseline:** the supplied v1.8 offline-first PWA source.  
**Release scope:** technical reliability/import-safety corrections only.  
**Test data:** synthetic/dummy patient data only.

## Results on the build runner

### JavaScript syntax
- `node --check app.js` — PASS
- `node --check core.js` — PASS
- `node --check sw.js` — PASS

### Node unit and static regression tests
- Command: `node --test tests/*.test.js` (also invoked by `./tests/run_tests.sh`)
- Result: **24 tests passed, 0 failed**.
- Coverage includes schema validation of records, orders, drafts, favourites, audit entries and backup metadata; record/profile revision comparison; stale profile protection; seven-day backup due logic; SHA-256 helper; duplicate helper declarations; import checksum/version checks; plan re-approval after patient-data edits; autosaved draft wiring; confirmed backup gate; staff backup scoping; print popup failure; multi-tab/storage error handling; cache-first service worker; PWA assets; emergency links on the backup gate; and a byte-for-byte fingerprint guard for selected v1.8 clinical functions.

### Chromium browser smoke test
- Command: `python3 tests/browser_smoke.py` (also invoked by `./tests/run_tests.sh` when Python Playwright and Chromium are available).
- Result: **PASS** using synthetic data.
- Exercised the real app HTML/CSS/core/app source in Chromium via `page.set_content()`; checked app initialization, staff profile invitation creation/import, tamper rejection, TXT transfer round-trip, staff-vs-doctor record visibility, staff backup scoping, stale record import rejection, plan revision rejection, plan invalidation after patient edit, wizard draft resume, and weekly backup confirm/cancel behavior.
- Test-harness limitation: this execution environment blocks local HTTP and `file://` navigation. Therefore the browser test embeds the app source into an opaque-origin page and supplies an in-memory `localStorage` shim and deterministic digest shim. **It is not a secure-origin/PWA installation test.** The actual SHA-256 implementation is separately tested with Node's WebCrypto in `core.test.js`.

## Important checks against the clinical baseline

`tests/static-regression.test.js` checks SHA-256 fingerprints for these selected clinical functions against v1.8; all matched unchanged:
- `hemodynamicScreen`
- `hasPotentialAfRelatedInstability`
- `score`
- `advice`
- `cardioversionDecision`
- `doseReference`
- `staffAssessment`
- `staffAssessmentHtml`
- `collect`
- `doctorDecisionData`
- `doctorDecisionHtml`

This confirms those source functions were not modified. It is not evidence that the clinical model itself has been validated.

## Not tested on real devices / external services
- Android or iOS PWA install, update takeover, app restart and offline launch on the intended phones.
- Actual WhatsApp message delivery, download destination and attachment import between the doctor's and staff phones.
- Whether a downloaded backup is retained in a separate safe location; a browser cannot verify off-device retention.
- Real patient records or clinical decisions. Do not use patient-identifiable data for this test report.

## Release gate recommendation

Before real-patient use, test the dummy-data scenarios in `CLINICAL_REVIEW.md` on the actual doctor and staff devices, validate file handovers in WhatsApp, and complete the local clinical-governance review. Clinical questions in `CLINICAL_DECISIONS_PENDING.md` remain undecided and were not implemented in this technical release.
