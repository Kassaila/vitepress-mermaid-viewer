import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';
import { URL } from 'node:url';
import { chromium } from 'playwright';

const contentTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const serve = async (directory) => {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let file = resolve(directory, `.${pathname}`);

      assert.ok(file === directory || file.startsWith(`${directory}${sep}`));

      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');

      response.setHeader('Content-Type', contentTypes[extname(file)] || 'application/octet-stream');
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  return { server, url: `http://127.0.0.1:${server.address().port}` };
};

/**
 * Exercise the production tarball consumers, including a real Vue SSR hydration entry.
 */
export const checkConsumerBrowser = async (base) => {
  const browser = await chromium.launch();

  try {
    for (const fixture of [
      { role: 'vanilla', directory: 'dist', path: '/', diagrams: 1 },
      { role: 'vue', directory: 'dist', path: '/', diagrams: 1 },
      { role: 'vue', directory: 'dist', path: '/hydrate.html', diagrams: 1 },
      { role: 'vitepress', directory: '.vitepress/dist', path: '/', diagrams: 2 },
    ]) {
      const { server, url } = await serve(join(base, fixture.role, fixture.directory));
      const context = await browser.newContext({ acceptDownloads: true });
      const errors = [];

      try {
        const page = await context.newPage();

        page.on('pageerror', (error) => errors.push(error.message));
        page.on('console', (message) => {
          if (message.type() === 'error' || /hydration.*mismatch/i.test(message.text()))
            errors.push(message.text());
        });
        await page.goto(`${url}${fixture.path}`);
        const diagrams = page.locator('.mv-diagram > svg');

        await diagrams.nth(fixture.diagrams - 1).waitFor({ state: 'visible' });
        assert.equal(await diagrams.count(), fixture.diagrams);
        const trigger = page.locator('.mv-diagram').first();

        await trigger.focus();
        await trigger.press('Enter');
        const dialog = page.locator('dialog[open]');

        await dialog.waitFor({ state: 'visible' });
        assert.equal(await dialog.locator('svg').count(), 1);
        assert.equal(await dialog.getByRole('button').count(), 7);
        const before = await dialog.locator('output').textContent();

        await dialog.getByRole('button', { name: 'Zoom in', exact: true }).click();
        assert.notEqual(await dialog.locator('output').textContent(), before);
        const [svg] = await Promise.all([
          page.waitForEvent('download'),
          dialog.getByRole('button', { name: 'Download SVG', exact: true }).click(),
        ]);

        assert.match(svg.suggestedFilename(), /\.svg$/);
        assert.equal(await svg.failure(), null);
        const [png] = await Promise.all([
          page.waitForEvent('download'),
          dialog.getByRole('button', { name: 'Download PNG', exact: true }).click(),
        ]);

        assert.match(png.suggestedFilename(), /\.png$/);
        assert.equal(await png.failure(), null);
        await page.keyboard.press('Escape');
        await dialog.waitFor({ state: 'detached' });
        assert.equal(
          await trigger.evaluate((element) => element === element.ownerDocument.activeElement),
          true,
        );
        assert.deepEqual(errors, [], `${fixture.role}${fixture.path} browser errors`);
        console.log(
          `[packed:browser] ${fixture.role}${fixture.path}: rendering, dialog, zoom, SVG/PNG and focus passed`,
        );
      } finally {
        await context.close();
        server.closeAllConnections();
        await new Promise((resolve, reject) =>
          server.close((error) => (error ? reject(error) : resolve())),
        );
      }
    }
  } finally {
    await browser.close();
  }
};
