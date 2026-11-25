import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const combined = fs.existsSync(path.join(root, 'doctor', 'index.html')) && fs.existsSync(path.join(root, 'staff', 'index.html'));
if (combined) {
  const landing = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.match(landing, /href="\.\/staff\/"/, 'Root landing page should lead to Staff App');
  assert.doesNotMatch(landing, /href="\.\/doctor\/"/i, 'Root landing page must not expose Doctor App link');
}
const modes = combined ? ['doctor', 'staff'] : [null];
for (const folderMode of modes) {
  const dir = folderMode ? path.join(root, folderMode) : root;
  const htmlProbe = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const mode = folderMode || (htmlProbe.includes('app-doctor') ? 'doctor' : 'staff');
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const js = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  const sw = fs.readFileSync(path.join(dir, 'sw.js'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.webmanifest'), 'utf8'));
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(x => x[1]);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  assert.equal(duplicates.length, 0, `${mode}: duplicate HTML IDs`);
  assert.match(js, new RegExp(`const APP_MODE = '${mode}'`), `${mode}: fixed build mode`);
  assert.doesNotMatch(html, /<select[^>]+id="role"/i, `${mode}: no role selector`);
  assert.doesNotMatch(html, /id="switch"/, `${mode}: no switch-user control`);
  assert.match(js, /__\$\{APP_MODE\}/, `${mode}: app-specific localStorage namespace`);
  assert.match(sw, new RegExp(`heartline-af-${mode}-v19`), `${mode}: unique service-worker cache`);
  assert.match(sw, /icon-192\.png/);
  assert.match(sw, /icon-512\.png/);
  for (const name of ['index.html', 'app.js', 'styles.css', 'sw.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png']) {
    assert.ok(fs.existsSync(path.join(dir, name)), `${mode}: missing ${name}`);
  }
  assert.equal(manifest.scope, './', `${mode}: manifest scope`);
  assert.equal(manifest.start_url, './', `${mode}: manifest start_url`);
  const check = spawnSync('node', ['--check', path.join(dir, 'app.js')], { encoding: 'utf8' });
  assert.equal(check.status, 0, `${mode}: JavaScript syntax error: ${check.stderr}`);
  if (mode === 'doctor') {
    assert.match(html, /Doctor App/);
    assert.match(html, /Dr\. Himanshu Parashar/);
    assert.match(js, /Manage Staff|Create Staff Profile|createStaffProfile/);
  } else {
    assert.match(html, /Staff App/);
    assert.match(html, /Import your doctor-issued staff profile/);
    assert.doesNotMatch(html, /Doctor Mode · English/);
  }
  results.push(`${mode}: PASS`);
}
console.log(results.join('\n'));
console.log(`Static smoke tests passed for ${results.length === 2 ? 'both builds' : 'this app'}. This does not replace real-device PWA/WhatsApp testing or clinical validation.`);
