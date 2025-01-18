import { Request, Response, NextFunction } from 'express'; // ^4.18.0
import rateLimit from 'express-rate-limit'; // ^6.7.0
import Redis from 'ioredis'; // ^5.3.0
import { kongConfig } from '../config/kong.config';

// Interfaces
interface RateLimitOptions {
  windowMs: number;
  max: number;
  message: string;
  statusCode: number;
  headers: boolean;
  skipFailedRequests: boolean;
  skipSuccessfulRequests: boolean;
  keyGenerator: (req: Request) => string;
  handler: (req: Request, res: Response) => void;
  store: any;
  bypassCallback?: (req: Request) => boolean;
  onRateLimited?: (req: Request, res: Response) => void;
}

interface RedisStoreOptions {
  host: string;
  port: number;
  password: string;
  prefix: string;
  client?: Redis;
  clusterNodes?: { host: string; port: number }[];
  enableReadReplicas: boolean;
  commandTimeout: number;
}

interface RateLimitMetrics {
  clientId: string;
  endpoint: string;
  requestCount: number;
  windowStart: number;
  limitExceeded: boolean;
  responseTime: number;
}

// Constants
const DEFAULT_RATE_LIMIT_OPTIONS: Partial<RateLimitOptions> = {
  windowMs: 60000, // 1 minute
  max: 100,
  message: 'Too many requests, please try again later',
  statusCode: 429,
  headers: true,
  skipFailedRequests: false,
  skipSuccessfulRequests: false
};

const REDIS_KEY_PREFIX = 'fpbe:ratelimit:';
const RATE_LIMIT_METRICS_KEY = 'fpbe:metrics:ratelimit:';
const BYPASS_ENDPOINTS = ['/health', '/metrics', '/api/v1/auth/token'];

// Redis cluster client initialization
const redisClient = new Redis.Cluster(
  kongConfig.plugins['rate-limiting'].redis_host.split(',').map(host => ({
    host: host.trim(),
    port: kongConfig.plugins['rate-limiting'].redis_port
  })),
  {
    redisOptions: {
      password: kongConfig.plugins['rate-limiting'].redis_password,
      commandTimeout: 2000,
      retryStrategy: (times: number) => Math.min(times * 50, 2000)
    },
    scaleReads: 'slave'
  }
);

// Configure Redis store for rate limiting
class RedisStore {
  private client: Redis.Cluster;
  private prefix: string;

  constructor(options: RedisStoreOptions) {
    this.client = options.client || redisClient;
    this.prefix = options.prefix || REDIS_KEY_PREFIX;
  }

  async increment(key: string): Promise<{ totalHits: number; resetTime: number }> {
    const now = Date.now();
    const windowKey = `${this.prefix}${key}`;
    
    const multi = this.client.multi();
    multi.incr(windowKey);
    multi.pttl(windowKey);

    const [hits, ttl] = await multi.exec();
    
    if (ttl === -1) {
      await this.client.pexpire(windowKey, DEFAULT_RATE_LIMIT_OPTIONS.windowMs!);
    }

    return {
      totalHits: hits?.[1] as number || 0,
      resetTime: now + (ttl?.[1] as number || DEFAULT_RATE_LIMIT_OPTIONS.windowMs!)
    };
  }

  async decrement(key: string): Promise<void> {
    await this.client.decr(`${this.prefix}${key}`);
  }

  async resetKey(key: string): Promise<void> {
    await this.client.del(`${this.prefix}${key}`);
  }
}

// Monitoring and metrics recording
async function recordRateLimitMetrics(metrics: RateLimitMetrics): Promise<void> {
  const metricsKey = `${RATE_LIMIT_METRICS_KEY}${metrics.clientId}`;
  await redisClient.hset(metricsKey, {
    endpoint: metrics.endpoint,
    requestCount: metrics.requestCount,
    windowStart: metrics.windowStart,
    limitExceeded: metrics.limitExceeded ? 1 : 0,
    responseTime: metrics.responseTime
  });
  await redisClient.expire(metricsKey, 86400); // 24 hours retention
}

// Configure rate limiting options
function configureRateLimit(monitoringConfig = kongConfig.monitoring): RateLimitOptions {
  return {
    ...DEFAULT_RATE_LIMIT_OPTIONS,
    store: new RedisStore({
      prefix: REDIS_KEY_PREFIX,
      client: redisClient,
      enableReadReplicas: true,
      commandTimeout: 2000
    }),
    keyGenerator: (req: Request): string => {
      const clientId = req.headers['x-client-id'] || req.ip;
      const endpoint = req.path;
      return `${clientId}:${endpoint}`;
    },
    bypassCallback: (req: Request): boolean => {
      return BYPASS_ENDPOINTS.some(endpoint => req.path.includes(endpoint));
    },
    handler: async (req: Request, res: Response) => {
      const clientId = req.headers['x-client-id'] || req.ip;
      const metrics: RateLimitMetrics = {
        clientId: clientId as string,
        endpoint: req.path,
        requestCount: req.rateLimit?.current || 0,
        windowStart: Date.now(),
        limitExceeded: true,
        responseTime: Date.now() - (req.startTime || Date.now())
      };
      
      await recordRateLimitMetrics(metrics);

      if (monitoringConfig.prometheus.enabled) {
        // Increment rate limit exceeded counter for Prometheus
        rateLimitExceededCounter.inc({
          client_id: clientId,
          endpoint: req.path
        });
      }

      res.status(429).json({
        error: 'Too Many Requests',
        message: DEFAULT_RATE_LIMIT_OPTIONS.message,
        retryAfter: Math.ceil(req.rateLimit?.resetTime || 0 / 1000)
      });
    }
  };
}

// Rate limit middleware
export const rateLimitMiddleware = rateLimit(configureRateLimit());

// Prometheus metrics (if enabled)
let rateLimitExceededCounter: any;
if (kongConfig.monitoring.prometheus.enabled) {
  const prometheus = require('prom-client');
  rateLimitExceededCounter = new prometheus.Counter({
    name: 'rate_limit_exceeded_total',
    help: 'Total number of rate limit exceeded events',
    labelNames: ['client_id', 'endpoint']
  });
}

export default rateLimitMiddleware;