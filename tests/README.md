# v1.9 test folder

This folder contains static smoke tests and a manual acceptance checklist for the split Doctor and Staff PWAs.

## Run static tests

From the combined deployment folder, run:

```bash
node tests/smoke.mjs
```

No npm packages are required. The test checks both app builds, their HTML, manifests, icons, service-worker scopes/cache names, script syntax, separate app namespaces, and presence/absence of role-switch controls.

## Manual tests still required on real devices

Use dummy data only. Install each app separately from the deployed HTTPS URLs, then verify offline launch, Android/iOS file download/share behaviour, WhatsApp attachment, device file-picker import, and backup restore. Desktop browser simulation does not prove Android/iOS OS-level behaviour.
