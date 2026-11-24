# Version 1.7 — WhatsApp transfer with readable TXT files

- Replaced routine per-patient JSON sharing with a single app-generated plain-text `.txt` transfer file for both staff-to-doctor and doctor-to-staff workflows.
- TXT contains a readable summary plus a structured transfer payload required for reliable reconstruction of all patient fields, treatment orders, approval information and staff checklist information. The transfer block must remain intact.
- Supported mobile browsers can share the TXT file through the native share sheet; choose WhatsApp. Desktop downloads the TXT file and opens WhatsApp Web with a prepared message; the user attaches the file manually.
- Import now accepts Heartline TXT transfer files and legacy JSON patient handovers.
- Patient export buttons and import instructions now clearly indicate TXT as the routine transfer format.
- Full database JSON backup/restore remains available in Doctor Mode. PDF and full text exports remain readable reference copies.
- Medication dose formulas and prescribing defaults were not changed in this update.
