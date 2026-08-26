import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import type { MembershipService } from './membership.service';

@Controller('api/v1')
export class MembershipController {
  constructor(private readonly membership: MembershipService) {}

  @Post('user-sessions')
  initializeSession(@Body() body: { tossGameUserHash?: unknown }) {
    return this.membership.initializeSession(body.tossGameUserHash);
  }

  @Get('users/me')
  getCurrentUser(@Headers('authorization') authorization?: string) {
    return this.membership.getCurrentUser(readBearerToken(authorization));
  }

  @Patch('users/me')
  updateCurrentUser(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: { displayName?: unknown },
  ) {
    return this.membership.updateDisplayName(
      readBearerToken(authorization),
      body.displayName,
    );
  }

  @Delete('user-sessions/current')
  @HttpCode(204)
  revokeSession(@Headers('authorization') authorization?: string) {
    return this.membership.revokeSession(readBearerToken(authorization));
  }
}

function readBearerToken(authorization?: string): string {
  const match = /^Bearer ([A-Za-z0-9_-]+)$/.exec(authorization ?? '');
  if (!match) throw new UnauthorizedException('INVALID_AUTHORIZATION_HEADER');
  const token = match[1];
  if (!token) throw new UnauthorizedException('INVALID_AUTHORIZATION_HEADER');
  return token;
}
