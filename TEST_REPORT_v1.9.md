# AF Management v1.9 — Test Report

## Automated/static checks

- `node tests/smoke.mjs` passed for the combined bundle and individually for the Doctor and Staff app folders.
- `node --check` passed for both `app.js` files.
- Each app has one HTML doctype, no duplicate element IDs, no visible role selector, and no switch-user control.
- All referenced local assets exist; both manifests parse with relative `./` start URL and scope.
- Doctor and Staff use distinct service-worker cache names and local-storage namespaces.
- Both PNG PWA icons are included in the service-worker offline asset cache list.
- Root landing page exposes the Staff App link only; it does not list the Doctor App route.

## Browser workflow simulation (synthetic data)

A Chromium in-page harness used mock localStorage and a mock WebCrypto provider. It exercised:

- Doctor PIN creation, reload, wrong PIN rejection, and correct PIN unlock.
- Doctor staff profile creation and invitation TXT download.
- Staff invitation import, one-profile binding, and Staff PIN setup.
- Staff four-step patient wizard submission and TXT handover download.
- Doctor import of staff handover, opening a patient record, decision panel, edit and delete controls.
- Doctor full JSON backup download.
- Staff TXT backup download and restore into a clean Staff App context, including restoration of the staff profile and a patient record.
- Doctor weekly backup lock, full JSON backup generation and app unlock.
- Staff weekly backup lock, emergency contact visibility, TXT backup generation and app unlock.
- Clinical display conditions: stable assessment contains no DC cardioversion wording; isolated low SpO₂ uses respiratory guidance only; hypotension instability presents possible DC preparation instructions.
- Requested anticoagulant, rate/rhythm-control and investigation options are present in the Doctor build.
- No browser page errors were recorded during the main browser workflow run.

## Not tested on physical devices

- Actual GitHub Pages deployment and PWA installation on Android/iOS.
- Offline relaunch after a real service-worker installation.
- Android Downloads and iOS Files behavior.
- Actual WhatsApp share-sheet attachment, manual WhatsApp Web attachment, and native file-picker import.
- Clinical correctness of scores/pathways/thresholds or medication dosing; no medicine dose formulas were updated in v1.9.
- Independent security review or protection against deliberate client-side bypass.

This report documents engineering smoke tests only. It is not clinical validation, medical-device certification, security certification, or evidence of successful WhatsApp delivery. Use synthetic data during acceptance testing.
