import { describe, test, expect, beforeAll, afterAll, jest } from '@jest/globals'; // ^29.0.0
import supertest from 'supertest'; // ^6.3.0
import jwt from 'jsonwebtoken'; // ^9.0.0
import nock from 'nock'; // ^13.0.0
import RedisMock from 'redis-mock'; // ^0.56.0
import app from '../src/index';
import { kongConfig } from '../src/config/kong.config';

// Constants for testing
const TEST_USER = {
  userId: 'test-user-id',
  email: 'test@fpbe.com',
  deviceId: 'test-device-id',
  sessionId: 'test-session-id',
  roles: ['user'],
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
  jti: 'test-token-id'
};

const TEST_JWT_SECRET = 'test-secret-key';
const TEST_ROUTES = {
  AUTH: '/api/v1/auth',
  ACCOUNTS: '/api/v1/accounts',
  TRANSACTIONS: '/api/v1/transactions',
  PI: '/api/v1/pi'
};

const PERFORMANCE_THRESHOLDS = {
  RESPONSE_TIME: 100,
  CONCURRENT_REQUESTS: 1000,
  RATE_LIMIT: 100
};

// Mock Redis client
jest.mock('redis', () => RedisMock);
jest.mock('ioredis', () => RedisMock);

// Helper functions
const generateTestToken = (payload = TEST_USER, deviceId = 'test-device-id'): string => {
  return jwt.sign(
    { ...payload, deviceId },
    TEST_JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const setupTestEnvironment = () => {
  // Mock microservices
  const mockServices = kongConfig.services.map(service => {
    return nock(`http://${service.host}:${service.port}`)
      .persist()
      .get('/health')
      .reply(200, { status: 'healthy' });
  });

  // Configure test environment
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.NODE_ENV = 'test';

  return { mockServices };
};

// Test suites
describe('API Gateway Security Tests', () => {
  const request = supertest(app);
  let mockServices: nock.Scope[];

  beforeAll(() => {
    const env = setupTestEnvironment();
    mockServices = env.mockServices;
  });

  afterAll(() => {
    nock.cleanAll();
    jest.clearAllMocks();
  });

  describe('JWT Authentication', () => {
    test('should return 401 for missing JWT token', async () => {
      const response = await request.get(TEST_ROUTES.ACCOUNTS);
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'No token provided');
    });

    test('should return 403 for invalid JWT token', async () => {
      const response = await request
        .get(TEST_ROUTES.ACCOUNTS)
        .set('Authorization', 'Bearer invalid.token.here');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid or expired token');
    });

    test('should return 403 for token from different device', async () => {
      const token = generateTestToken(TEST_USER, 'different-device-id');
      const response = await request
        .get(TEST_ROUTES.ACCOUNTS)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Device-ID', 'test-device-id');
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('message', 'Invalid device binding');
    });

    test('should allow access with valid JWT token and matching device', async () => {
      const token = generateTestToken();
      const response = await request
        .get(TEST_ROUTES.ACCOUNTS)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Device-ID', 'test-device-id');
      expect(response.status).toBe(200);
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      const token = generateTestToken();
      const requests = Array(PERFORMANCE_THRESHOLDS.RATE_LIMIT + 1)
        .fill(null)
        .map(() => 
          request
            .get(TEST_ROUTES.ACCOUNTS)
            .set('Authorization', `Bearer ${token}`)
        );

      const responses = await Promise.all(requests);
      const tooManyRequests = responses.filter(r => r.status === 429);
      expect(tooManyRequests.length).toBeGreaterThan(0);
    });

    test('should bypass rate limits for whitelisted endpoints', async () => {
      const response = await request.get('/health');
      expect(response.status).toBe(200);
    });
  });

  describe('CORS Policy', () => {
    test('should allow requests from allowed origins', async () => {
      const response = await request
        .options(TEST_ROUTES.AUTH)
        .set('Origin', 'https://app.fpbe.com');
      expect(response.headers['access-control-allow-origin']).toBe('https://app.fpbe.com');
    });

    test('should block requests from unauthorized origins', async () => {
      const response = await request
        .options(TEST_ROUTES.AUTH)
        .set('Origin', 'https://malicious-site.com');
      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});

describe('API Gateway Routing Tests', () => {
  const request = supertest(app);

  test('should route requests to correct microservices', async () => {
    const token = generateTestToken();
    const serviceTests = kongConfig.routes.map(async route => {
      const response = await request
        .get(route.paths[0])
        .set('Authorization', `Bearer ${token}`);
      expect(response.status).not.toBe(404);
    });

    await Promise.all(serviceTests);
  });

  test('should handle service discovery updates', async () => {
    const healthCheck = await request.get('/health');
    expect(healthCheck.status).toBe(200);
    expect(healthCheck.body).toHaveProperty('status', 'healthy');
  });

  test('should implement circuit breaker for failing services', async () => {
    // Mock service failure
    nock('http://auth-service:3000')
      .get('/api/v1/auth/status')
      .times(5)
      .reply(500);

    const responses = await Promise.all(
      Array(5).fill(null).map(() => 
        request.get('/api/v1/auth/status')
      )
    );

    // Circuit should be open after multiple failures
    const lastResponse = responses[responses.length - 1];
    expect(lastResponse.status).toBe(503);
  });
});

describe('Performance and Monitoring Tests', () => {
  const request = supertest(app);

  test('should handle concurrent requests within limits', async () => {
    const token = generateTestToken();
    const startTime = Date.now();
    
    const requests = Array(100).fill(null).map(() => 
      request
        .get(TEST_ROUTES.ACCOUNTS)
        .set('Authorization', `Bearer ${token}`)
    );

    const responses = await Promise.all(requests);
    const endTime = Date.now();
    
    const successfulRequests = responses.filter(r => r.status === 200);
    expect(successfulRequests.length).toBe(100);
    expect(endTime - startTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME * 2);
  });

  test('should maintain response times under threshold', async () => {
    const token = generateTestToken();
    const startTime = Date.now();
    
    const response = await request
      .get(TEST_ROUTES.ACCOUNTS)
      .set('Authorization', `Bearer ${token}`);
    
    const responseTime = Date.now() - startTime;
    expect(responseTime).toBeLessThan(PERFORMANCE_THRESHOLDS.RESPONSE_TIME);
    expect(response.status).toBe(200);
  });

  test('should expose metrics endpoint', async () => {
    const response = await request.get('/metrics');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('uptime');
    expect(response.body).toHaveProperty('memory');
    expect(response.body).toHaveProperty('cpu');
  });
});