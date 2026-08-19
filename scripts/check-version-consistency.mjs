import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

// Every manifest that carries a version. These must always agree: the module.json
// version is what Foundry advertises for updates, and the package.json versions are
// what the server artifacts report. When they drift (as in #69, where module.json
// was bumped to 0.8.3 in a feature PR while the packages stayed 0.8.2), releases
// ship inconsistent version numbers and the Foundry update check misbehaves.
const FILES = [
  'package.json',
  'packages/mcp-server/package.json',
  'packages/foundry-module/package.json',
  'shared/package.json',
  'packages/foundry-module/module.json',
];

const entries = FILES.map(file => {
  const full = path.join(repoRoot, file);
  const version = JSON.parse(fs.readFileSync(full, 'utf8')).version;
  return { file, version };
});

const packageLock = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package-lock.json'), 'utf8'));
entries.push(
  { file: 'package-lock.json', version: packageLock.version },
  { file: 'package-lock.json#packages[""]', version: packageLock.packages[''].version },
  {
    file: 'package-lock.json#packages["packages/mcp-server"]',
    version: packageLock.packages['packages/mcp-server'].version,
  },
  {
    file: 'package-lock.json#packages["packages/foundry-module"]',
    version: packageLock.packages['packages/foundry-module'].version,
  },
  {
    file: 'package-lock.json#packages["shared"]',
    version: packageLock.packages.shared.version,
  }
);

for (const { file, version } of entries) {
  console.log(`  ${String(version).padEnd(10)} ${file}`);
}

const distinct = [...new Set(entries.map(e => e.version))];

if (distinct.length === 1) {
  console.log(`\n[version-check] OK — all ${entries.length} version records agree: ${distinct[0]}`);
  process.exit(0);
}

console.error(
  `\n[version-check] FAIL — found ${distinct.length} distinct versions: ${distinct.join(', ')}`
);
console.error(
  '  All package manifests, module.json, and package-lock workspace records must share one version.'
);
console.error('  in a single "chore(release): prepare vX.Y.Z" commit before tagging a release.');
process.exit(1);
