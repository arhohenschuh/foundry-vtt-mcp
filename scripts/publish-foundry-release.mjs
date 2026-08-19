import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), '..');
const registryEndpoint = 'https://foundryvtt.com/_api/packages/release_version/';

const readJson = relativePath => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));

export function normalizeReleaseTag(tag, expectedVersion) {
  const normalized = tag?.startsWith('v') ? tag : `v${tag ?? expectedVersion}`;
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(normalized)) {
    throw new Error(`Invalid release tag: ${JSON.stringify(tag)}`);
  }
  if (normalized !== `v${expectedVersion}`) {
    throw new Error(`Release tag ${normalized} does not match manifest version ${expectedVersion}`);
  }
  return normalized;
}

export function createRegistryRequest(config, moduleJson, tag) {
  if (moduleJson.id !== config.moduleId) {
    throw new Error(`Module id ${moduleJson.id} does not match configured id ${config.moduleId}`);
  }

  const normalizedTag = normalizeReleaseTag(tag, moduleJson.version);
  const repositoryUrl = `https://github.com/${config.repository}`;

  return {
    id: moduleJson.id,
    release: {
      version: moduleJson.version,
      manifest: `${repositoryUrl}/releases/download/${normalizedTag}/module.json`,
      notes: `${repositoryUrl}/releases/tag/${normalizedTag}`,
      compatibility: {
        minimum: moduleJson.compatibility.minimum,
        verified: moduleJson.compatibility.verified,
        maximum: moduleJson.compatibility.maximum,
      },
    },
  };
}

export function assertPublishAuthority(environment, expectedRepository) {
  if (environment.FOUNDRY_REGISTRY_PUBLISH_ENABLED !== 'true') {
    throw new Error('Foundry registry publication is not enabled');
  }
  if (environment.FOUNDRY_REGISTRY_AUTHORIZED_REPOSITORY !== expectedRepository) {
    throw new Error('Foundry registry authorized repository does not match release identity');
  }
  if (environment.GITHUB_REPOSITORY !== expectedRepository) {
    throw new Error('Current GitHub repository does not match release identity');
  }
  if (!environment.FOUNDRY_PACKAGE_RELEASE_TOKEN) {
    throw new Error('FOUNDRY_PACKAGE_RELEASE_TOKEN is required for publication');
  }
}

export async function publishRegistryRelease(request, token, fetchImplementation = fetch) {
  const response = await fetchImplementation(registryEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
    body: JSON.stringify(request),
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Foundry registry returned HTTP ${response.status}: ${body}`);
  }

  return { status: response.status, body };
}

const getArgument = (argumentsList, name) => {
  const index = argumentsList.indexOf(name);
  if (index < 0) return undefined;
  const value = argumentsList[index + 1];
  if (!value || value.startsWith('--')) throw new Error(`${name} requires a value`);
  return value;
};

export async function run(argumentsList, environment = process.env, fetchImplementation = fetch) {
  const dryRun = argumentsList.includes('--dry-run');
  const publish = argumentsList.includes('--publish');
  if (dryRun === publish) {
    throw new Error('Choose exactly one mode: --dry-run or --publish');
  }

  const config = readJson('release.config.json');
  const moduleJson = readJson('packages/foundry-module/module.json');
  const tag = getArgument(argumentsList, '--tag') ?? `v${moduleJson.version}`;
  const request = createRegistryRequest(config, moduleJson, tag);

  if (dryRun) {
    return {
      mode: 'dry-run',
      endpoint: registryEndpoint,
      repository: config.repository,
      request,
    };
  }

  assertPublishAuthority(environment, config.repository);
  const result = await publishRegistryRelease(
    request,
    environment.FOUNDRY_PACKAGE_RELEASE_TOKEN,
    fetchImplementation
  );
  return { mode: 'publish', repository: config.repository, request, result };
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  try {
    const result = await run(process.argv.slice(2));
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(
      `[foundry-registry] FAIL - ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}
