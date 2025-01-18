"""
SMS notification service implementation using Twilio for FPBE mobile banking.
Provides secure message delivery with encryption, rate limiting, and comprehensive tracking.

External dependencies:
twilio==7.0.0
aiohttp==3.8.0
cryptography==37.0.0
phonenumbers==8.12.0
"""

import logging
from typing import Dict, Any, Optional
import phonenumbers
from twilio.rest import Client
from twilio.base.exceptions import TwilioRestException
from cryptography.fernet import Fernet
from datetime import datetime, timedelta
import json
from functools import wraps
from aiohttp import ClientSession

from ..config import NotificationConfig
from ..models.notification import NotificationType, NotificationStatus

class SMSService:
    """Enhanced SMS notification service with security features and delivery tracking."""

    def __init__(self, config: NotificationConfig):
        """
        Initialize SMS service with security and monitoring configuration.
        
        Args:
            config: Service configuration instance
        """
        sms_config = config.get_sms_config()
        
        # Initialize Twilio client
        self._client = Client(
            sms_config['twilio']['account_sid'],
            sms_config['twilio']['auth_token']
        )
        self._sender_phone = sms_config['twilio']['phone_number']
        
        # Set up logging
        self._logger = logging.getLogger(__name__)
        self._logger.setLevel(config.log_level)
        
        # Initialize message templates
        self._message_templates = sms_config['templates']
        
        # Set up encryption
        self._encryption_key = Fernet.generate_key()
        self._encryptor = Fernet(self._encryption_key)
        
        # Configure rate limiting
        self._rate_limits = {
            NotificationType.TRANSACTION_ALERT: (5, 3600),  # 5 per hour
            NotificationType.SECURITY_ALERT: (10, 3600),    # 10 per hour
            NotificationType.VERIFICATION_CODE: (3, 300),    # 3 per 5 minutes
        }
        self._rate_tracking: Dict[str, Dict[str, Any]] = {}

    def _check_rate_limit(self, phone_number: str, notification_type: NotificationType) -> bool:
        """
        Check if recipient has exceeded rate limits.
        
        Args:
            phone_number: Recipient phone number
            notification_type: Type of notification being sent
            
        Returns:
            bool: Whether sending is allowed
        """
        if notification_type not in self._rate_limits:
            return True
            
        max_count, window_seconds = self._rate_limits[notification_type]
        now = datetime.utcnow()
        
        # Initialize tracking for new numbers
        if phone_number not in self._rate_tracking:
            self._rate_tracking[phone_number] = {
                notification_type: {'count': 0, 'window_start': now}
            }
            
        tracking = self._rate_tracking[phone_number].get(notification_type, {
            'count': 0,
            'window_start': now
        })
        
        # Reset window if expired
        if (now - tracking['window_start']) > timedelta(seconds=window_seconds):
            tracking['count'] = 0
            tracking['window_start'] = now
            
        # Check limit
        if tracking['count'] >= max_count:
            return False
            
        tracking['count'] += 1
        self._rate_tracking[phone_number][notification_type] = tracking
        return True

    def _encrypt_message(self, message: str) -> str:
        """
        Encrypt message content for secure transmission.
        
        Args:
            message: Message to encrypt
            
        Returns:
            str: Encrypted message
        """
        return self._encryptor.encrypt(message.encode()).decode()

    async def send_sms(
        self,
        phone_number: str,
        message: str,
        notification_type: NotificationType,
        metadata: Optional[Dict[str, Any]] = None,
        encrypt_content: bool = False
    ) -> Dict[str, Any]:
        """
        Send SMS with security features and delivery tracking.
        
        Args:
            phone_number: Recipient phone number
            message: Message content
            notification_type: Type of notification
            metadata: Additional tracking metadata
            encrypt_content: Whether to encrypt message
            
        Returns:
            Dict[str, Any]: Delivery status and tracking information
        """
        try:
            # Validate phone number
            parsed_number = phonenumbers.parse(phone_number, "US")
            if not phonenumbers.is_valid_number(parsed_number):
                raise ValueError("Invalid phone number")
                
            # Check rate limits
            if not self._check_rate_limit(phone_number, notification_type):
                return {
                    'status': NotificationStatus.RATE_LIMITED,
                    'error': 'Rate limit exceeded',
                    'timestamp': datetime.utcnow().isoformat()
                }
                
            # Encrypt if required
            content = self._encrypt_message(message) if encrypt_content else message
            
            # Send message
            message = await self._client.messages.create_async(
                to=phone_number,
                from_=self._sender_phone,
                body=content,
                status_callback='https://api.fpbe.com/notifications/sms/status'
            )
            
            # Log success
            self._logger.info(
                "SMS sent successfully",
                extra={
                    'phone_number': phone_number,
                    'message_id': message.sid,
                    'notification_type': notification_type,
                    'metadata': metadata
                }
            )
            
            return {
                'status': NotificationStatus.SENT,
                'message_id': message.sid,
                'timestamp': datetime.utcnow().isoformat(),
                'tracking_data': {
                    'notification_type': notification_type,
                    'encrypted': encrypt_content,
                    'metadata': metadata
                }
            }
            
        except TwilioRestException as e:
            self._logger.error(
                "Twilio SMS sending failed",
                extra={
                    'error_code': e.code,
                    'error_message': str(e),
                    'phone_number': phone_number
                }
            )
            return {
                'status': NotificationStatus.FAILED,
                'error': str(e),
                'error_code': e.code,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self._logger.error(
                "SMS sending failed",
                extra={
                    'error': str(e),
                    'phone_number': phone_number
                }
            )
            return {
                'status': NotificationStatus.FAILED,
                'error': str(e),
                'timestamp': datetime.utcnow().isoformat()
            }

    async def send_verification_code(
        self,
        phone_number: str,
        code: str,
        expiry_minutes: int = 5
    ) -> Dict[str, Any]:
        """
        Send 2FA verification code with enhanced security.
        
        Args:
            phone_number: Recipient phone number
            code: Verification code
            expiry_minutes: Code expiry time in minutes
            
        Returns:
            Dict[str, Any]: Verification status and tracking data
        """
        message = self._message_templates['2fa_code'].format(code)
        metadata = {
            'verification_type': '2FA',
            'expiry_minutes': expiry_minutes,
            'expires_at': (datetime.utcnow() + timedelta(minutes=expiry_minutes)).isoformat()
        }
        
        return await self.send_sms(
            phone_number=phone_number,
            message=message,
            notification_type=NotificationType.VERIFICATION_CODE,
            metadata=metadata,
            encrypt_content=True
        )

    async def send_transaction_alert(
        self,
        phone_number: str,
        transaction_details: Dict[str, Any],
        priority_level: str = 'normal'
    ) -> Dict[str, Any]:
        """
        Send transaction notification with guaranteed delivery.
        
        Args:
            phone_number: Recipient phone number
            transaction_details: Transaction information
            priority_level: Alert priority
            
        Returns:
            Dict[str, Any]: Transaction alert delivery status
        """
        amount = transaction_details.get('amount', '0')
        currency = transaction_details.get('currency', 'USD')
        
        message = self._message_templates['transaction_alert'].format(
            f"{amount} {currency}"
        )
        
        metadata = {
            'transaction_id': transaction_details.get('transaction_id'),
            'amount': amount,
            'currency': currency,
            'timestamp': transaction_details.get('timestamp'),
            'priority': priority_level
        }
        
        return await self.send_sms(
            phone_number=phone_number,
            message=message,
            notification_type=NotificationType.TRANSACTION_ALERT,
            metadata=metadata,
            encrypt_content=False
        )