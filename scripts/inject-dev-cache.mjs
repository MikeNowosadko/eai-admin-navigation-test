#!/usr/bin/env node
/* Inject dev-cache.js + no-cache meta + asset ?v= into every HTML file. */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { dirname, relative, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const devCachePath = join(root, 'assets/dev-cache.js');
const buildV = statSync(devCachePath).mtimeMs.toString(36);

function assetPrefix(htmlPath) {
  const dir = dirname(htmlPath);
  const rel = relative(root, dir);
  if (!rel || rel === '.') return 'assets/';
  const depth = rel.split(/[/\\]/).filter(Boolean).length;
  return `${'../'.repeat(depth)}assets/`;
}

function withBuildV(url) {
  const base = url.replace(/([?&])v=[^&]*/g, '').replace(/\?$/, '');
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}v=${buildV}`;
}

function bustAssetUrls(html) {
  return html.replace(
    /((?:href|src)=["'])((?:\.\.\/)*assets\/[^"']+)(["'])/g,
    (match, pre, url, post) => `${pre}${withBuildV(url)}${post}`
  );
}

function ensureDevCache(html, file) {
  const src = `${assetPrefix(file)}dev-cache.js?v=${buildV}`;
  const tag = `<script src="${src}"></script>`;
  if (html.includes('dev-cache.js')) {
    return html.replace(/<script src="[^"]*dev-cache\.js[^"]*"><\/script>/, tag);
  }
  if (html.includes('<meta charset="utf-8" />')) {
    return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n${tag}`);
  }
  if (html.includes('<meta charset="utf-8">')) {
    return html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n${tag}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n${tag}`);
}

function ensureNoCacheMeta(html) {
  if (html.includes('http-equiv="Cache-Control"')) return html;
  const cacheMeta = '<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />\n<meta http-equiv="Pragma" content="no-cache" />';
  if (html.includes('<meta charset="utf-8" />')) {
    return html.replace('<meta charset="utf-8" />', `<meta charset="utf-8" />\n${cacheMeta}`);
  }
  if (html.includes('<meta charset="utf-8">')) {
    return html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n${cacheMeta}`);
  }
  return html.replace(/<head([^>]*)>/i, `<head$1>\n${cacheMeta}`);
}

const files = [];
function walkDir(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkDir(p);
    else if (name.endsWith('.html')) files.push(p);
  }
}
walkDir(root);

for (const f of files) {
  let html = readFileSync(f, 'utf8');
  html = ensureNoCacheMeta(html);
  html = ensureDevCache(html, f);
  html = bustAssetUrls(html);
  writeFileSync(f, html);
}

console.log(`Done — ${files.length} HTML files (build v=${buildV})`);
