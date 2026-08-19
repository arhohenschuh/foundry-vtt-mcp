import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

import {
  assertPublishAuthority,
  createRegistryRequest,
  publishRegistryRelease,
} from './publish-foundry-release.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(root, 'release.config.json'), 'utf8'));
const moduleJson = JSON.parse(
  fs.readFileSync(path.join(root, 'packages/foundry-module/module.json'), 'utf8')
);

test('builds a downstream registry request from the release tag', () => {
  const tag = `v${moduleJson.version}`;
  const request = createRegistryRequest(config, moduleJson, tag);

  assert.equal(request.id, config.moduleId);
  assert.equal(request.release.version, moduleJson.version);
  assert.equal(
    request.release.manifest,
    `https://github.com/${config.repository}/releases/download/${tag}/module.json`
  );
  assert.equal(
    request.release.notes,
    `https://github.com/${config.repository}/releases/tag/${tag}`
  );
});

test('rejects a release tag that differs from the manifest version', () => {
  assert.throws(
    () => createRegistryRequest(config, moduleJson, 'v99.0.0'),
    /does not match manifest version/
  );
});

test('requires explicit repository and token authority before publication', () => {
  const authorized = {
    FOUNDRY_REGISTRY_PUBLISH_ENABLED: 'true',
    FOUNDRY_REGISTRY_AUTHORIZED_REPOSITORY: config.repository,
    GITHUB_REPOSITORY: config.repository,
    FOUNDRY_PACKAGE_RELEASE_TOKEN: 'test-token',
  };

  assert.doesNotThrow(() => assertPublishAuthority(authorized, config.repository));
  assert.throws(
    () =>
      assertPublishAuthority(
        { ...authorized, FOUNDRY_REGISTRY_PUBLISH_ENABLED: 'false' },
        config.repository
      ),
    /not enabled/
  );
  assert.throws(
    () =>
      assertPublishAuthority(
        { ...authorized, GITHUB_REPOSITORY: 'wrong/repository' },
        config.repository
      ),
    /Current GitHub repository/
  );
  assert.throws(
    () =>
      assertPublishAuthority(
        { ...authorized, FOUNDRY_PACKAGE_RELEASE_TOKEN: '' },
        config.repository
      ),
    /TOKEN is required/
  );
});

test('publishes the exact request with token authorization', async () => {
  const request = createRegistryRequest(config, moduleJson, `v${moduleJson.version}`);
  let observed;
  const fakeFetch = async (url, options) => {
    observed = { url, options };
    return { ok: true, status: 200, text: async () => '{"ok":true}' };
  };

  const result = await publishRegistryRelease(request, 'test-token', fakeFetch);

  assert.equal(observed.url, 'https://foundryvtt.com/_api/packages/release_version/');
  assert.equal(observed.options.method, 'POST');
  assert.equal(observed.options.headers.Authorization, 'test-token');
  assert.deepEqual(JSON.parse(observed.options.body), request);
  assert.equal(result.status, 200);
});

test('CLI dry run renders the request without publication authority', () => {
  const output = execFileSync(
    process.execPath,
    [path.join(root, 'scripts/publish-foundry-release.mjs'), '--dry-run'],
    { cwd: root, encoding: 'utf8', env: {} }
  );
  const result = JSON.parse(output);

  assert.equal(result.mode, 'dry-run');
  assert.equal(result.repository, config.repository);
  assert.equal(result.request.release.version, moduleJson.version);
});

test('release workflow keeps dry run executable and publication guarded', () => {
  const workflowText = fs.readFileSync(
    path.join(root, '.github/workflows/build-complete-release.yml'),
    'utf8'
  );
  const workflow = YAML.parse(workflowText);
  const dryRunJob = workflow.jobs['foundry-registry-dry-run'];
  const windowsBuild = workflow.jobs['build-nsis'];
  const macBuild = workflow.jobs['build-mac-pkg'];
  const releaseJob = workflow.jobs['create-release'];
  const releaseSteps = releaseJob.steps;
  const validateStep = releaseSteps.find(step => step.name === 'Validate Foundry registry request');
  const publishStep = releaseSteps.find(step => step.name === 'Publish Foundry registry release');

  assert.match(dryRunJob.if, /inputs\.dry_run_foundry/);
  assert.match(windowsBuild.if, /inputs\.dry_run_foundry != true/);
  assert.match(macBuild.if, /inputs\.dry_run_foundry != true/);
  assert.equal(releaseJob.permissions.contents, 'write');
  assert.match(
    dryRunJob.steps.find(step => step.name === 'Render Foundry registry request').run,
    /publish-foundry-release\.mjs --dry-run/
  );
  assert.match(validateStep.run, /publish-foundry-release\.mjs --dry-run/);
  assert.match(publishStep.run, /publish-foundry-release\.mjs --publish/);
  assert.match(publishStep.if, /FOUNDRY_REGISTRY_PUBLISH_ENABLED/);
  assert.match(publishStep.if, /FOUNDRY_REGISTRY_AUTHORIZED_REPOSITORY/);
  assert.match(publishStep.if, /github\.repository/);
  assert.doesNotMatch(workflowText, /foundryvtt\.com\/_api\/packages\/release_version/);
  assert.match(workflowText, /Artifact version.*does not match package\.json version/);
  assert.match(workflowText, /"version": "\$\{PACKAGE_VERSION#v\}"/);
  assert.doesNotMatch(workflowText, /"version": "\$\{\{ env\.PACKAGE_VERSION \}\}"/);
});
