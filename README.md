# AF Management by Dr. Himanshu Parashar — Heartline Healthcare LLP

Free, mobile-first Progressive Web App prototype (v1.4).

## v1.1 changes
- Doctor Mode opens with the fixed profile **Dr. Himanshu Parashar** and English. Doctor name and language are not asked repeatedly.
- Staff Mode requests the staff member's name; language is fixed to Hinglish and there is no language selector.
- Patient details open in a dedicated detail panel with delegated click handling.
- Imported patient records open immediately after a successful JSON import in Doctor Mode.
- When the doctor device has no records, the patient list explains how to import the JSON handover from staff.
- Previous staff preparation workflow and ESC 2024-only clinical decision support are retained.

## Patient handover and record access
This prototype stores records in the browser's local storage on each device. It does **not** synchronise staff and doctor devices automatically. Staff must export a patient JSON file and send it using the organisation-approved channel. On the doctor's device, open **WhatsApp / Import**, choose the received JSON file, and press **Import JSON**. The imported patient record then appears in **Patients** and is opened automatically.

## Running
Serve the repository root over HTTPS (for example, GitHub Pages) or localhost. Open the site and install it as a PWA if desired. After replacing files, refresh the website; an installed PWA may require closing/reopening or refreshing after the service-worker cache update.

## Clinical scope
- The app uses the **2024 ESC AF guideline framework only**; it does not present a parallel AHA/ACC pathway.
- It calculates CHA₂DS₂-VA / CHA₂DS₂-VASc, screens entered vital signs, provides clinician-facing cardioversion and long-term anticoagulation decision support, and calculates Cockcroft–Gault CrCl from entered age, sex, weight and serum creatinine.
- Drug-dose references are educational prompts and must be checked against current locally approved Indian product information before prescribing.
- The ESC 2024 framework does not specify one universal cardioversion joule setting; follow the defibrillator manufacturer and approved hospital protocol.

## Critical limitations
- This is a clinical decision-support prototype, not a validated medical device or production EHR.
- Role selection is not secure authentication. The doctor profile is a fixed convenience profile, not proof of identity or a security control.
- Data are stored locally per browser/device. There is no real-time sync or cloud database.
- JSON exports and print/PDF outputs are not encrypted. Do not use identifiable patient records until approved authentication, access control, encryption, audit, backups, retention and security policies are implemented.
- Do not delay emergency escalation while using the app. Staff must activate the hospital emergency response if a patient deteriorates.
- Staff must not independently decide cardioversion, shock delivery, medication selection, dosing, sedation or anticoagulation.
- Validate thresholds, workflow wording and checklists through hospital clinical governance before clinical deployment.


## Version 1.2 — fixed language defaults and staff-specific record lists
- No language selector is shown anywhere.
- Doctor Mode always opens as Dr. Himanshu Parashar, in English.
- Staff Mode always uses Hinglish (Hindi-English mix); staff member name is still requested to distinguish staff records.
- Staff patient list, patient detail access, transfer dropdown, exports and print actions are filtered to records entered by the signed-in staff name.
- Doctor Mode shows all records stored on that browser/device, including records imported from multiple staff members.
- New records store `enteredBy` as well as the legacy `by` staff name. Older records use the existing `by` field for ownership matching.

**Privacy limitation:** Staff-name filtering is a prototype workflow filter, not secure authentication or authorization. A person can type another staff member's name, and browser local storage is not a protected shared database. It does not synchronize across devices. Do not use real patient data as a privacy-controlled production system until individual authenticated accounts, server-side authorization, encryption, audit logging and secure backups are implemented.


## Version 1.3 — doctor record management, treatment orders and full backup
- Doctor Mode remains fixed as Dr. Himanshu Parashar, English; Staff Mode remains Hinglish with no language selector.
- Doctor can edit any patient assessment or permanently delete a record after confirmation. Edit/delete actions are recorded in a local audit trail.
- Doctor Mode includes a click-based treatment order builder: choose pathway, category, medicine/order, then enter the doctor's own dose, route, dilution, frequency, duration and staff instructions.
- No doses are pre-filled or auto-prescribed. The doctor must review and approve the order set. Approved orders can be shared as a doctor-approved JSON handover for staff to import.
- Staff Mode displays the doctor-approved treatment orders and preparation checklist. Staff cannot change the plan; the staff import accepts approved plan updates only when the patient owner matches and the transfer is marked as doctor-approved by the fixed doctor profile.
- Doctor Mode includes complete data export as JSON, text and a print-to-PDF view. Full JSON backup includes all records, saved favourite regimens and local audit history.
- Doctor can restore a full JSON backup by merging with existing records or replacing the local record set.
- Favourite order sets are stored locally on the doctor device and can be loaded into another patient plan.

## v1.3 critical limitations
- This remains a browser-local prototype. The doctor-approved JSON share/import flow is manual, not live synchronization.
- The fixed doctor profile and staff-name ownership filter are not secure authentication. A staff member can enter another staff name; local storage does not provide server-side access control.
- PDF/text are readable exports; only the full JSON backup can restore the app data. Store backups securely and restrict sharing.
- All patient records and favourite regimens remain on each browser/device unless manually exported/imported. Backups should be made regularly and stored outside the device.
- Treatment order fields are intentionally blank. The app does not supply default medication doses. The doctor must enter and verify each order, dose and instruction against patient factors, ESC 2024, locally approved Indian product information and hospital policy.
- Before clinical deployment with identifiable patient data, implement authenticated accounts, server-side authorization, encryption in transit/at rest, secure audit logging, retention policy, tested backups and clinical governance validation.


## Version 1.4 — guided patient entry and emergency contacts
- Staff patient entry is a four-step wizard: (1) demographics, (2) clinical observations/AF episode/ECG, (3) stroke-risk and clinical history with live CHA₂DS₂-VA / CHA₂DS₂-VASc display, and (4) staff directions and final review.
- Required fields block progression until valid: patient name, age, sex; heart rate, systolic BP, diastolic BP, SpO₂, symptoms, AF duration, onset reliability, ECG status, QRS and WPW status; hypertension, diabetes, heart failure/LV dysfunction, prior stroke/TIA/embolism, vascular disease, bleeding history, and mechanical valve/moderate-severe rheumatic MS.
- Where appropriate, staff can select Unknown / unable to confirm. Unknown CHA₂DS₂-VA score components remain explicitly provisional and are not silently counted as No for anticoagulation decision support.
- Weight, UHID, mobile, episode onset timestamp, LVEF, creatinine and free-text notes are optional at initial entry; some may be needed later for a doctor-specific treatment decision or dose review.
- Staff Mode displays persistent tap-to-call emergency contacts: Dr. Himanshu Parashar (9991125014) and alternate contact (8901431430). Emergency escalation must not wait for form completion.
- Doctor Mode remains Dr. Himanshu Parashar, English; Staff Mode remains Hinglish; no language selector.
- All v1.3 features are retained: doctor edit/delete, treatment-order builder, saved favourite regimens, approve/send-to-staff JSON, staff approved-order view, complete JSON/text/PDF backup and JSON restore.

## v1.4 clinical and technical notes
- The app still stores data in local browser storage and does not synchronize devices. Staff-to-doctor and doctor-to-staff transfer remains manual via JSON.
- The emergency phone numbers are user-provided contact shortcuts, not an emergency-services dispatch system. Check both numbers and local emergency escalation policy before use.
- Required-field rules and the wizard have not been clinically validated. Use synthetic data for testing and have clinical governance/nursing leadership review before any identifiable patient data is entered.
- Unknown score criteria trigger a provisional-score warning and suppress score-threshold anticoagulation output; a clinician must clarify the history.
