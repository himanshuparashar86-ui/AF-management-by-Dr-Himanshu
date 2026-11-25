# v1.9 — Separate Doctor and Staff Progressive Web Apps

- Split the former combined app into two separately installable PWA builds under `/doctor/` and `/staff/`.
- Doctor build is fixed to Dr. Himanshu Parashar; no role selector is shown.
- Staff build is staff-only; no Doctor Mode, role selector, switch-user control, staff directory, doctor panel, or doctor approval controls are shown.
- Added local PIN setup/unlock (PBKDF2 via Web Crypto) to both builds. Staff app binds to one imported staff profile on that installation.
- Added separate per-app local-storage namespaces and separate service-worker cache prefixes/scopes to avoid Doctor/Staff local data and offline-cache collisions on the same GitHub Pages origin.
- Retained v1.8 staff profiles, four-step wizard, clinical decision workflow, treatment-order builder, favourite regimens, WhatsApp TXT transfer, backup/restore and mandatory weekly backup gate.
- WhatsApp share now triggers a device file download first, then opens native file sharing when available; desktop continues with download + WhatsApp Web instructions.
- Updated app titles, manifests, PWA scopes, service-worker cache versions, footers and deployment instructions.

## Not changed
- No medication dose defaults or formulas were added or changed.
- No cloud database, server synchronization, or automatic device synchronization was added.
- No clinical pathway was independently validated in this build.
