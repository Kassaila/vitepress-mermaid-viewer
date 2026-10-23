import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { URL } from 'node:url';
import { parseArgs } from 'node:util';

const directory = new URL('../.changeset/', import.meta.url);
const { values } = parseArgs({ options: { tag: { type: 'string', default: 'latest' } } });
const files = await readdir(directory);
const pending = files.filter((file) => file.endsWith('.md') && file !== 'README.md');

assert.equal(
  pending.length,
  0,
  `Apply and commit pending changesets before publishing: ${pending.join(', ')}. Run pnpm release:version first.`,
);
assert.ok(['latest', 'beta'].includes(values.tag), 'Supported release channels: latest, beta.');

const manifests = await Promise.all(
  ['viewer', 'vue', 'vitepress'].map(async (role) =>
    JSON.parse(
      await readFile(new URL(`../packages/${role}/package.json`, import.meta.url), 'utf8'),
    ),
  ),
);

if (values.tag === 'latest') {
  for (const manifest of manifests) {
    assert.ok(
      !manifest.version.includes('-'),
      `Do not publish ${manifest.name}@${manifest.version} as latest.`,
    );
  }
} else {
  assert.ok(
    files.includes('pre.json'),
    'Enter Changesets beta prerelease mode and prepare prerelease versions first.',
  );
  const pre = JSON.parse(await readFile(new URL('pre.json', directory), 'utf8'));

  assert.equal(pre.mode, 'pre');
  assert.equal(pre.tag, 'beta');
  assert.ok(
    manifests.some((manifest) => manifest.version.includes('-beta.')),
    'Apply prerelease version changes before publishing to beta.',
  );
}

console.log(`Release versions are prepared for ${values.tag}; no pending changesets.`);
