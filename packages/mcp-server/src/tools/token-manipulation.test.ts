import { describe, expect, it, vi } from 'vitest';
import { TokenManipulationTools } from './token-manipulation.js';

function makeTools(result: any = { success: true }) {
  const query = vi.fn(async () => result);
  const logger: any = {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    child: () => logger,
  };
  const tools = new TokenManipulationTools({ foundryClient: { query } as any, logger });
  return { query, tools };
}

describe('TokenManipulationTools placed token actions', () => {
  it('exposes action discovery and execution tools', () => {
    const definitions = makeTools().tools.getToolDefinitions();
    expect(definitions.map(definition => definition.name)).toEqual(
      expect.arrayContaining(['get-token-actions', 'use-token-action'])
    );
  });

  it('gets actions for a placed token', async () => {
    const response = { success: true, tokenId: 'token-1', actions: [] };
    const { query, tools } = makeTools(response);

    await expect(tools.handleGetTokenActions({ tokenId: 'token-1' })).resolves.toBe(response);
    expect(query).toHaveBeenCalledWith('foundry-mcp-bridge.getTokenActions', {
      tokenId: 'token-1',
    });
  });

  it('executes an item using the placed token synthetic actor', async () => {
    const { query, tools } = makeTools();

    await tools.handleUseTokenAction({
      tokenId: 'token-1',
      actionIdentifier: 'Bite',
      targets: ['token-2'],
    });

    expect(query).toHaveBeenCalledWith('foundry-mcp-bridge.useItem', {
      actorIdentifier: 'token-1',
      itemIdentifier: 'Bite',
      targets: ['token-2'],
      options: {
        consume: true,
        spellLevel: undefined,
        skipDialog: true,
      },
    });
  });
});

describe('TokenManipulationTools result handling', () => {
  it('returns the actual move result', async () => {
    const { tools } = makeTools({
      success: false,
      tokenId: 'token-1',
      tokenName: 'Goblin',
      newPosition: { x: 1, y: 2 },
      animated: false,
    });

    await expect(
      tools.handleMoveToken({ tokenId: 'token-1', x: 100, y: 200, animate: true })
    ).resolves.toMatchObject({
      success: false,
      newPosition: { x: 1, y: 2 },
      animated: false,
    });
  });

  it('maps deleted and failed token IDs from the bridge response', async () => {
    const { tools } = makeTools({
      success: true,
      deletedCount: 1,
      deletedTokens: ['token-1'],
      failedTokens: ['token-2'],
    });

    await expect(
      tools.handleDeleteTokens({ tokenIds: ['token-1', 'token-2'] })
    ).resolves.toMatchObject({
      tokenIds: ['token-1'],
      failedTokenIds: ['token-2'],
    });
  });
});
