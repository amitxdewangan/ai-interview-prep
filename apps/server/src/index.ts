import { AppendixAKit, AppendixAKitSchema } from '@repo/shared';

export function validateKit(data: unknown): AppendixAKit {
  return AppendixAKitSchema.parse(data);
}

export const SERVER_STATUS = 'Server initialized';
