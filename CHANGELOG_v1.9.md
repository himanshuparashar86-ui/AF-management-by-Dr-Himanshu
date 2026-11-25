# AF Management v1.9 — Technical Reliability Update

**Baseline:** v1.8 offline-first PWA.

## Implemented
- Added record/profile revision metadata and stale-import protection for patient handovers, staff profiles, staff backups and full-backup merge operations.
- Added conflict confirmations for ambiguous legacy/equal-revision imports and for replacing an existing doctor-approved record.
- Added treatment-plan revision and approval timestamp visibility in the staff patient view.
- Patient-data edits after approval now mark the previous plan `Needs re-approval`; staff are shown an outdated-plan warning and are not shown the old approved order workflow as current.
- Weekly backup gate no longer unlocks merely because a download was triggered. User must confirm seeing the generated file; cancellation leaves the gate locked.
- Added unique timestamp/randomized export filenames.
- Added staff-scoped autosaved wizard drafts and resume behavior after app interruption; includes pending-record edit identity.
- Added schema/type checks, duplicate-ID checks and versioned SHA-256 integrity checks for new TXT transfer/profile/backup payloads. Legacy formats remain supported where documented.
- Added explicit handling for blocked print popups.
- Added local-storage quota/write error handling and cross-tab storage-change detection.
- Changed service worker to cache-first with bounded network refresh, offline navigation fallback and a new-version banner.
- Added 192/512 PNG app icons and Apple touch icon; requests persistent storage where supported.
- Reduced WhatsApp message text to a record reference/plan revision; patient information remains in the attached TXT file.
- Staff may correct their own Pending review records. Staff backup excludes doctor favourites and unrelated data.
- Added reproducible unit/static and browser smoke-test scripts, plus a test report.

## Explicitly not changed
- No clinical calculation, score, threshold, medication selection, dose formula, dose-reference text, cardioversion logic, or clinical pathway wording was changed.
- ESC 2024 remains the only AF guideline framework represented by the application.
- No cloud backend, internet sync, or automatic cross-device synchronisation was added.
- No staff PIN/security authentication was added.
- The cardiologist/pharmacy questions in `CLINICAL_DECISIONS_PENDING.md` remain pending and require Dr. Himanshu's explicit decision before any implementation.

## Important limitations
- Manual WhatsApp/file transfer remains necessary between devices.
- SHA-256 detects accidental alteration but does not authenticate the sender and does not encrypt the file.
- Download confirmation cannot prove that the exported file was saved to a separate safe location.
- Offline profile deactivation only takes effect on another device after that device imports the newer profile file.
