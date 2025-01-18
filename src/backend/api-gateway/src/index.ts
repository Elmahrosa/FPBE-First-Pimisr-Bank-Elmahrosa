import express, { Express, Request, Response, NextFunction } from 'express'; // ^4.18.0
import helmet from 'helmet'; // ^6.0.0
import morgan from 'morgan'; // ^1.10.0
import compression from 'compression'; // ^1.7.4
import dotenv from 'dotenv'; // ^16.0.0
import pino from 'pino'; // ^8.0.0
import Boom from '@hapi/boom'; // ^10.0.0
import cluster from 'cluster';
import os from 'os';

// Import configurations and middleware
import { kongConfig } from './config/kong.config';
import corsMiddleware from './middleware/cors';
import jwtValidatorMiddleware from './middleware/jwt-validator';
import rateLimitMiddleware from './middleware/rate-limiter';

// Initialize environment variables
dotenv.config();

// Constants from environment
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';
const MAX_REQUEST_SIZE = process.env.MAX_REQUEST_SIZE || '10mb';

// Configure logger
const logger = pino({
  level: NODE_ENV === 'production' ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

// Error handler interface
interface ApiError extends Error {
  statusCode?: number;
  details?: any;
}

// Configure middleware stack
const configureMiddleware = (app: Express): void => {
  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
  }));

  // CORS configuration
  app.use(corsMiddleware);

  // Request parsing
  app.use(express.json({ limit: MAX_REQUEST_SIZE }));
  app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_SIZE }));

  // Compression
  app.use(compression({
    level: 6,
    threshold: 10 * 1024, // 10KB
    filter: (req: Request) => {
      const contentType = req.headers['content-type'] || '';
      return /json|text|javascript|css/.test(contentType);
    },
  }));

  // Request logging
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
    skip: (req) => req.path === '/health' || req.path === '/metrics',
  }));

  // Rate limiting
  app.use(rateLimitMiddleware);

  // JWT validation
  app.use(jwtValidatorMiddleware);

  // Request tracking
  app.use((req: Request, res: Response, next: NextFunction) => {
    req.id = req.headers['x-request-id'] || crypto.randomUUID();
    res.setHeader('X-Request-ID', req.id);
    next();
  });
};

// Configure Kong routes and proxy settings
const setupKongRoutes = (app: Express): void => {
  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Metrics endpoint
  app.get('/metrics', (req: Request, res: Response) => {
    res.status(200).json({
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    });
  });

  // Configure service routes from Kong config
  kongConfig.routes.forEach((route) => {
    const service = kongConfig.services.find(s => s.name === route.service);
    if (!service) return;

    route.methods.forEach((method) => {
      app[method.toLowerCase() as keyof Express](route.paths[0], async (req: Request, res: Response, next: NextFunction) => {
        try {
          // Route-specific logic here
          next();
        } catch (error) {
          next(error);
        }
      });
    });
  });
};

// Global error handler
const errorHandler = (err: ApiError, req: Request, res: Response, next: NextFunction): void => {
  logger.error({
    err,
    req: {
      id: req.id,
      method: req.method,
      path: req.path,
      query: req.query,
      headers: req.headers,
    },
  });

  if (Boom.isBoom(err)) {
    res.status(err.output.statusCode).json(err.output.payload);
  } else {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: NODE_ENV === 'production' ? 'Internal Server Error' : err.message,
      correlationId: req.id,
      ...(NODE_ENV !== 'production' && { stack: err.stack }),
    });
  }
};

// Initialize and start server
const startServer = async (): Promise<void> => {
  try {
    const app = express();

    // Configure middleware and routes
    configureMiddleware(app);
    setupKongRoutes(app);

    // Error handling
    app.use(errorHandler);

    // Graceful shutdown handler
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, starting graceful shutdown`);
      // Implement graceful shutdown logic here
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    if (cluster.isPrimary && NODE_ENV === 'production') {
      const numCPUs = os.cpus().length;
      logger.info(`Master process starting, forking ${numCPUs} workers`);
      
      for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
      }

      cluster.on('exit', (worker, code, signal) => {
        logger.warn(`Worker ${worker.process.pid} died, starting new worker`);
        cluster.fork();
      });
    } else {
      app.listen(PORT, () => {
        logger.info(`API Gateway listening on port ${PORT} in ${NODE_ENV} mode`);
      });
    }

    // Export app for testing
    export default app;
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}