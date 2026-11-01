import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadModules(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .sort((left, right) => left.name.localeCompare(right.name));

  return Promise.all(
    files.map(async ({ name }) => {
      const modUrl = pathToFileURL(path.join(dir, name)).href;
      const mod = await import(modUrl);
      if (!Object.hasOwn(mod, 'default'))
        throw new TypeError(`Module must have a default export: ${name}`);
      return mod.default;
    }),
  );
}
