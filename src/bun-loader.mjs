import fs from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const baseDir = '/Users/imac/Documents/Code/claude_code_src';

export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'bun:bundle') {
    return {
      shortCircuit: true,
      url: pathToFileURL(path.join(baseDir, 'src/bun-bundle-mock.ts')).href,
      format: 'module'
    };
  }

  // 2. Identify if it's an internal "src/" or relative import
  let absolutePath = null;
  const isInternal = specifier.startsWith('src/') || specifier.startsWith('.') || specifier.startsWith('/');
  const isBuiltin = specifier.startsWith('node:') || [
    'os', 'fs', 'path', 'crypto', 'child_process', 'util', 'events', 'stream', 'url', 'http', 'https', 'zlib', 'v8', 'dns', 'net', 'tls', 'process', 'readline', 'tty', 'vm', 'async_hooks', 'perf_hooks'
  ].includes(specifier);

  const isInternalMissingPackage = specifier.startsWith('@ant/') || specifier.startsWith('@anthropic-ai/');

  if (isBuiltin) {
    return await nextResolve(specifier, context);
  }

  if (specifier.startsWith('src/')) {
    absolutePath = path.join(baseDir, specifier);
  } else if (specifier.startsWith('file:///')) {
    // If it's already a full file URL, we should be very careful
    absolutePath = fileURLToPath(specifier);
  } else if (specifier.startsWith('.') && context.parentURL) {
    try {
        absolutePath = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
    } catch(e) {}
  }

  if (absolutePath && absolutePath.includes('/src/')) {
    const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '.json'];
    let found = null;
    for (const ext of extensions) {
      if (fs.existsSync(absolutePath + ext)) {
        found = absolutePath + ext;
        break;
      }
    }

    if (!found) {
        // If it's something like cli.tsx.ts, try stripping the last extension if it's .ts or .js
        if (absolutePath.endsWith('.ts') || absolutePath.endsWith('.js')) {
            const stripped = absolutePath.slice(0, -3);
            for (const ext of extensions) {
               if (fs.existsSync(stripped + ext)) {
                 found = stripped + ext;
                 break;
               }
            }
        }
    }

    if (found) {
        const cleanURL = pathToFileURL(found).href;
        try {
            return await nextResolve(cleanURL, context);
        } catch (e) {
            // fall through
        }
    } else {
        // Only mock if it's definitely not there
        console.log(`[Missing] ${specifier}`);
        return {
          shortCircuit: true,
          url: pathToFileURL(path.join(baseDir, 'src/virtual-mock.ts')).href,
          format: 'module'
        };
    }
  }

  try {
    return await nextResolve(specifier, context);
  } catch (err) {
    const isPackage = !specifier.startsWith('.') && !specifier.startsWith('/') && !specifier.startsWith('file:///');
    const isInternal = specifier.startsWith('src/') || (absolutePath && absolutePath.includes('/src/'));
    
    if (isPackage || isInternal) {
        console.log(`[Missing Package/Module] ${specifier}`);
        return {
          shortCircuit: true,
          url: pathToFileURL(path.join(baseDir, 'src/virtual-mock.ts')).href,
          format: 'module'
        };
    }
    throw err;
  }
}
