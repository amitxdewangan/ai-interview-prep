import { AppendixAKit, BatchOutputFile } from '@repo/shared';

export function getClientMetadata(): { app: string } {
  return { app: 'AI Interview Prep Client' };
}

export type { AppendixAKit, BatchOutputFile };
