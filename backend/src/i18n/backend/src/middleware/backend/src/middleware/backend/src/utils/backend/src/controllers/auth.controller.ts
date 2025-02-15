import { Controller, Get, Req } from '@nestjs/common';
import i18n from '../i18n/i18n.config';

@Controller('auth')
export class AuthController {
  @Get('welcome')
  async getWelcomeMessage(@Req() req) {
    return { message: i18n.t('welcome', { lng: req.language }) };
  }
}
