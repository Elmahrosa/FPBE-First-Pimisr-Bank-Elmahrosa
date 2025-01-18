import { 
  Controller, 
  Post, 
  Get, 
  Put,
  Body, 
  Param, 
  UseGuards, 
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  HttpStatus,
  HttpException
} from '@nestjs/common'; // ^8.0.0
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger'; // ^5.0.0
import { RateLimit } from '@nestjs/throttler'; // ^3.0.0
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager'; // ^1.0.0
import { Logger } from '@nestjs/common';

import { MiningService } from '../services/mining.service';
import { 
  MiningSession, 
  DeviceInfo, 
  MiningStatus, 
  ValidationResult 
} from '../models/mining.model';

// Constants
const API_VERSION = 'v1';
const MINING_RATE_LIMIT = { ttl: 60000, limit: 10 };
const CACHE_TTL = 15000; // 15 seconds
const MAX_RETRIES = 3;

@Controller(`${API_VERSION}/mining`)
@ApiTags('Mining')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor, ErrorInterceptor)
export class MiningController {
  private readonly logger: Logger;

  constructor(
    private readonly miningService: MiningService,
    logger: Logger
  ) {
    this.logger = logger;
  }

  @Post('/start')
  @RateLimit(MINING_RATE_LIMIT)
  @UsePipes(new ValidationPipe({ transform: true }))
  @ApiOperation({ summary: 'Start mining session' })
  @ApiBody({ type: DeviceInfo })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    type: MiningSession,
    description: 'Mining session started successfully'
  })
  @ApiResponse({ 
    status: HttpStatus.TOO_MANY_REQUESTS, 
    description: 'Rate limit exceeded'
  })
  async startMining(@Body() deviceInfo: DeviceInfo): Promise<MiningSession> {
    try {
      this.logger.log('Starting mining session', { deviceInfo });
      
      // Performance tracking start
      const startTime = Date.now();

      // Start mining with retry mechanism
      let attempts = 0;
      let lastError: Error;

      while (attempts < MAX_RETRIES) {
        try {
          const session = await this.miningService.startMining(deviceInfo);
          
          // Log performance metrics
          const duration = Date.now() - startTime;
          this.logger.log('Mining session started successfully', {
            sessionId: session.sessionId,
            duration,
            attempts: attempts + 1
          });

          return session;
        } catch (error) {
          lastError = error;
          attempts++;
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      throw lastError;
    } catch (error) {
      this.logger.error('Failed to start mining session', { 
        error: error.message,
        deviceInfo 
      });
      throw new HttpException(
        'Failed to start mining session',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('/stop/:sessionId')
  @ApiOperation({ summary: 'Stop mining session' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK,
    description: 'Mining session stopped successfully'
  })
  async stopMining(@Param('sessionId') sessionId: string): Promise<void> {
    try {
      this.logger.log('Stopping mining session', { sessionId });
      await this.miningService.stopMining(sessionId);
      
      this.logger.log('Mining session stopped successfully', { sessionId });
    } catch (error) {
      this.logger.error('Failed to stop mining session', { 
        sessionId,
        error: error.message 
      });
      throw new HttpException(
        'Failed to stop mining session',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('/status/:sessionId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL)
  @ApiOperation({ summary: 'Get mining session status' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    type: MiningSession 
  })
  async getMiningStatus(@Param('sessionId') sessionId: string): Promise<MiningSession> {
    try {
      const startTime = Date.now();
      const session = await this.miningService.getMiningStatus(sessionId);

      // Log performance metrics
      const duration = Date.now() - startTime;
      this.logger.log('Mining status retrieved', { 
        sessionId,
        duration,
        status: session.status
      });

      return session;
    } catch (error) {
      this.logger.error('Failed to get mining status', {
        sessionId,
        error: error.message
      });
      throw new HttpException(
        'Failed to get mining status',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('/rewards/:sessionId')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(CACHE_TTL)
  @ApiOperation({ summary: 'Get mining session rewards' })
  @ApiParam({ name: 'sessionId', type: String })
  @ApiResponse({ 
    status: HttpStatus.OK,
    description: 'Mining rewards retrieved successfully'
  })
  async getMiningRewards(@Param('sessionId') sessionId: string): Promise<number> {
    try {
      const startTime = Date.now();
      const rewards = await this.miningService.calculateMiningRewards(sessionId);

      // Log performance metrics
      const duration = Date.now() - startTime;
      this.logger.log('Mining rewards calculated', {
        sessionId,
        duration,
        rewards
      });

      return rewards;
    } catch (error) {
      this.logger.error('Failed to calculate mining rewards', {
        sessionId,
        error: error.message
      });
      throw new HttpException(
        'Failed to calculate mining rewards',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}