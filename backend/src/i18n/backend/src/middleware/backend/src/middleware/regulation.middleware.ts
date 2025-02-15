import { NestMiddleware } from '@nestjs/common';
import { detectLocation } from '../utils/geoip';

export class RegulationMiddleware implements NestMiddleware {
  use(req: any, res: any, next: () => void) {
    const country = detectLocation(req.ip);
    req.regulation = country === 'US' ? { maxDailyLimit: 10000 } : { maxDailyLimit: 5000 };
    next();
  }
}
