# AF Management v1.3

- Doctor-only edit and delete controls for any patient record, with delete confirmation and local audit events.
- Click-based treatment order builder with category, medicine/order, manual dose, route, dilution/infusion, frequency, duration and staff instructions.
- Favourite regimen save/load on the doctor device. No default doses or automatic prescribing.
- Doctor approval saves a structured plan and makes it visible to staff.
- Doctor-approved JSON order handover can be shared; staff can import it only for a patient owned by that staff identity.
- Full backup export for all local patient records in JSON, text and print-to-PDF formats.
- Full JSON backup restore supports merge or replace.
- Backup contains records, in-progress treatment drafts, favourite regimens and local audit trail.
- Service-worker cache advanced to v13.

## Testing notes

The app remains a local-storage prototype. Cross-device transfer remains manual through JSON files. This build was checked for JavaScript syntax, HTML structure, JSON transfer/backup handler presence and ZIP integrity; clinical use still requires workflow and security validation.
