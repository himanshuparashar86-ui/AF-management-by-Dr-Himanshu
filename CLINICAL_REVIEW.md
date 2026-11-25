# Clinical review checklist — AF Management v1.4
This prototype must be validated by the responsible cardiologist, pharmacy and hospital governance team before patient care use.

- [ ] Validate CHA₂DS₂-VA and CHA₂DS₂-VASc inputs and score thresholds.
- [ ] Validate that only the 2024 ESC AF pathway is present and that no AHA/ACC AF thresholds remain.
- [ ] Validate cardioversion criteria including clinician attribution of instability to AF.
- [ ] Confirm manufacturer-specific synchronized cardioversion energy settings for each local defibrillator and institutional protocol; do not attribute a universal joule setting to ESC 2024.
- [ ] Validate pre/post-cardioversion anticoagulation, TEE pathway, and management of thrombus.
- [ ] Independently validate Cockcroft–Gault calculation and weight selection, especially in obesity, oedema, frailty and unstable renal function.
- [ ] Verify each anticoagulant dose against the current locally approved Indian product information, including P-gp/CYP interactions, age/weight/renal/hepatic criteria, pregnancy, dialysis and bleeding conditions.
- [ ] Verify VKA pathway and INR targets for mechanical valve / rheumatic MS patients.
- [ ] Validate red/orange vital-sign thresholds and emergency staff checklist against local policy.
- [ ] Test all modules with synthetic data only.
- [ ] Implement real authentication, server-side role permissions, encryption, audit logs, backups, retention policy, consent process and penetration/security testing before identifiable patient data is used.

- [ ] Confirm the app displays only the 2024 ESC AF guideline and no parallel AHA/ACC pathway.

- [ ] Validate the staff preparation checklists with nursing leadership and local emergency/cardioversion policy.
- [ ] Ensure no checklist wording authorizes staff to independently decide cardioversion, select medicines/doses, administer sedation or deliver a shock.
- [ ] Validate consent wording and emergency-consent exceptions with hospital policy.
- [ ] Validate Hindi/Hinglish translations with actual staff users before deployment.


## v1.4 staff wizard and contacts validation
- [ ] Validate the mandatory/optional field map with nursing and medical leadership.
- [ ] Verify all Yes/No/Unknown risk-factor selections and the provisional score warning, especially that Unknown is not treated as No.
- [ ] Test page progression on a phone: incomplete required fields must block Next; completed fields must permit Next; Back must retain entries.
- [ ] Verify emergency call links reach the correct intended contact numbers and match the current on-call escalation process.
- [ ] Validate the Hinglish directions and all staff checklist wording with actual staff users.
- [ ] Reconfirm that emergency response is never delayed to complete the app wizard.

- [ ] Validate the v1.5 clinical-instability criteria and thresholds against local emergency SOP; verify isolated hypoxaemia and ECG red flags do not falsely trigger the AF-attribution question or cardioversion preparation.
- [ ] Verify parenteral UFH and enoxaparin protocols, monitoring and dose entry with pharmacy / clinical governance; app intentionally does not auto-calculate doses.
- [ ] Validate available oral VKA choices (warfarin / acenocoumarol) and DOAC options against local formulary.
- [ ] Confirm CBC, KFT, ABG, Troponin I and NT-proBNP options match the local investigation ordering workflow.

- [ ] Confirm the hospital/organisation permits transmission of patient-identifiable clinical data through the selected WhatsApp account and device.
- [ ] Test the desktop flow: JSON download, WhatsApp Web launch, correct recipient selection, manual Document attachment, recipient import.
- [ ] Test supported mobile devices: share sheet includes the JSON file and WhatsApp is available as a target.

- [ ] Verify WhatsApp TXT transfer on the actual clinic desktop/browser and staff mobile devices.
- [ ] Confirm all transfers are sent only to the intended authorised recipient; the TXT file contains identifiable patient information.
- [ ] Retain the structured transfer section intact; do not edit the TXT file after export.


## v1.8 operational validation
- [ ] Confirm each doctor-created staff profile invitation imports on a clean device and selects the correct staff profile.
- [ ] Confirm profile ID ownership filtering and legacy name-based record access.
- [ ] Confirm staff TXT backup restores profile, patient records, orders, checklists and relevant history to a clean device.
- [ ] Confirm Doctor JSON backup includes staff directory and all records on the doctor device.
- [ ] Confirm weekly backup gate blocks normal patient/doctor work after seven days and unlocks only after backup generation.
- [ ] Confirm staff emergency phone links remain available while backup gate is active.
- [ ] Verify staff profile invitations and backups are transferred only to intended recipients; they contain personally identifiable information.
- [ ] Verify actual backup files are stored securely outside the PWA; the app cannot verify where the downloaded file is retained.
- [ ] Test all workflows on actual staff Android phones and the doctor's phone before real-patient use.


## v1.9 technical-only review note
- The v1.9 code changes are limited to import/restore revision safety, backup confirmation, approved-plan invalidation after patient-data edits, wizard draft persistence, schema/integrity checks, storage/print/PWA reliability, transfer-message privacy and reproducible tests.
- The clinical functions fingerprinted in `tests/static-regression.test.js` are required to remain byte-for-byte identical to v1.8. This is an automated regression guard, not proof of clinical validity.
- All questions under `CLINICAL_DECISIONS_PENDING.md` remain undecided and are not code tasks until Dr. Himanshu explicitly approves them.
- Reproducible test instructions and results are in `TEST_REPORT_v1.9.md` and `tests/`.
