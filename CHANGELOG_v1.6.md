# Version 1.6 — WhatsApp handover fix

- Replaced the failed desktop file-share attempt with a WhatsApp-oriented flow.
- On desktop, the patient handover / doctor-approved plan JSON is downloaded and WhatsApp Web opens with a pre-filled message; the user attaches the downloaded JSON from Downloads as a Document.
- On supported mobile browsers, native file sharing is used so WhatsApp can be selected as the target and the JSON file can be passed with the message.
- The doctor approved-plan action is now labelled “Share approved plan via WhatsApp”.
- Added an on-screen status area, direct Open WhatsApp fallback link and clear attachment instructions.
- JSON Export remains separately available. No automatic WhatsApp API, automatic recipient selection or silent file upload is claimed.

All v1.5 clinical logic and v1.4 staff/doctor functions are retained.
