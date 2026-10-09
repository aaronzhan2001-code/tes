import { copyFile, mkdir } from 'node:fs/promises';

await mkdir('release', { recursive: true });
await copyFile('dist/index.html', 'release/city-lab.html');
console.log('Standalone release saved to release/city-lab.html');
