import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { checkConsumerBrowser } from './check-consumer-browser.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { values } = parseArgs({
  options: {
    offline: { type: 'boolean', default: false },
    keep: { type: 'boolean', default: false },
    mermaid: { type: 'string' },
    vue: { type: 'string' },
    vitepress: { type: 'string' },
  },
});
const consumerNode = process.env.CONSUMER_NODE || process.execPath;
const base = await mkdtemp(join(tmpdir(), 'mermaid-viewer-consumers-'));
const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));
const writeJson = (path, value) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
const manifests = {};
const tarballs = {};
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const environment = { ...process.env, NODE_PATH: '' };

const run = (command, args, cwd) => {
  const display = args.includes('-e') ? '(public exports and SSR)' : args.join(' ');

  console.log(
    `[packed:${dirname(cwd) === base ? cwd.slice(base.length + 1) : 'pack'}] ${command} ${display}`,
  );
  execFileSync(command, args, { cwd, stdio: 'inherit', env: environment });
};
const install = (cwd) =>
  run(
    pnpm,
    [
      'install',
      '--no-frozen-lockfile',
      '--ignore-scripts',
      '--strict-peer-dependencies',
      ...(values.offline ? ['--offline'] : []),
    ],
    cwd,
  );
const runNode = (cwd, source) => run(consumerNode, ['--input-type=module', '-e', source], cwd);
const runBin = (cwd, name, args) =>
  run(consumerNode, [join(cwd, 'node_modules', ...name.split('/')), ...args], cwd);

const checkInstalledPackages = async (cwd, roles) => {
  const names = roles.map((role) => manifests[role].name);

  assert.ok((await realpath(join(cwd, 'node_modules', names[0]))).startsWith(base));
  runNode(
    cwd,
    `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
let resolve = createRequire(import.meta.url);
for (const name of ${JSON.stringify(names)}) {
  const entry = resolve.resolve(name);
  assert.ok(entry.startsWith(${JSON.stringify(base)}), name + ' escaped its isolated consumer');
  resolve = createRequire(entry);
}
`,
  );
};

let succeeded = false;

try {
  console.log(`Packed consumers: ${base}; runtime: ${consumerNode}`);
  await mkdir(join(base, 'tarballs'));

  for (const role of ['viewer', 'vue', 'vitepress']) {
    const directory = join(root, 'packages', role);
    const manifest = await readJson(join(directory, 'package.json'));

    manifests[role] = manifest;
    tarballs[manifest.name] = join(base, 'tarballs', `${manifest.name}-${manifest.version}.tgz`);

    run(pnpm, ['--dir', directory, 'pack', '--pack-destination', join(base, 'tarballs')], root);

    const contents = execFileSync('tar', ['-tzf', tarballs[manifest.name]], { encoding: 'utf8' });
    const packed = JSON.parse(
      execFileSync('tar', ['-xOzf', tarballs[manifest.name], 'package/package.json'], {
        encoding: 'utf8',
      }),
    );

    assert.doesNotMatch(JSON.stringify(packed.dependencies || {}), /workspace:/);
    assert.match(contents, /package\/README.md/);
    assert.match(contents, /package\/LICENSE/);
    assert.match(contents, /package\/CHANGELOG.md/);

    for (const entry of Object.values(packed.exports)) {
      const files =
        typeof entry === 'string' ? [entry] : JSON.stringify(entry).match(/\.\/dist\/[^" ]+/g);

      assert.ok(files?.length);

      for (const file of files)
        assert.ok(
          contents.split('\n').includes(`package/${file.slice(2)}`),
          `Missing export ${file}`,
        );
    }

    const css = execFileSync('tar', ['-xOzf', tarballs[manifest.name], 'package/dist/style.css'], {
      encoding: 'utf8',
    });

    assert.match(css, /\.mv-diagram/);
    assert.match(css, /--mv-/);

    if (role === 'vitepress') assert.match(css, /--vp-c-/);

    const dependencyRole = role === 'vitepress' ? 'vue' : role === 'vue' ? 'viewer' : undefined;

    if (dependencyRole) {
      const dependency = manifests[dependencyRole];

      assert.equal(packed.dependencies[dependency.name], `^${dependency.version}`);
      const entry = role === 'vitepress' ? 'Mermaid.js' : 'index.js';
      const code = execFileSync(
        'tar',
        ['-xOzf', tarballs[manifest.name], `package/dist/${entry}`],
        { encoding: 'utf8' },
      );

      assert.ok(code.includes(dependency.name), `Missing external import of ${dependency.name}`);
      assert.doesNotMatch(
        code,
        /mermaidViewerStaging/,
        'Core implementation was bundled into an adapter',
      );
    }
  }

  const overrides = Object.fromEntries(
    Object.entries(tarballs).map(([name, file]) => [name, `file:${file}`]),
  );
  const workspace = { packages: ['.'], overrides, autoInstallPeers: false };
  const runtime = {
    mermaid:
      values.mermaid || process.env.CONSUMER_MERMAID || manifests.vue.devDependencies.mermaid,
    vue: values.vue || process.env.CONSUMER_VUE || manifests.vue.devDependencies.vue,
    vitepress:
      values.vitepress ||
      process.env.CONSUMER_VITEPRESS ||
      manifests.vitepress.devDependencies.vitepress,
  };

  for (const role of ['vanilla', 'vue']) {
    const cwd = join(base, role);

    await cp(join(root, 'examples', role), cwd, {
      recursive: true,
      filter: (path) => !['node_modules', 'dist'].includes(path.split(/[\\/]/).at(-1)),
    });
    const manifest = await readJson(join(cwd, 'package.json'));

    for (const [name, value] of Object.entries(manifest.dependencies)) {
      if (value.startsWith('workspace:')) manifest.dependencies[name] = overrides[name];

      if (runtime[name]) manifest.dependencies[name] = runtime[name];
    }

    if (role === 'vue') manifest.devDependencies['@vue/server-renderer'] = runtime.vue;

    await writeJson(join(cwd, 'package.json'), manifest);
    await writeJson(join(cwd, 'pnpm-workspace.yaml'), workspace);
    const tsconfig = await readJson(join(cwd, 'tsconfig.json'));
    const shared = await readJson(join(root, 'tsconfig.base.json'));

    delete tsconfig.extends;
    tsconfig.compilerOptions = { ...shared.compilerOptions, ...tsconfig.compilerOptions };
    await writeJson(join(cwd, 'tsconfig.json'), tsconfig);
    install(cwd);

    if (role === 'vue') {
      await writeFile(
        join(cwd, 'src/hydrate.ts'),
        `import { createSSRApp, h } from 'vue';
import { MermaidViewer } from 'vue-mermaid-viewer';
import 'vue-mermaid-viewer/style.css';
createSSRApp({ render: () => h(MermaidViewer, { source: 'graph TD; A[SSR hydration] --> B[Packed viewer]' }) }).mount('#app');
`,
      );
      await writeFile(
        join(cwd, 'vite.hydrate.config.ts'),
        `import { mergeConfig } from 'vite';
import config from './vite.config';
export default mergeConfig(config, { build: { rolldownOptions: { input: { main: 'index.html', hydrate: 'hydrate.html' } } } });
`,
      );
      runNode(
        cwd,
        `import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import { MermaidViewer } from 'vue-mermaid-viewer';
import { writeFileSync } from 'node:fs';
const html = await renderToString(createSSRApp({ render: () => h(MermaidViewer, { source: 'graph TD; A[SSR hydration] --> B[Packed viewer]' }) }));
writeFileSync('hydrate.html', '<!doctype html><html><head><meta charset="utf-8"></head><body><div id="app">' + html + '</div><script type="module" src="/src/hydrate.ts"></script></body></html>');
`,
      );
    }

    await checkInstalledPackages(cwd, role === 'vue' ? ['vue', 'viewer'] : ['viewer']);
    runBin(cwd, role === 'vue' ? 'vue-tsc/bin/vue-tsc.js' : 'typescript/bin/tsc', ['--noEmit']);
    run(consumerNode, ['ssr.mjs'], cwd);
    runBin(cwd, 'vite/bin/vite.js', [
      'build',
      ...(role === 'vue' ? ['--config', 'vite.hydrate.config.ts'] : []),
    ]);
  }

  const cwd = join(base, 'vitepress');

  await mkdir(join(cwd, '.vitepress'), { recursive: true });
  await writeJson(join(cwd, 'package.json'), {
    name: 'packed-vitepress-consumer',
    private: true,
    type: 'module',
    dependencies: {
      'mermaid': runtime.mermaid,
      'vitepress': runtime.vitepress,
      'vitepress-mermaid-viewer': overrides['vitepress-mermaid-viewer'],
      'vue': runtime.vue,
    },
    devDependencies: {
      '@types/node': manifests.vitepress.devDependencies['@types/node'],
      ...(runtime.vitepress.startsWith('1.') ? { 'search-insights': '^2.17.3' } : {}),
      'typescript': manifests.vitepress.devDependencies.typescript,
    },
  });
  await writeJson(join(cwd, 'pnpm-workspace.yaml'), workspace);
  await writeFile(
    join(cwd, '.vitepress/config.mts'),
    `import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-mermaid-viewer';
export default withMermaid(defineConfig({ title: 'Packed consumer', mermaid: {
  theme: 'forest', viewer: { css: { '--mv-radius': '12px' }, labels: { dialog: 'Packed viewer' } }
} }));
`,
  );
  await writeFile(
    join(cwd, 'index.md'),
    '# Packed consumer\n\n```mermaid\nflowchart LR\nA[Packed plugin] --> B[Shared viewer]\n```\n\n```mmd\nsequenceDiagram\nAlice->>Bob: Hello\n```\n',
  );
  await writeFile(
    join(cwd, 'types.mts'),
    `import { withMermaid, type ViewerCustomization } from 'vitepress-mermaid-viewer';
const customization: ViewerCustomization = { css: { '--mv-radius': '12px' }, labels: { dialog: 'Viewer' } };
withMermaid({ mermaid: { viewer: customization } });
// @ts-expect-error Public customization keeps its typed CSS token contract across all packages.
const invalid: ViewerCustomization = { css: { '--unknown-token': 'bad' } };
`,
  );
  await writeFile(
    join(cwd, 'types.cts'),
    `import plugin = require('vitepress-mermaid-viewer');
const customization: plugin.ViewerCustomization = { css: { '--mv-radius': '12px' } };
plugin.withMermaid({ mermaid: { viewer: customization } });
// @ts-expect-error CJS declarations must also preserve the customization contract.
const invalid: plugin.ViewerCustomization = { labels: { unknownLabel: 'bad' } };
`,
  );
  await writeJson(join(cwd, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
    include: ['types.mts', 'types.cts', '.vitepress/config.mts'],
  });
  install(cwd);
  /**
   * Resolve transitive dependencies from their actual package, without adding direct dependencies.
   */
  const vitepressEntry = await realpath(join(cwd, 'node_modules/vitepress-mermaid-viewer'));

  assert.ok(vitepressEntry.startsWith(base));
  runNode(
    cwd,
    `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire(import.meta.url);
const plugin = await import('vitepress-mermaid-viewer');
const component = await import('vitepress-mermaid-viewer/Mermaid');
assert.equal(typeof plugin.withMermaid, 'function');
assert.ok(component.default);
assert.equal(typeof require('vitepress-mermaid-viewer').withMermaid, 'function');
assert.equal(typeof require('vitepress-mermaid-viewer/Mermaid').setup, 'function');
const vueRequire = createRequire(require.resolve('vitepress-mermaid-viewer/Mermaid'));
const vueEntry = vueRequire.resolve('vue-mermaid-viewer');
const coreRequire = createRequire(vueEntry);
const coreEntry = coreRequire.resolve('mermaid-viewer');
assert.ok(vueEntry.startsWith(${JSON.stringify(base)}));
assert.ok(coreEntry.startsWith(${JSON.stringify(base)}));
assert.ok(vueRequire('vue-mermaid-viewer').MermaidViewer);
assert.equal(typeof coreRequire('mermaid-viewer').mountViewer, 'function');
assert.equal(typeof coreRequire('mermaid-viewer/mermaid').registerExternalDiagrams, 'function');
assert.match(readFileSync(require.resolve('vitepress-mermaid-viewer/style.css'), 'utf8'), /--vp-c-/);
assert.equal(typeof globalThis.document, 'undefined');
assert.equal(typeof globalThis.window, 'undefined');
`,
  );
  runBin(cwd, 'typescript/bin/tsc', ['--noEmit']);
  runBin(cwd, 'vitepress/bin/vitepress.js', ['build', '.']);

  const svgOnly = join(base, 'svg-only');

  await mkdir(svgOnly);
  await writeJson(join(svgOnly, 'package.json'), {
    name: 'packed-svg-only-consumer',
    private: true,
    type: 'module',
    dependencies: { 'mermaid-viewer': overrides['mermaid-viewer'] },
  });
  await writeJson(join(svgOnly, 'pnpm-workspace.yaml'), workspace);
  install(svgOnly);
  runNode(
    svgOnly,
    `import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { enhanceSvg, mountViewer } from 'mermaid-viewer';
assert.equal(typeof enhanceSvg, 'function');
assert.equal(typeof mountViewer, 'function');
assert.throws(() => createRequire(import.meta.url).resolve('mermaid'), { code: 'MODULE_NOT_FOUND' });
assert.throws(() => createRequire(import.meta.url).resolve('vue'), { code: 'MODULE_NOT_FOUND' });
assert.equal(typeof globalThis.document, 'undefined');
`,
  );

  await checkConsumerBrowser(base);
  succeeded = true;

  console.log(`Packed consumers passed (${JSON.stringify(runtime)}).`);
} finally {
  if (succeeded && !values.keep) await rm(base, { recursive: true, force: true });
  else console.log(`Consumer files retained: ${base}`);
}
