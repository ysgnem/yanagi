import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function loadModules(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.js'))
    .sort((left, right) => left.name.localeCompare(right.name));

  return Promise.all(
    files.map(async ({ name }) => {
      const moduleUrl = pathToFileURL(path.join(directory, name)).href;
      const loadedModule = await import(moduleUrl);
      if (!Object.hasOwn(loadedModule, 'default'))
        throw new TypeError(`Module must have a default export: ${name}`);
      return loadedModule.default;
    }),
  );
}
