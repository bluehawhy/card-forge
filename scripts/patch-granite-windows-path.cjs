const fs = require('node:fs');
const path = require('node:path');

function patchFile(relativePath, replacements) {
  const targetPath = path.join(process.cwd(), ...relativePath);
  let source = fs.readFileSync(targetPath, 'utf8');
  let changed = false;

  for (const [original, windowsSafe] of replacements) {
    if (source.includes(windowsSafe)) continue;
    if (!source.includes(original)) {
      throw new Error(`Unsupported dependency version: ${targetPath}`);
    }
    source = source.replace(original, windowsSafe);
    changed = true;
  }

  if (changed) fs.writeFileSync(targetPath, source, 'utf8');
  return changed;
}

const microFrontendChanged = patchFile(
  ['node_modules', '@granite-js', 'plugin-micro-frontend', 'dist', 'index.js'],
  [["'${path.resolve(modulePath)}'", "'${path.resolve(modulePath).replaceAll('\\\\', '/')}'"]],
);

const compatFiles = ['index.js', 'index.cjs'];
let compatChanged = false;
for (const filename of compatFiles) {
  const requirePrefix = filename === 'index.js' ? '__require' : 'require';
  compatChanged =
    patchFile(
      ['node_modules', '@apps-in-toss', 'plugin-compat', 'dist', filename],
      [
        [
          `const reactUsePolyfillPath = ${requirePrefix}.resolve("react18-use");`,
          `const reactUsePolyfillPath = ${requirePrefix}.resolve("react18-use").replaceAll("\\\\", "/");`,
        ],
        [
          `const reactEffectEventPolyfillPath = ${requirePrefix}.resolve("use-effect-event");`,
          `const reactEffectEventPolyfillPath = ${requirePrefix}.resolve("use-effect-event").replaceAll("\\\\", "/");`,
        ],
      ],
    ) || compatChanged;
}

process.stdout.write(
  microFrontendChanged || compatChanged
    ? 'Applied Granite Windows path patches.\n'
    : 'Granite Windows path patches are already applied.\n',
);
