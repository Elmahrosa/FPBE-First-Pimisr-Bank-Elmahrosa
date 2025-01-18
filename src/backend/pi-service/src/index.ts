// External dependencies
import express from 'express'; // ^4.17.1
import helmet from 'helmet'; // ^4.6.0
import cors from 'cors'; // ^2.8.5
import morgan from 'morgan'; // ^1.10.0
import winston from 'winston'; // ^3.8.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import { Registry, collectDefaultMetrics } from 'prom-client'; // ^14.0.0

// Internal imports
import { piConfig } from './config/pi.config';
import router from './routes/pi.routes';
import { PiSDKService } from './services/pi-sdk.service';

// Constants
const PORT = process.env.PORT || 3003;
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 100;

// Initialize logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'pi-service.log' })
    ]
});

// Initialize Prometheus metrics
const metrics = new Registry();
collectDefaultMetrics({ register: metrics });

// Custom metrics
const httpRequestDuration = new metrics.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status']
});

const errorCounter = new metrics.Counter({
    name: 'pi_service_errors_total',
    help: 'Total number of errors in Pi service'
});

/**
 * Configure comprehensive Express middleware stack
 */
function setupMiddleware(app: express.Application): void {
    // Security middleware
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'", piConfig.network.mainnet.rpcEndpoint]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));

    // CORS configuration
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        exposedHeaders: ['X-Request-ID'],
        credentials: true,
        maxAge: 600 // 10 minutes
    }));

    // Request logging
    app.use(morgan('combined', {
        stream: { write: message => logger.info(message.trim()) }
    }));

    // Body parsing
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Rate limiting
    const limiter = rateLimit({
        windowMs: RATE_LIMIT_WINDOW,
        max: RATE_LIMIT_MAX,
        message: 'Too many requests from this IP'
    });
    app.use(limiter);

    // Request timing
    app.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            httpRequestDuration.observe(
                { method: req.method, route: req.route?.path || req.path, status: res.statusCode },
                duration / 1000
            );
        });
        next();
    });
}

/**
 * Configure API routes with validation and monitoring
 */
function setupRoutes(app: express.Application): void {
    // Health check endpoint
    app.get('/health', (req, res) => {
        res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
    });

    // Metrics endpoint
    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', metrics.contentType);
            res.end(await metrics.metrics());
        } catch (error) {
            res.status(500).end();
        }
    });

    // API routes
    app.use('/api/v1/pi', router);

    // Error handling middleware
    app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
        logger.error('Unhandled error:', {
            error: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method
        });
        errorCounter.inc();
        res.status(500).json({
            error: 'Internal server error',
            requestId: req.headers['x-request-id']
        });
    });
}

/**
 * Initialize and start the Express server
 */
async function startServer(): Promise<void> {
    try {
        // Initialize Pi SDK
        const piSDKService = new PiSDKService();
        await piSDKService.initializeSdk();

        // Create Express application
        const app = express();

        // Setup middleware and routes
        setupMiddleware(app);
        setupRoutes(app);

        // Start server
        const server = app.listen(PORT, () => {
            logger.info(`Pi service started on port ${PORT}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received, shutting down gracefully');
            server.close(() => {
                logger.info('Server closed');
                process.exit(0);
            });
        });

        // Export app for testing
        export const app;

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

/**
 * Enhanced global error handler
 */
function handleUncaughtErrors(error: Error): void {
    logger.error('Uncaught exception:', {
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
    });
    errorCounter.inc();

    // Attempt recovery or graceful shutdown
    if (process.env.NODE_ENV === 'production') {
        process.exit(1);
    }
}

// Register global error handlers
process.on('uncaughtException', handleUncaughtErrors);
process.on('unhandledRejection', handleUncaughtErrors);

// Start the server
startServer().catch(handleUncaughtErrors);