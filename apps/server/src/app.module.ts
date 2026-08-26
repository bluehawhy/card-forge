import { Module } from '@nestjs/common';
import { SERVER_CONFIG, type ServerConfig, loadServerConfig } from './config';
import { MembershipController } from './membership/membership.controller';
import { MembershipService } from './membership/membership.service';
import {
  TOSS_GAME_USER_VERIFIER,
  USER_REPOSITORY,
} from './membership/membership.types';
import { PostgresUserRepository } from './membership/postgres-user.repository';
import { HttpTossGameUserVerifier } from './membership/toss-game-user.verifier';

@Module({
  controllers: [MembershipController],
  providers: [
    {
      provide: SERVER_CONFIG,
      useFactory: (): ServerConfig => loadServerConfig(),
    },
    MembershipService,
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
  ],
})
export class AppModule {}
