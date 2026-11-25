# App smoke test

Run from this app folder with Node.js:

```bash
node tests/smoke.mjs
```

The script checks the static PWA structure, required assets, manifest/service-worker scope, separate app mode, no role selector, no switch-user element and JavaScript syntax. It does not replace real Android/iPhone installation, WhatsApp/file-picker testing or clinical review.
