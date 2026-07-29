import { readFileSync } from 'node:fs';
import { validateSupabaseContactSecrets } from './validateSupabaseContactSecrets.ts';

const result = validateSupabaseContactSecrets(readFileSync(0, 'utf8'));
const write = result.ok ? console.log : console.error;
write(result.message);
if (!result.ok) process.exitCode = 1;
