# Version 1.2 — language defaults and staff-specific patient visibility

- Removed the Hindi/English language selector.
- Doctor Mode: fixed identity Dr. Himanshu Parashar; fixed English language.
- Staff Mode: fixed Hinglish (Hindi + English mix); staff name remains required to separate records by staff member.
- Staff list, counts, open-record action, export/print dropdown and import are limited to the current staff member's own records.
- Doctor Mode lists all records stored locally and can import records from multiple staff members.
- New records store `enteredBy`; legacy records use `by` for ownership matching.
- Service-worker cache incremented to v12.

## Important privacy limitation
This is client-side filtering by typed staff name, not secure authentication. It cannot stop a person from entering another staff member's name, and local records do not automatically sync between devices. Production use with identifiable patient records requires authenticated staff accounts, server-side access control, encryption in transit and at rest, audit logs, backups and approved governance.
