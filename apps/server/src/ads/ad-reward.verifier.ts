import { ServiceUnavailableException } from '@nestjs/common';

export const AD_REWARD_VERIFIER = Symbol('AD_REWARD_VERIFIER');

export type AdRewardPurpose = 'PACK' | 'ENHANCEMENT' | 'SALE';

export interface AdRewardVerifier {
  verify(input: {
    completionId: string;
    purpose: AdRewardPurpose;
    subjectDigest: string;
  }): Promise<boolean>;
}

export const UNCONFIGURED_AD_REWARD_VERIFIER: AdRewardVerifier = {
  verify() {
    throw new ServiceUnavailableException('AD_VERIFICATION_NOT_CONFIGURED');
  },
};

export function requireAdCompletionId(value: unknown): string {
  if (
    typeof value !== 'string' ||
    value.length < 8 ||
    value.length > 160 ||
    !/^[A-Za-z0-9._:-]+$/.test(value)
  ) {
    throw new Error('INVALID_AD_COMPLETION_ID');
  }
  return value;
}
