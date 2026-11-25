# AF Management v1.9 — Separate Doctor and Staff PWAs

Both applications are offline-first Progressive Web Apps under one GitHub Pages repository. There is no cloud database and no automatic synchronization. Data moves using app-generated TXT files through WhatsApp or the device file picker.

## Deployment to the existing GitHub Pages repository

Repository: https://github.com/himanshuparashar86-ui/AF-management-by-Dr-Himanshu/

Upload the `doctor/` folder from the Doctor ZIP into the repository root as `doctor/`, and the `staff/` folder from the Staff ZIP into the repository root as `staff/`. Preserve the folder names and all filenames. Do not put the files inside an additional nested folder.

After GitHub Pages deploys, the two install links will be:

- Doctor App: https://himanshuparashar86-ui.github.io/AF-management-by-Dr-Himanshu/doctor/
- Staff App: https://himanshuparashar86-ui.github.io/AF-management-by-Dr-Himanshu/staff/

Open each link in Chrome on Android or Safari on iPhone and use the browser's **Install app / Add to Home Screen** action. Each folder has its own manifest, service worker scope, cache name, and local-storage namespace so the two PWAs do not share their local app data.

## Roles and app separation

- Doctor build: fixed as Dr. Himanshu Parashar, English; includes patient review, edit/delete, decision panel, treatment-order builder, favourites, staff profile creation, import/export, and full JSON backup/restore.
- Staff build: fixed Staff-only Hinglish interface; requires import of a doctor-created staff profile invitation; has no Doctor Mode, no role selector, no switch-user control, no staff directory, and no doctor approval controls. It can enter its own patient assessments, share patient TXT files, import doctor-approved plan updates, and make/restore its own TXT backup.
- Each app requires a local PIN on that device. On first use, the owner creates a 4–8 digit PIN. Staff import their own profile invitation before setting the PIN. The staff app binds to one staff profile; there is no in-app profile switching.

## Data transfer

- Doctor creates a staff profile and shares its invitation TXT to that staff member.
- Staff downloads the invitation from WhatsApp and imports it from the device file picker in Staff App.
- Staff creates a patient handover TXT and shares it with the doctor.
- Doctor downloads the TXT attachment and imports it in Doctor App.
- Doctor approves a treatment plan and shares the approved plan TXT with the staff member.
- Staff downloads the approved plan TXT and imports it in Staff App.
- The app first triggers a local TXT download, then uses the native file share sheet where supported. On desktop, WhatsApp Web opens and the user attaches the downloaded file manually as a Document.

Browser limitation: the PWA can trigger a download and request the native share sheet, but the browser/OS controls the final save location and whether the native share sheet can attach a file. On iOS, choose **Save to Files** when prompted if you need a separate stored copy. On Android, the browser normally saves to Downloads. Desktop WhatsApp Web requires manual attachment.

## Backups

- Doctor: full JSON backup and restore (all records stored in Doctor App, staff directory, favourites, and audit trail). PDF and text exports are readable copies only.
- Staff: restorable TXT backup and restore (bound staff profile and that staff profile's patient records, orders, checklists and relevant history).
- Mandatory weekly backup gate: after seven days without a generated backup, normal app use is locked until the relevant full backup is generated. Staff emergency phone links remain visible on the backup gate.
- The browser can verify that a download was triggered; it cannot prove the file was saved to a safe external location. Copy backup files to a secure location separate from the phone/PWA.

## Local PIN limitation

The PIN is hashed locally using PBKDF2 via Web Crypto and prevents casual opening of the app. This static, offline PWA is not equivalent to server-side authentication; a technically capable user with device/browser access may bypass client-side controls or clear local storage. Keep the Doctor App URL and device private. Do not use this as a secure multi-user EHR or store identifiable patient data until an independent security review, encryption of patient files/backups, and clinical governance approval are completed.

## Clinical safety

- The single AF guideline framework is 2024 ESC AF guidance only. No parallel AHA/ACC AF pathway is shown.
- AF on ECG alone is not a red flag. AF-attributable instability question appears only when qualifying instability indicators exist. Stable AF does not show DC shock/cardioversion wording in the staff assessment. Staff sees possible DC cardioversion preparation only when clinical instability is present; staff must call doctor/emergency team and prepare, not independently deliver shock or decide treatment.
- Staff cannot choose drugs, doses, cardioversion, sedation, or anticoagulation. Doctor enters and approves individual orders; the app does not pre-fill doses.
- Medication doses/formulas were not revised in this release. Verify every prescription against current locally approved Indian product information and hospital protocol.
- The app is a clinical workflow prototype, not a validated medical device or production EHR. Use synthetic data and complete local clinical validation before any patient care use.
- Emergency escalation must not be delayed to complete an app form or backup.


**Keep the Doctor App URL private.** It is not protected by server authentication; a local PIN is only a casual-access barrier. Do not share the Doctor URL with staff.

Medication dose defaults/formulas are not expanded in v1.9. Doctor must enter and independently verify all doses and instructions; no dose is automatically prescribed.
