"""
Configuration module for FPBE notification service managing email, SMS and push notifications.
Provides secure configuration management with comprehensive validation.

External dependencies:
pydantic==1.10.0
"""

import os
from typing import Dict, Any, Optional
from pydantic import BaseSettings, validator

# Global constants
SERVICE_NAME = 'notification-service'
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
ENVIRONMENTS = ['development', 'staging', 'production']

class NotificationConfig(BaseSettings):
    """
    Secure configuration management for notification services with comprehensive validation.
    Handles email, SMS, and push notification settings with credential management.
    """
    
    # Base configuration
    service_name: str = SERVICE_NAME
    environment: str = os.getenv('ENVIRONMENT', 'development')
    log_level: str = LOG_LEVEL
    
    # Service credentials
    email_credentials: Dict[str, str] = {
        'sendgrid_api_key': os.getenv('SENDGRID_API_KEY', ''),
        'smtp_host': os.getenv('SMTP_HOST', ''),
        'smtp_port': os.getenv('SMTP_PORT', '587'),
        'smtp_username': os.getenv('SMTP_USERNAME', ''),
        'smtp_password': os.getenv('SMTP_PASSWORD', '')
    }
    
    sms_credentials: Dict[str, str] = {
        'twilio_account_sid': os.getenv('TWILIO_ACCOUNT_SID', ''),
        'twilio_auth_token': os.getenv('TWILIO_AUTH_TOKEN', ''),
        'twilio_phone_number': os.getenv('TWILIO_PHONE_NUMBER', '')
    }
    
    push_credentials: Dict[str, Dict[str, str]] = {
        'fcm': {
            'project_id': os.getenv('FCM_PROJECT_ID', ''),
            'private_key': os.getenv('FCM_PRIVATE_KEY', ''),
            'client_email': os.getenv('FCM_CLIENT_EMAIL', '')
        },
        'apns': {
            'key_id': os.getenv('APNS_KEY_ID', ''),
            'team_id': os.getenv('APNS_TEAM_ID', ''),
            'private_key': os.getenv('APNS_PRIVATE_KEY', ''),
            'bundle_id': os.getenv('APNS_BUNDLE_ID', '')
        }
    }

    class Config:
        """Pydantic configuration"""
        case_sensitive = True
        env_file = '.env'
        env_file_encoding = 'utf-8'

    @validator('environment')
    def validate_environment(cls, v):
        """Validate environment setting"""
        if v not in ENVIRONMENTS:
            raise ValueError(f'Environment must be one of: {ENVIRONMENTS}')
        return v

    @validator('log_level')
    def validate_log_level(cls, v):
        """Validate logging level"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Log level must be one of: {valid_levels}')
        return v.upper()

    def get_email_config(self) -> Dict[str, Any]:
        """
        Returns validated email service configuration.
        
        Returns:
            Dict[str, Any]: Validated email configuration settings
        """
        if not self.email_credentials['sendgrid_api_key'] and not all([
            self.email_credentials['smtp_host'],
            self.email_credentials['smtp_port'],
            self.email_credentials['smtp_username'],
            self.email_credentials['smtp_password']
        ]):
            raise ValueError('Either SendGrid API key or SMTP credentials must be provided')

        return {
            'sendgrid': {
                'api_key': self.email_credentials['sendgrid_api_key'],
                'templates': {
                    '2fa_code': os.getenv('SENDGRID_2FA_TEMPLATE_ID', ''),
                    'transaction_alert': os.getenv('SENDGRID_TRANSACTION_TEMPLATE_ID', '')
                }
            },
            'smtp': {
                'host': self.email_credentials['smtp_host'],
                'port': int(self.email_credentials['smtp_port']),
                'username': self.email_credentials['smtp_username'],
                'password': self.email_credentials['smtp_password'],
                'use_tls': True
            },
            'retry_policy': {
                'max_retries': 3,
                'retry_delay': 5
            }
        }

    def get_sms_config(self) -> Dict[str, Any]:
        """
        Returns validated SMS service configuration.
        
        Returns:
            Dict[str, Any]: Validated SMS configuration settings
        """
        if not all([
            self.sms_credentials['twilio_account_sid'],
            self.sms_credentials['twilio_auth_token'],
            self.sms_credentials['twilio_phone_number']
        ]):
            raise ValueError('All Twilio credentials must be provided')

        return {
            'twilio': {
                'account_sid': self.sms_credentials['twilio_account_sid'],
                'auth_token': self.sms_credentials['twilio_auth_token'],
                'phone_number': self.sms_credentials['twilio_phone_number']
            },
            'templates': {
                '2fa_code': os.getenv('SMS_2FA_TEMPLATE', 'Your FPBE verification code is: {}'),
                'transaction_alert': os.getenv('SMS_TRANSACTION_TEMPLATE', 'FPBE Alert: Transaction of {} detected on your account')
            },
            'rate_limit': {
                'max_per_number': 5,
                'window_seconds': 3600
            }
        }

    def get_push_config(self) -> Dict[str, Any]:
        """
        Returns validated push notification configuration for FCM and APNS.
        
        Returns:
            Dict[str, Any]: Validated push notification settings
        """
        fcm_config = self.push_credentials['fcm']
        apns_config = self.push_credentials['apns']

        if not all([fcm_config['project_id'], fcm_config['private_key'], fcm_config['client_email']]):
            raise ValueError('All FCM credentials must be provided')

        if not all([apns_config['key_id'], apns_config['team_id'], apns_config['private_key'], apns_config['bundle_id']]):
            raise ValueError('All APNS credentials must be provided')

        return {
            'fcm': {
                'project_id': fcm_config['project_id'],
                'private_key': fcm_config['private_key'],
                'client_email': fcm_config['client_email'],
                'ttl': 2419200  # 28 days
            },
            'apns': {
                'key_id': apns_config['key_id'],
                'team_id': apns_config['team_id'],
                'private_key': apns_config['private_key'],
                'bundle_id': apns_config['bundle_id'],
                'use_sandbox': self.environment != 'production'
            },
            'categories': {
                'transaction': {
                    'priority': 'high',
                    'ttl': 3600
                },
                '2fa': {
                    'priority': 'high',
                    'ttl': 120
                },
                'marketing': {
                    'priority': 'normal',
                    'ttl': 86400
                }
            }
        }

    def validate_credentials(self) -> bool:
        """
        Validates all service credentials.
        
        Returns:
            bool: True if all credentials are valid, False otherwise
        """
        try:
            self.get_email_config()
            self.get_sms_config()
            self.get_push_config()
            return True
        except ValueError as e:
            print(f"Credential validation failed: {str(e)}")
            return False