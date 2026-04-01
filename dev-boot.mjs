import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

globalThis.MACRO = { VERSION: "2.1.88" };

const entryPoint = pathToFileURL(resolve('./src/entrypoints/cli.tsx')).href;
import(entryPoint).catch(console.error);
