// External dependencies
import express, { Application, Request, Response, NextFunction } from 'express'; // ^4.17.1
import cors from 'cors'; // ^2.8.5
import helmet from 'helmet'; // ^4.6.0
import morgan from 'morgan'; // ^1.10.0
import { Container } from 'inversify'; // ^6.0.1
import dotenv from 'dotenv'; // ^16.0.0
import rateLimit from 'express-rate-limit'; // ^6.0.0
import winston from 'winston'; // ^3.8.0
import { v4 as uuidv4 } from 'uuid'; // ^8.3.2

// Internal imports
import { authConfig } from './config/auth.config';
import configureRoutes from './routes/auth.routes';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { BiometricService } from './services/biometric.service';
import { JWTService } from './services/jwt.service';
import { User } from './models/user.model';

// Load environment variables
dotenv.config();

// Initialize Express application
const app: Application = express();
const container = new Container();
const PORT = process.env.PORT || 3001;

// Initialize Winston logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    defaultMeta: { service: 'auth-service' },
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

/**
 * Configures comprehensive Express middleware stack
 */
function configureMiddleware(): void {
    // CORS configuration with strict origin policy
    app.use(cors({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Device-Id', 'X-Correlation-Id'],
        maxAge: 600 // 10 minutes
    }));

    // Enhanced security headers
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"],
                imgSrc: ["'self'"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"]
            }
        },
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));

    // Rate limiting configuration
    const apiLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false
    });
    app.use('/api/', apiLimiter);

    // Request logging
    app.use(morgan('combined', {
        stream: {
            write: (message: string) => logger.info(message.trim())
        }
    }));

    // Body parsing middleware with size limits
    app.use(express.json({ limit: '10kb' }));
    app.use(express.urlencoded({ extended: true, limit: '10kb' }));

    // Correlation ID middleware
    app.use((req: Request, res: Response, next: NextFunction) => {
        req.headers['x-correlation-id'] = req.headers['x-correlation-id'] || uuidv4();
        next();
    });

    // Error handling middleware
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
        logger.error('Unhandled error:', {
            error: err.message,
            stack: err.stack,
            correlationId: req.headers['x-correlation-id']
        });

        res.status(500).json({
            error: 'Internal Server Error',
            correlationId: req.headers['x-correlation-id']
        });
    });
}

/**
 * Configures dependency injection container
 */
function configureDependencies(): void {
    // Bind services
    container.bind<AuthService>('AuthService').to(AuthService);
    container.bind<BiometricService>('BiometricService').to(BiometricService);
    container.bind<JWTService>('JWTService').to(JWTService);
    container.bind<AuthController>('AuthController').to(AuthController);

    // Bind models
    container.bind<typeof User>('UserModel').toConstantValue(User);

    // Bind configuration
    container.bind('AuthConfig').toConstantValue(authConfig);
}

/**
 * Starts the Express HTTP server
 */
async function startServer(): Promise<void> {
    try {
        // Configure middleware and dependencies
        configureMiddleware();
        configureDependencies();

        // Configure routes
        app.use('/api/v1/auth', configureRoutes());

        // Health check endpoint
        app.get('/health', (req: Request, res: Response) => {
            res.status(200).json({
                status: 'healthy',
                timestamp: new Date().toISOString()
            });
        });

        // Start server
        app.listen(PORT, () => {
            logger.info(`Authentication service started on port ${PORT}`);
        });

        // Graceful shutdown handler
        process.on('SIGTERM', () => {
            logger.info('SIGTERM received. Starting graceful shutdown...');
            // Implement graceful shutdown logic here
        });

    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
startServer().catch(error => {
    logger.error('Unhandled server error:', error);
    process.exit(1);
});

export { app, container };