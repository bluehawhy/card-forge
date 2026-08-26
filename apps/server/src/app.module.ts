import { Module } from '@nestjs/common';
import { CardsController } from './cards/cards.controller';
import { CardsService } from './cards/cards.service';
import { GAME_REPOSITORY } from './cards/gameplay.types';
import { PostgresGameRepository } from './cards/postgres-game.repository';
import { SERVER_CONFIG, type ServerConfig, loadServerConfig } from './config';
import { EnhancementController } from './enhancement/enhancement.controller';
import { EnhancementService } from './enhancement/enhancement.service';
import { ExchangeController } from './exchange/exchange.controller';
import { ExchangeService } from './exchange/exchange.service';
import { FraudDetectionService } from './fraud-detection/fraud-detection.service';
import { MembershipController } from './membership/membership.controller';
import { MembershipService } from './membership/membership.service';
import {
  TOSS_GAME_USER_VERIFIER,
  USER_REPOSITORY,
} from './membership/membership.types';
import { PostgresUserRepository } from './membership/postgres-user.repository';
import { HttpTossGameUserVerifier } from './membership/toss-game-user.verifier';
import { PacksController } from './packs/packs.controller';
import { PacksService } from './packs/packs.service';

@Module({
  controllers: [
    MembershipController,
    CardsController,
    PacksController,
    EnhancementController,
    ExchangeController,
  ],
  providers: [
    {
      provide: SERVER_CONFIG,
      useFactory: (): ServerConfig => loadServerConfig(),
    },
    MembershipService,
    CardsService,
    PacksService,
    EnhancementService,
    ExchangeService,
    FraudDetectionService,
    {
      provide: USER_REPOSITORY,
      inject: [SERVER_CONFIG],
      useFactory: (config: ServerConfig) => new PostgresUserRepository(config),
    },
    {
      provide: TOSS_GAME_USER_VERIFIER,
      inject: [SERVER_CONFIG],
      useFactory: (config: ServerConfig) =>
        new HttpTossGameUserVerifier(config),
    },
    {
      provide: GAME_REPOSITORY,
      inject: [SERVER_CONFIG],
      useFactory: (config: ServerConfig) => new PostgresGameRepository(config),
    },
  ],
})
export class AppModule {}
