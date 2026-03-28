import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { defineConfig } from 'vitepress';
import { withMermaid } from 'vitepress-mermaid-viewer';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const HOSTNAME = 'https://kassaila.github.io';
const BASE = '/vitepress-mermaid-viewer/';

export default withMermaid(
  defineConfig({
    vite: {
      build: {
        chunkSizeWarningLimit: 600,
      },
      resolve: {
        alias: {
          'vitepress-mermaid-viewer/Mermaid': resolve(__dirname, '../../dist/Mermaid.js'),
          'vitepress-mermaid-viewer/style.css': resolve(__dirname, '../../dist/style.css'),
        },
      },
    },
    title: 'Mermaid Viewer',
    description:
      'Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing',
    base: BASE,
    cleanUrls: true,
    lastUpdated: true,

    sitemap: {
      hostname: `${HOSTNAME}${BASE}`,
    },

    transformPageData(pageData) {
      const canonicalUrl = `${HOSTNAME}${BASE}${pageData.relativePath}`
        .replace(/index\.md$/, '')
        .replace(/\.md$/, '');

      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push(
        ['link', { rel: 'canonical', href: canonicalUrl }],
        ['meta', { property: 'og:url', content: canonicalUrl }],
      );
    },

    head: [
      [
        'link',
        { rel: 'icon', type: 'image/png', href: `${BASE}favicon-96x96.png`, sizes: '96x96' },
      ],
      ['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }],
      ['link', { rel: 'shortcut icon', href: `${BASE}favicon.ico` }],
      ['link', { rel: 'apple-touch-icon', sizes: '180x180', href: `${BASE}apple-touch-icon.png` }],
      ['meta', { name: 'apple-mobile-web-app-title', content: 'VitePress Mermaid Viewer' }],
      ['link', { rel: 'manifest', href: `${BASE}site.webmanifest` }],
      ['meta', { name: 'robots', content: 'index, follow' }],
      [
        'meta',
        {
          name: 'google-site-verification',
          content: 'jkEm04n1UJ6WDYKHuB-fx5U0vI9vLahOv3m7bi1zzF8',
        },
      ],
      ['meta', { name: 'author', content: 'Kassaila' }],
      [
        'meta',
        {
          name: 'keywords',
          content:
            'vitepress, mermaid, diagram, zoom, pan, fullscreen, vitepress-plugin, markdown, vue',
        },
      ],
      ['meta', { name: 'theme-color', content: '#6366f1' }],
      ['link', { rel: 'dns-prefetch', href: 'https://github.com' }],
      ['link', { rel: 'dns-prefetch', href: 'https://gc.zgo.at' }],
      ['meta', { property: 'og:type', content: 'website' }],
      ['meta', { property: 'og:title', content: 'VitePress Mermaid Viewer' }],
      [
        'meta',
        {
          property: 'og:description',
          content:
            'Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.',
        },
      ],
      ['meta', { property: 'og:site_name', content: 'VitePress Mermaid Viewer' }],
      ['meta', { property: 'og:locale', content: 'en_US' }],
      [
        'meta',
        {
          property: 'og:image',
          content: `${HOSTNAME}${BASE}og_image.png`,
        },
      ],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:type', content: 'image/png' }],
      [
        'meta',
        {
          property: 'og:image:alt',
          content: 'VitePress Mermaid Viewer — Interactive mermaid diagrams for VitePress',
        },
      ],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:title', content: 'VitePress Mermaid Viewer' }],
      [
        'meta',
        {
          name: 'twitter:description',
          content:
            'Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.',
        },
      ],
      [
        'meta',
        {
          name: 'twitter:image',
          content: `${HOSTNAME}${BASE}og_image.png`,
        },
      ],
      [
        'meta',
        {
          name: 'twitter:image:alt',
          content: 'VitePress Mermaid Viewer — Interactive mermaid diagrams for VitePress',
        },
      ],
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          'name': 'vitepress-mermaid-viewer',
          'description':
            'Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing',
          'codeRepository': 'https://github.com/Kassaila/vitepress-mermaid-viewer',
          'programmingLanguage': 'TypeScript',
          'runtimePlatform': 'Node.js',
          'license': 'https://opensource.org/licenses/MIT',
          'downloadUrl': 'https://www.npmjs.com/package/vitepress-mermaid-viewer',
          'softwareVersion': pkg.version,
          'author': {
            '@type': 'Person',
            'name': 'Kassaila',
          },
        }),
      ],
      [
        'script',
        {
          'data-goatcounter': 'https://kassaila.goatcounter.com/count',
          'src': '//gc.zgo.at/count.js',
          'async': '',
        },
      ],
    ],

    themeConfig: {
      logo: { src: '/logo.svg', alt: 'VitePress Mermaid Viewer' },

      nav: [
        { text: 'Guide', link: '/guide/usage' },
        { text: 'Examples', link: '/guide/examples' },
        {
          text: 'Changelog',
          link: 'https://github.com/Kassaila/vitepress-mermaid-viewer/blob/main/CHANGELOG.md',
        },
        {
          text: 'Contributing',
          link: 'https://github.com/Kassaila/vitepress-mermaid-viewer/blob/main/CONTRIBUTING.md',
        },
      ],

      sidebar: [
        {
          text: 'Guide',
          items: [
            { text: 'Usage', link: '/guide/usage' },
            { text: 'Examples', link: '/guide/examples' },
          ],
        },
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/Kassaila/vitepress-mermaid-viewer' },
      ],

      search: {
        provider: 'local',
      },

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © Kassaila',
      },
    },
  }),
);
