# AF Management v1.9 — Two Separate Installable PWAs

This is the GitHub Pages deployment bundle for Heartline Healthcare LLP. It contains two separate apps:

- `doctor/` — Doctor App, fixed to Dr. Himanshu Parashar, English. Keep its URL private; share it only with the doctor.
- `staff/` — Staff App, Hinglish, fixed to one imported staff profile per installation. Share this URL with staff.

## Deploy to GitHub Pages

Repository: https://github.com/himanshuparashar86-ui/AF-management-by-Dr-Himanshu/

Upload the contents of this ZIP to the repository root, preserving the `doctor/` and `staff/` folders. The root `index.html` intentionally displays only the Staff App link. The Doctor URL is not listed there.

After deployment:

- Doctor App (keep private): https://himanshuparashar86-ui.github.io/AF-management-by-Dr-Himanshu/doctor/
- Staff App (share with staff): https://himanshuparashar86-ui.github.io/AF-management-by-Dr-Himanshu/staff/
- Root landing page (Staff only): https://himanshuparashar86-ui.github.io/AF-management-by-Dr-Himanshu/

## Install

- Android: open the assigned URL in Chrome, then use Install app / Add to Home Screen.
- iPhone: open the assigned URL in Safari, tap Share, then Add to Home Screen.

## Offline and transfers

Both PWAs cache their own app files and store app data locally on that device. There is no cloud database, no server-side user account and no automatic sync. WhatsApp is used for manual TXT profile/patient/treatment transfers and requires internet. Backups should be copied outside the PWA and kept securely.

## PIN and privacy limitation

The local PIN is a basic casual-access barrier. It is not server-side authentication and does not encrypt localStorage or exported files. GitHub Pages serves static public files; the Doctor URL is not protected by server authentication. Keeping the Doctor link private reduces accidental access but is not a security guarantee. Do not use identifiable patient data until an independent security review, encryption, access-control review and hospital governance approval are complete.

## Test folder

Run `node tests/smoke.mjs` from this deployment folder. Each app also contains its own `tests/` folder and can be checked individually. See `TEST_REPORT_v1.9.md` and `TEST_PLAN_v1.9.md`.

Medication dose defaults/formulas are not expanded in v1.9. Doctor must enter and independently verify all doses and instructions; no dose is automatically prescribed.
