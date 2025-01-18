import dotenv from 'dotenv'; // ^16.0.0 - Load environment variables for configuration

// Initialize environment variables
dotenv.config();

// Global constants
const API_VERSION = 'v1';
const SERVICES_PORT = process.env.SERVICES_PORT || 3000;
const ENVIRONMENT = process.env.NODE_ENV || 'development';

// Interface definitions for type safety
interface HealthCheckConfig {
  active: {
    interval: number;
    timeout: number;
    healthy_threshold: number;
    unhealthy_threshold: number;
    http_path?: string;
  };
  passive?: {
    healthy: {
      successes: number;
      interval: number;
    };
    unhealthy: {
      timeouts: number;
      http_failures: number;
      interval: number;
    };
  };
}

interface ServiceConfig {
  name: string;
  url: string;
  protocol: string;
  host: string;
  port: number;
  path: string;
  retries: number;
  connect_timeout: number;
  write_timeout: number;
  read_timeout: number;
  healthchecks: HealthCheckConfig;
  tags: string[];
}

interface RouteConfig {
  name: string;
  protocols: string[];
  methods: string[];
  hosts: string[];
  paths: string[];
  strip_path: boolean;
  preserve_host: boolean;
  service: string;
  priority: number;
  https_redirect_status_code: number;
}

interface PluginConfig {
  cors: CorsConfig;
  jwt: JwtConfig;
  'rate-limiting': RateLimitConfig;
  'request-transformer': RequestTransformerConfig;
  'response-transformer': ResponseTransformerConfig;
  'ip-restriction': IpRestrictionConfig;
  oauth2: OAuth2Config;
  acl: AclConfig;
  prometheus: PrometheusConfig;
  datadog: DatadogConfig;
  'request-size-limiting': RequestSizeLimitConfig;
  'bot-detection': BotDetectionConfig;
  ssl: SslConfig;
}

interface UpstreamConfig {
  name: string;
  algorithm: string;
  hash_on?: string;
  hash_fallback?: string;
  healthchecks: HealthCheckConfig;
  slots: number;
  tags: string[];
}

interface ClusterConfig {
  enabled: boolean;
  nodes: string[];
  role: string;
}

interface MonitoringConfig {
  prometheus: {
    enabled: boolean;
    path: string;
  };
  logging: {
    level: string;
    format: string;
  };
}

// Kong Gateway Configuration
export const kongConfig = {
  services: [
    {
      name: 'auth-service',
      protocol: 'http',
      host: 'auth-service',
      port: Number(SERVICES_PORT),
      path: '/',
      retries: 5,
      connect_timeout: 60000,
      write_timeout: 60000,
      read_timeout: 60000,
      healthchecks: {
        active: {
          interval: 10,
          timeout: 5,
          healthy_threshold: 2,
          unhealthy_threshold: 3,
          http_path: '/health'
        },
        passive: {
          healthy: {
            successes: 5,
            interval: 10
          },
          unhealthy: {
            timeouts: 3,
            http_failures: 5,
            interval: 10
          }
        }
      },
      tags: ['auth', 'critical']
    },
    {
      name: 'account-service',
      protocol: 'http',
      host: 'account-service',
      port: Number(SERVICES_PORT),
      path: '/',
      retries: 5,
      connect_timeout: 60000,
      write_timeout: 60000,
      read_timeout: 60000,
      healthchecks: {
        active: {
          interval: 10,
          timeout: 5,
          healthy_threshold: 2,
          unhealthy_threshold: 3,
          http_path: '/health'
        }
      },
      tags: ['account', 'critical']
    },
    {
      name: 'transaction-service',
      protocol: 'http',
      host: 'transaction-service',
      port: Number(SERVICES_PORT),
      path: '/',
      retries: 3,
      connect_timeout: 60000,
      write_timeout: 60000,
      read_timeout: 60000,
      healthchecks: {
        active: {
          interval: 10,
          timeout: 5,
          healthy_threshold: 2,
          unhealthy_threshold: 3,
          http_path: '/health'
        }
      },
      tags: ['transaction', 'critical']
    },
    {
      name: 'pi-service',
      protocol: 'http',
      host: 'pi-service',
      port: Number(SERVICES_PORT),
      path: '/',
      retries: 3,
      connect_timeout: 60000,
      write_timeout: 60000,
      read_timeout: 60000,
      healthchecks: {
        active: {
          interval: 10,
          timeout: 5,
          healthy_threshold: 2,
          unhealthy_threshold: 3,
          http_path: '/health'
        }
      },
      tags: ['pi-network', 'critical']
    }
  ] as ServiceConfig[],

  routes: [
    {
      name: 'auth-routes',
      protocols: ['https'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      hosts: ['api.fpbe.com'],
      paths: [`/api/${API_VERSION}/auth`],
      strip_path: false,
      preserve_host: true,
      service: 'auth-service',
      priority: 100,
      https_redirect_status_code: 301
    },
    {
      name: 'account-routes',
      protocols: ['https'],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      hosts: ['api.fpbe.com'],
      paths: [`/api/${API_VERSION}/accounts`],
      strip_path: false,
      preserve_host: true,
      service: 'account-service',
      priority: 90,
      https_redirect_status_code: 301
    },
    {
      name: 'transaction-routes',
      protocols: ['https'],
      methods: ['GET', 'POST'],
      hosts: ['api.fpbe.com'],
      paths: [`/api/${API_VERSION}/transactions`],
      strip_path: false,
      preserve_host: true,
      service: 'transaction-service',
      priority: 80,
      https_redirect_status_code: 301
    },
    {
      name: 'pi-routes',
      protocols: ['https'],
      methods: ['GET', 'POST', 'PUT'],
      hosts: ['api.fpbe.com'],
      paths: [`/api/${API_VERSION}/pi`],
      strip_path: false,
      preserve_host: true,
      service: 'pi-service',
      priority: 70,
      https_redirect_status_code: 301
    }
  ] as RouteConfig[],

  plugins: {
    cors: {
      origins: ['https://app.fpbe.com'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      headers: ['Authorization', 'Content-Type', 'X-Request-ID'],
      exposed_headers: ['X-Request-ID'],
      credentials: true,
      max_age: 3600,
      preflight_continue: false
    },
    jwt: {
      secret: process.env.JWT_SECRET,
      cookie_names: [],
      key_claim_name: 'kid',
      claims_to_verify: ['exp', 'nbf'],
      maximum_expiration: 900,
      run_on_preflight: true,
      uri_param_names: ['jwt'],
      header_names: ['Authorization'],
      exclude_paths: [
        `/api/${API_VERSION}/auth/login`,
        `/api/${API_VERSION}/auth/register`
      ]
    },
    'rate-limiting': {
      second: 50,
      minute: 1000,
      hour: 10000,
      policy: 'redis',
      fault_tolerant: true,
      hide_client_headers: false,
      redis_host: process.env.REDIS_HOST,
      redis_port: Number(process.env.REDIS_PORT),
      redis_password: process.env.REDIS_PASSWORD,
      redis_timeout: 2000,
      redis_database: 0
    },
    'ip-restriction': {
      allow: process.env.ALLOWED_IPS?.split(',') || [],
      deny: process.env.DENIED_IPS?.split(',') || []
    },
    'request-size-limiting': {
      allowed_payload_size: 10
    },
    'bot-detection': {
      allow: [],
      deny: ['*']
    },
    ssl: {
      cert: process.env.SSL_CERT,
      key: process.env.SSL_KEY,
      verify_depth: 3,
      protocols: ['TLSv1.2', 'TLSv1.3']
    },
    prometheus: {
      status_codes: true,
      latency: true,
      bandwidth: true,
      per_consumer: true
    }
  } as PluginConfig,

  upstreams: [
    {
      name: 'auth-service-upstream',
      algorithm: 'round-robin',
      hash_on: 'none',
      hash_fallback: 'none',
      healthchecks: {
        active: {
          interval: 10,
          timeout: 5,
          healthy_threshold: 2,
          unhealthy_threshold: 3,
          http_path: '/health'
        }
      },
      slots: 10000,
      tags: ['auth', 'critical']
    }
  ] as UpstreamConfig[],

  clustering: {
    enabled: ENVIRONMENT === 'production',
    nodes: process.env.KONG_CLUSTER_NODES?.split(',') || [],
    role: process.env.KONG_CLUSTER_ROLE || 'data_plane'
  } as ClusterConfig,

  monitoring: {
    prometheus: {
      enabled: true,
      path: '/metrics'
    },
    logging: {
      level: ENVIRONMENT === 'production' ? 'warn' : 'debug',
      format: 'json'
    }
  } as MonitoringConfig
};

export default kongConfig;