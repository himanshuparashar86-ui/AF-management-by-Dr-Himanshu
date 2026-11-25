# Version 1.8 — Offline staff profiles and mandatory backup

- Retains all v1.7 clinical workflows, doctor decision panel, treatment builder, favourites, TXT WhatsApp patient handover and import.
- Doctor Mode can create named staff profiles and share an individual staff profile invitation TXT file through WhatsApp.
- Staff imports their profile invitation on first use, then chooses their imported profile at login. There is no cloud database or automatic synchronisation.
- New patient records carry the staff profile ID as well as the staff name; staff record visibility checks profile ID where available.
- Staff can create and restore a complete staff backup TXT containing their profile and their own records, checklists, relevant audit history and local treatment data. It can restore the staff profile on a newly installed PWA.
- Doctor full JSON backup now includes the staff profile directory as well as all locally stored patient records and associated app data.
- Weekly backup gate: once seven days have elapsed since the last generated backup (or initial setup), the app is locked to normal use until the appropriate Doctor JSON or Staff TXT backup is generated. Emergency call links remain accessible on the staff gate.
- The app remains offline-first and device-local. WhatsApp transfer requires connectivity only when sending/receiving the file.

## Important limitations
- Staff profile invitation files are manually shared. Profile changes or deactivation do not reach another device unless the updated profile file is imported there.
- Role/profile selection is not secure authentication; browser-local storage is not a secure credential vault. No server-side access enforcement exists.
- The app can confirm that the browser download was triggered, but cannot verify that the user stored the file safely outside the PWA.
- Weekly gate runs when the app is open and checks on focus/periodically. A fully closed offline PWA cannot display a scheduled system notification without platform notification support.
- Routine patient handover and approved plan transfer remain app-generated TXT files; doctor full restore remains JSON, staff full restore is a structured TXT backup.
