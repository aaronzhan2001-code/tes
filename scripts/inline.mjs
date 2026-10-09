import { readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// Inline the build's own assets. No runtime loaders or third-party packaging dependencies.
const output = resolve('dist');
const readAsset = async (path) => {
  const file = resolve(output, path);
  if (!file.startsWith(output + sep)) throw new Error('Asset path escapes dist');
  return readFile(file, 'utf8');
};
let html = await readFile(resolve(output, 'index.html'), 'utf8');
for (const match of html.matchAll(/<script\b[^>]*src="([^"]+)"[^>]*><\/script>/g)) {
  const code = await readAsset(match[1]);
  html = html.replace(
    match[0],
    () => `<script type="module">${code.replace(/<\/script/gi, '<\\/script')}</script>`,
  );
}
for (const match of html.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g)) {
  const css = await readAsset(match[1]);
  html = html.replace(match[0], () => `<style>${css.replace(/<\/style/gi, '<\\/style')}</style>`);
}
if (/\b(?:src|href)="\.\/assets\//.test(html)) throw new Error('An asset was not inlined');
await writeFile(resolve(output, 'index.html'), html);
await rm(resolve(output, 'assets'), { recursive: true, force: true });
console.log('Created self-contained dist/index.html');
