# Version 1.4 — Staff entry wizard and emergency call shortcuts

- Added a four-page step-by-step patient entry wizard.
- Added mandatory validation and Next gating for demographics, observations, AF episode/ECG and risk-history fields.
- Added Yes/No/Unknown for clinical risk history; Unknown risk-score criteria are shown as provisional and do not silently count as No for OAC decision support.
- Kept weight, UHID, mobile, onset timestamp, LVEF, creatinine and notes optional at initial entry.
- Added persistent Staff Mode emergency call shortcuts: 9991125014 (Dr. Himanshu Parashar) and 8901431430 (alternate).
- Preserved v1.3 doctor edit/delete, treatment order builder, favourites, approval and JSON handover, full backup JSON/text/PDF and restore.
- Incremented service-worker cache to v14.

This remains a prototype with browser-local data and no secure authentication or automatic synchronization.
