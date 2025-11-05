import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseArgs, validateArgs, type CliArgs } from '../cli';

describe('CLI LLM Flags (Phase 4 WS-F2 Stage C)', () => {
  let consoleWarnSpy: any;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('--llm-provider flag', () => {
    it('should accept valid provider: anthropic', () => {
      const args = parseArgs(['node', 'ceps', '--llm-provider', 'anthropic']);
      expect(args.llmProvider).toBe('anthropic');
    });

    it('should accept valid provider: openai', () => {
      const args = parseArgs(['node', 'ceps', '--llm-provider', 'openai']);
      expect(args.llmProvider).toBe('openai');
    });

    it('should accept valid provider: azure', () => {
      const args = parseArgs(['node', 'ceps', '--llm-provider', 'azure']);
      expect(args.llmProvider).toBe('azure');
    });

    it('should accept valid provider: local', () => {
      const args = parseArgs(['node', 'ceps', '--llm-provider', 'local']);
      expect(args.llmProvider).toBe('local');
    });

    it('should reject unsupported provider with descriptive error', () => {
      const args = parseArgs(['node', 'ceps', '--llm-provider', 'invalid-provider']);
      expect(() => validateArgs(args)).toThrow(
        'Invalid provider: invalid-provider. Supported: anthropic, openai, azure, local'
      );
    });

    it('should throw error if --llm-provider has no value', () => {
      expect(() => parseArgs(['node', 'ceps', '--llm-provider'])).toThrow(
        '--llm-provider requires a value'
      );
    });
  });

  describe('--llm-model flag', () => {
    it('should accept model name string', () => {
      const args = parseArgs(['node', 'ceps', '--llm-model', 'gpt-4']);
      expect(args.llmModel).toBe('gpt-4');
    });

    it('should accept model name with special characters', () => {
      const args = parseArgs(['node', 'ceps', '--llm-model', 'claude-3-opus-20240229']);
      expect(args.llmModel).toBe('claude-3-opus-20240229');
    });

    it('should throw error if --llm-model has no value', () => {
      expect(() => parseArgs(['node', 'ceps', '--llm-model'])).toThrow(
        '--llm-model requires a value'
      );
    });
  });

  describe('--llm-budget flag', () => {
    it('should accept positive integer', () => {
      const args = parseArgs(['node', 'ceps', '--llm-budget', '30000']);
      expect(args.llmBudget).toBe(30000);
    });

    it('should reject zero budget', () => {
      const args = parseArgs(['node', 'ceps', '--llm-budget', '0']);
      expect(() => validateArgs(args)).toThrow('--llm-budget must be a positive integer');
    });

    it('should reject negative budget', () => {
      const args = parseArgs(['node', 'ceps', '--llm-budget', '-100']);
      expect(() => validateArgs(args)).toThrow('--llm-budget must be a positive integer');
    });

    it('should reject non-integer budget', () => {
      const args = parseArgs(['node', 'ceps', '--llm-budget', '100.5']);
      expect(() => validateArgs(args)).toThrow('--llm-budget must be a positive integer');
    });

    it('should throw error if --llm-budget has no value', () => {
      expect(() => parseArgs(['node', 'ceps', '--llm-budget'])).toThrow(
        '--llm-budget requires a value'
      );
    });
  });

  describe('--no-llm-cache flag', () => {
    it('should set noLlmCache to true', () => {
      const args = parseArgs(['node', 'ceps', '--no-llm-cache']);
      expect(args.noLlmCache).toBe(true);
    });

    it('should warn when --llm is off', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'off', '--no-llm-cache']);
      validateArgs(args);
      // When --llm off is used with --no-llm-cache, the batch warning takes precedence
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: --llm is off; ignoring --no-llm-cache'
      );
    });

    it('should not warn when --llm is on', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'on', '--no-llm-cache']);
      validateArgs(args);
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe('Flag interactions', () => {
    it('should warn when --llm off with --llm-provider', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'off', '--llm-provider', 'openai']);
      validateArgs(args);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: --llm is off; ignoring --llm-provider')
      );
      // Verify flag was cleared
      expect(args.llmProvider).toBeUndefined();
    });

    it('should warn when --llm off with --llm-model', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'off', '--llm-model', 'gpt-4']);
      validateArgs(args);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: --llm is off; ignoring --llm-model')
      );
      // Verify flag was cleared
      expect(args.llmModel).toBeUndefined();
    });

    it('should warn when --llm off with --llm-budget', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'off', '--llm-budget', '30000']);
      validateArgs(args);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Warning: --llm is off; ignoring --llm-budget')
      );
      // Verify flag was cleared
      expect(args.llmBudget).toBeUndefined();
    });

    it('should warn when --llm off with multiple llm flags', () => {
      const args = parseArgs([
        'node',
        'ceps',
        '--llm',
        'off',
        '--llm-provider',
        'openai',
        '--llm-model',
        'gpt-4',
        '--llm-budget',
        '30000',
        '--no-llm-cache',
      ]);
      validateArgs(args);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Warning: --llm is off; ignoring --llm-provider, --llm-model, --llm-budget, --no-llm-cache'
      );
      // Verify all flags were cleared
      expect(args.llmProvider).toBeUndefined();
      expect(args.llmModel).toBeUndefined();
      expect(args.llmBudget).toBeUndefined();
      expect(args.noLlmCache).toBeUndefined();
    });
  });

  describe('--llm flag parsing', () => {
    it('should parse --llm on', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'on']);
      expect(args.llm).toBe('on');
    });

    it('should parse --llm off', () => {
      const args = parseArgs(['node', 'ceps', '--llm', 'off']);
      expect(args.llm).toBe('off');
    });

    it('should throw error if --llm has invalid value', () => {
      expect(() => parseArgs(['node', 'ceps', '--llm', 'invalid'])).toThrow(
        '--llm must be either "on" or "off"'
      );
    });

    it('should throw error if --llm has no value', () => {
      expect(() => parseArgs(['node', 'ceps', '--llm'])).toThrow('--llm requires a value');
    });
  });

  describe('Combined flag parsing', () => {
    it('should parse multiple LLM flags together when --llm is on', () => {
      const args = parseArgs([
        'node',
        'ceps',
        '--llm',
        'on',
        '--llm-provider',
        'anthropic',
        '--llm-model',
        'claude-3-opus',
        '--llm-budget',
        '50000',
        '--no-llm-cache',
      ]);
      expect(args.llm).toBe('on');
      expect(args.llmProvider).toBe('anthropic');
      expect(args.llmModel).toBe('claude-3-opus');
      expect(args.llmBudget).toBe(50000);
      expect(args.noLlmCache).toBe(true);
    });
  });
});
