import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Default model as specified in the project scope
export const AI_MODEL = 'claude-sonnet-4-20250514';
export const AI_MAX_TOKENS = 4096;
