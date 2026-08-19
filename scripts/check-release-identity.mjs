import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

const config = readJson('release.config.json');
const packageJson = readJson('package.json');
const moduleJson = readJson('packages/foundry-module/module.json');
const checkUpstreamTags = process.argv.includes('--check-upstream-tags');
const errors = [];

const assertEqual = (label, actual, expected) => {
  if (actual !== expected) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
};

const assertNoText = (relativePath, forbiddenText) => {
  const content = fs.readFileSync(path.join(root, relativePath), 'utf8');
  if (content.includes(forbiddenText)) {
    errors.push(`${relativePath}: contains forbidden release identity ${forbiddenText}`);
  }
};

if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.repository)) {
  errors.push(`release.config.json: invalid repository ${JSON.stringify(config.repository)}`);
}
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(config.upstreamRepository)) {
  errors.push(
    `release.config.json: invalid upstreamRepository ${JSON.stringify(config.upstreamRepository)}`
  );
}
if (config.repository === config.upstreamRepository) {
  errors.push('release.config.json: downstream and upstream repositories must differ');
}

const repositoryUrl = `https://github.com/${config.repository}`;
const upstreamUrl = `https://github.com/${config.upstreamRepository}`;

assertEqual('package.json repository', packageJson.repository?.url, `${repositoryUrl}.git`);
assertEqual('module id', moduleJson.id, config.moduleId);
assertEqual('module url', moduleJson.url, repositoryUrl);
assertEqual('module bugs', moduleJson.bugs, `${repositoryUrl}/issues`);
assertEqual('module changelog', moduleJson.changelog, `${repositoryUrl}/releases`);
assertEqual('module readme', moduleJson.readme, `${repositoryUrl}/blob/master/README.md`);
assertEqual('module license', moduleJson.license, `${repositoryUrl}/blob/master/LICENSE`);
assertEqual(
  'module manifest',
  moduleJson.manifest,
  `${repositoryUrl}/releases/latest/download/module.json`
);
assertEqual(
  'module download',
  moduleJson.download,
  `${repositoryUrl}/releases/latest/download/foundry-vtt-mcp.zip`
);

for (const relativePath of [
  '.github/workflows/build-complete-release.yml',
  'INSTALLATION.md',
  'README.md',
  'installer/build-dmg.js',
  'installer/build-mac-pkg.js',
  'packages/foundry-module/src/main.ts',
]) {
  assertNoText(relativePath, upstreamUrl);
}

if (process.env.GITHUB_REPOSITORY) {
  assertEqual('GitHub Actions repository', process.env.GITHUB_REPOSITORY, config.repository);
} else {
  try {
    const origin = execFileSync('git', ['remote', 'get-url', 'origin'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    const match = origin.match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/i);
    if (!match) {
      errors.push(`unable to identify a GitHub repository from origin ${JSON.stringify(origin)}`);
    } else {
      assertEqual('Git origin repository', match[1], config.repository);
    }
  } catch (error) {
    errors.push(
      `unable to verify Git origin: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

if (process.env.GITHUB_REF_TYPE === 'tag') {
  assertEqual('release tag', process.env.GITHUB_REF_NAME, `v${packageJson.version}`);
}

if (checkUpstreamTags) {
  try {
    const output = execFileSync(
      'git',
      [
        'ls-remote',
        '--tags',
        `${upstreamUrl}.git`,
        `refs/tags/v${packageJson.version}`,
        `refs/tags/${packageJson.version}`,
      ],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    ).trim();

    if (output) {
      errors.push(
        `version ${packageJson.version} already exists in upstream ${config.upstreamRepository}`
      );
    }
  } catch (error) {
    errors.push(
      `unable to verify upstream tags: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

if (errors.length > 0) {
  console.error('[release-identity] FAIL');
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}

console.log(
  `[release-identity] OK - ${config.repository} v${packageJson.version}` +
    (checkUpstreamTags ? ` does not collide with ${config.upstreamRepository}` : '')
);
