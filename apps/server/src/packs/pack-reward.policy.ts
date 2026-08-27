import { ServiceUnavailableException } from '@nestjs/common';
import type { Element, Grade } from '../cards/gameplay.types';

export const PACK_REWARD_POLICY = Symbol('PACK_REWARD_POLICY');

export interface PackRewardPolicy {
  readonly version: string;
  draw(): { element: Element; grade: Grade };
}

export const UNCONFIGURED_PACK_REWARD_POLICY: PackRewardPolicy = {
  version: 'unconfigured',
  draw() {
    throw new ServiceUnavailableException('PACK_PROBABILITY_NOT_CONFIGURED');
  },
};
