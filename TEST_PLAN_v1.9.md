# v1.9 acceptance test plan (use dummy data only)

## Install / PWA
- [ ] Deploy `doctor/` and `staff/` folders to GitHub Pages repository root.
- [ ] Open each URL over HTTPS; verify each app can be installed separately.
- [ ] Install both on the same device; verify each opens its own app name and cached assets.
- [ ] Load each app once online; then test offline launch.

## Doctor App
- [ ] First launch asks for local PIN setup; later launch asks for PIN.
- [ ] No role selector or Staff Mode option is visible.
- [ ] Wrong PIN does not open the app.
- [ ] Create multiple staff profiles and share individual profile invitations.
- [ ] Import staff patient TXT; verify patient record appears.
- [ ] Edit/delete any imported patient record with confirmation.
- [ ] Doctor Decision Panel, treatment builder, favourites and approval remain available.
- [ ] Import a staff backup only through an appropriate recovery workflow (doctor full-backup restore remains JSON).
- [ ] Full JSON backup/restore, text export and PDF print view work.
- [ ] Weekly backup gate blocks normal use when due and unlocks after full JSON export.

## Staff App
- [ ] No role selector, Doctor Mode, Manage Staff, or switch-user control is visible.
- [ ] First launch requires staff invitation TXT or own staff backup TXT import.
- [ ] App binds to one staff profile; importing a different profile is rejected.
- [ ] PIN setup/unlock works; wrong PIN does not open app.
- [ ] Four-step patient wizard blocks Next on incomplete mandatory fields.
- [ ] Stable AF assessment does not mention shock/DC cardioversion.
- [ ] Clinical instability shows emergency escalation and preparation for possible DC cardioversion; staff is not authorised to shock or choose treatment.
- [ ] Staff sees only records matching bound Staff ID.
- [ ] Staff can share patient TXT to doctor and import doctor-approved treatment TXT.
- [ ] Staff TXT backup includes bound profile and own patient records; restore succeeds on clean Staff App install.
- [ ] Weekly backup gate blocks normal use when due and unlocks after staff TXT backup generation.

## Cross-app transfer
- [ ] Doctor profile TXT → Staff App import.
- [ ] Staff patient TXT → Doctor App import.
- [ ] Doctor-approved treatment TXT → same staff's Staff App import.
- [ ] Mismatched staff profile ID is rejected in Staff App.
- [ ] On Android, sharing first triggers download and native share sheet exposes the TXT document.
- [ ] On iPhone, verify file can be saved to Files and then shared/imported.
- [ ] Desktop WhatsApp Web opens; manually attach downloaded TXT as Document.
- [ ] Import uses device file picker and previews/validates format before applying.

## Important limitations to note during testing
- Local PIN is a casual-access lock only, not robust account authentication.
- Separate app localStorage means records do not auto-sync; manual WhatsApp transfer remains necessary.
- Download location is browser/OS controlled; the app cannot force iOS Safari to save silently into a specific folder.
- Weekly backup gate only verifies generation/download trigger, not safe off-device storage.
- No actual WhatsApp send is automated or confirmed by the app.
