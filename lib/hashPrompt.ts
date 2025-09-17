import { createHash } from 'crypto';

export function normalizePrompt(prompt: string): string {
  return prompt
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

export function hashPrompt(prompt: string): string {
  const normalized = normalizePrompt(prompt);
  return createHash('sha256').update(normalized).digest('hex');
}
