# v1.9 — Separate Doctor and Staff PWAs

- Split the former combined app into two separately installable PWA builds under `/doctor/` and `/staff/`.
- Doctor build is fixed to Dr. Himanshu Parashar, English; no role selector or switch-user control is shown.
- Staff build is Staff-only, Hinglish; staff must import a doctor-issued profile invitation and the installation binds to one profile. No Doctor Mode, staff directory, doctor decision or treatment approval controls are shown.
- Added local PIN setup/unlock using PBKDF2 via Web Crypto. PIN hashes are device-local and excluded from backups.
- Added separate app-specific localStorage namespaces and service-worker cache prefixes/scopes. Doctor build can migrate legacy v1.8 local records on the same origin.
- Retained four-step patient wizard, mandatory-field validation, risk scores, conditional instability/cardioversion workflow, doctor treatment builder, favourites, edit/delete, WhatsApp TXT handover, backup/restore and weekly mandatory backup gate.
- Staff invitation TXT, staff-owned TXT backup, doctor full JSON backup and manual two-way patient/treatment transfer remain available.
- Share action triggers a separate TXT download first, then requests native file sharing where supported; desktop WhatsApp Web requires manual attachment.
- Added a Staff-only root landing page, app-specific install manifests/icons and a static `tests/` folder.
- Updated service workers to cache both PNG install icons and use separate cache names.

## Not changed

- No cloud database, server-side accounts, or automatic device synchronization.
- No medication dose defaults or formulas were added or changed.
- No clinical pathway was independently validated in this build.
