import { NestMiddleware } from '@nestjs/common';
import i18nextMiddleware from 'i18next-http-middleware';
import i18n from '../i18n/i18n.config';

export class I18nMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    i18nextMiddleware.handle(i18n)(req, res, next);
  }
}
