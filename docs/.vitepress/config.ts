import type { DefaultTheme } from 'vitepress/theme';

import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

import { defineConfig, type SiteConfig } from 'vitepress';
import { withMermaid } from 'vitepress-mermaid-viewer';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json') as { version: string };

const HOSTNAME = 'https://kassaila.github.io';
const BASE = '/vitepress-mermaid-viewer/';
const SITE_URL = `${HOSTNAME}${BASE}`;
const REPO_URL = 'https://github.com/Kassaila/vitepress-mermaid-viewer';
const CHANGELOG_URL = `${REPO_URL}/blob/main/CHANGELOG.md`;
const CONTRIBUTING_URL = `${REPO_URL}/blob/main/CONTRIBUTING.md`;
const OG_IMAGE_URL = `${SITE_URL}og_image.png`;
const OG_IMAGE_ALT = 'VitePress Mermaid Viewer — Interactive mermaid diagrams for VitePress';
const MARKETING_DESCRIPTION =
  'Mermaid diagrams for VitePress with interactive zoom, pan, and fullscreen viewing.';

const LLMS_INTRO =
  'VitePress Mermaid Viewer is a VitePress plugin that renders mermaid code blocks as interactive diagrams with zoom, pan, and fullscreen viewing. Each link below has a clean Markdown version optimized for LLM consumption.';

const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}sitemap.xml
`;

const toRelativePath = (link: string): string => {
  const trimmed = link.replace(/^\//, '');

  return trimmed === '' || trimmed.endsWith('/') ? `${trimmed}index.md` : `${trimmed}.md`;
};

const toMarkdownUrl = (link: string): string => {
  if (/^https?:/.test(link)) {
    return link;
  }

  return `${SITE_URL}${toRelativePath(link)}`;
};

const isSidebarGroup = (
  item: DefaultTheme.SidebarItem,
): item is DefaultTheme.SidebarItem & { items: DefaultTheme.SidebarItem[] } =>
  'items' in item && Array.isArray(item.items);

const isSidebarLink = (
  item: DefaultTheme.SidebarItem,
): item is DefaultTheme.SidebarItem & { text: string; link: string } =>
  typeof item.link === 'string' && typeof item.text === 'string';

const copyMarkdownSources = async (siteConfig: SiteConfig): Promise<void> => {
  const destDirs = new Set(
    siteConfig.pages.map((pagePath) => dirname(join(siteConfig.outDir, pagePath))),
  );
  await Promise.all([...destDirs].map((dir) => mkdir(dir, { recursive: true })));
  await Promise.all(
    siteConfig.pages.map((pagePath) =>
      copyFile(join(siteConfig.srcDir, pagePath), join(siteConfig.outDir, pagePath)),
    ),
  );
};

const pageDescriptions = new Map<string, string>();

const renderLlmsTxt = (siteConfig: SiteConfig): string => {
  const sidebar = (siteConfig.site.themeConfig.sidebar ?? []) as
    | DefaultTheme.SidebarItem[]
    | Record<string, DefaultTheme.SidebarItem[]>;
  const groups = Array.isArray(sidebar) ? sidebar : Object.values(sidebar).flat();

  const lines: string[] = [
    `# ${siteConfig.site.title}`,
    '',
    `> ${siteConfig.site.description}`,
    '',
    LLMS_INTRO,
    '',
  ];

  for (const group of groups) {
    if (!isSidebarGroup(group)) {
      continue;
    }

    lines.push(`## ${group.text ?? ''}`, '');

    for (const item of group.items) {
      if (!isSidebarLink(item)) {
        continue;
      }

      const description = pageDescriptions.get(toRelativePath(item.link)) ?? '';
      const suffix = description.length > 0 ? `: ${description}` : '';

      lines.push(`- [${item.text}](${toMarkdownUrl(item.link)})${suffix}`);
    }

    lines.push('');
  }

  return lines.join('\n');
};

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
    title: 'VitePress Mermaid Viewer',
    description: MARKETING_DESCRIPTION,
    base: BASE,
    cleanUrls: true,
    lastUpdated: true,

    sitemap: {
      hostname: SITE_URL,
    },

    srcExclude: ['plan.md'],

    transformPageData(pageData) {
      const markdownUrl = `${SITE_URL}${pageData.relativePath}`;
      const canonicalUrl = markdownUrl.replace(/index\.md$/, '').replace(/\.md$/, '');

      const { description: frontmatterDescription } = pageData.frontmatter;

      if (typeof frontmatterDescription === 'string' && frontmatterDescription.length > 0) {
        pageDescriptions.set(
          pageData.relativePath,
          frontmatterDescription.replace(/[\r\n]+/g, ' ').trim(),
        );
      }

      const isHome = pageData.frontmatter.layout === 'home';
      const siteTitle = 'VitePress Mermaid Viewer';
      const title = !pageData.title
        ? siteTitle
        : isHome
          ? pageData.title
          : `${pageData.title} | ${siteTitle}`;
      const description =
        typeof frontmatterDescription === 'string' && frontmatterDescription.length > 0
          ? frontmatterDescription
          : MARKETING_DESCRIPTION;

      pageData.frontmatter.head ??= [];
      pageData.frontmatter.head.push(
        ['link', { rel: 'canonical', href: canonicalUrl }],
        ['meta', { property: 'og:url', content: canonicalUrl }],
        ['meta', { property: 'og:title', content: title }],
        ['meta', { property: 'og:description', content: description }],
        ['meta', { name: 'twitter:title', content: title }],
        ['meta', { name: 'twitter:description', content: description }],
        [
          'link',
          {
            rel: 'alternate',
            type: 'text/markdown',
            title: 'Markdown version',
            href: markdownUrl,
          },
        ],
      );
    },

    async buildEnd(siteConfig) {
      await copyMarkdownSources(siteConfig);

      await Promise.all([
        writeFile(join(siteConfig.outDir, 'llms.txt'), renderLlmsTxt(siteConfig), 'utf8'),
        writeFile(join(siteConfig.outDir, 'robots.txt'), ROBOTS_TXT, 'utf8'),
      ]);
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
      ['meta', { property: 'og:site_name', content: 'VitePress Mermaid Viewer' }],
      ['meta', { property: 'og:locale', content: 'en_US' }],
      ['meta', { property: 'og:image', content: OG_IMAGE_URL }],
      ['meta', { property: 'og:image:width', content: '1200' }],
      ['meta', { property: 'og:image:height', content: '630' }],
      ['meta', { property: 'og:image:type', content: 'image/png' }],
      ['meta', { property: 'og:image:alt', content: OG_IMAGE_ALT }],
      ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
      ['meta', { name: 'twitter:image', content: OG_IMAGE_URL }],
      ['meta', { name: 'twitter:image:alt', content: OG_IMAGE_ALT }],
      [
        'script',
        { type: 'application/ld+json' },
        JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SoftwareSourceCode',
          'name': 'vitepress-mermaid-viewer',
          'description': MARKETING_DESCRIPTION,
          'codeRepository': REPO_URL,
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
      siteUrl: SITE_URL,
      logo: { src: '/logo.svg', alt: 'VitePress Mermaid Viewer' },

      nav: [
        { text: 'Guide', link: '/guide/usage' },
        { text: 'Examples', link: '/guide/examples' },
        { text: 'Showcase', link: '/showcase' },
        { text: 'Changelog', link: CHANGELOG_URL },
        { text: 'Contributing', link: CONTRIBUTING_URL },
      ],

      sidebar: [
        {
          text: 'Guide',
          items: [
            { text: 'Usage', link: '/guide/usage' },
            { text: 'Examples', link: '/guide/examples' },
          ],
        },
        {
          text: 'Showcase',
          items: [{ text: 'Projects', link: '/showcase' }],
        },
      ],

      socialLinks: [{ icon: 'github', link: REPO_URL }],

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
