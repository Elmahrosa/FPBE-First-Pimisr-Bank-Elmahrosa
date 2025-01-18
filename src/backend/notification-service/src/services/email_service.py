"""
Enhanced email service implementation for FPBE notification system using SendGrid with SMTP fallback.
Features comprehensive error handling, retry mechanisms, rate limiting, and delivery tracking.

External dependencies:
sendgrid==6.9.0
aiosmtplib==2.0.0
tenacity==8.0.1
email-validator==1.1.3
"""

import asyncio
import logging
from typing import Dict, Any, Optional
from datetime import datetime
from email_validator import validate_email, EmailNotValidError
from tenacity import retry, stop_after_attempt, wait_exponential
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from ..config import NotificationConfig
from ..utils.templates import NotificationTemplateManager
from ..models.notification import NotificationType

# Configure logging
logger = logging.getLogger(__name__)

# Retry configuration
RETRY_CONFIG = {
    'max_attempts': 3,
    'max_delay': 30,
    'min_delay': 1
}

# Rate limiting configuration
RATE_LIMIT_CONFIG = {
    'max_emails_per_hour': 20,
    'max_burst': 5
}

class RateLimiter:
    """Rate limiter for email sending with sliding window"""
    def __init__(self, max_per_hour: int, max_burst: int):
        self.max_per_hour = max_per_hour
        self.max_burst = max_burst
        self.window_size = 3600  # 1 hour in seconds
        self.requests = []

    async def acquire(self) -> bool:
        """Check if request can be made within rate limits"""
        now = datetime.utcnow().timestamp()
        self.requests = [ts for ts in self.requests if now - ts <= self.window_size]
        
        if len(self.requests) >= self.max_per_hour:
            return False
        
        if len(self.requests) - len([ts for ts in self.requests if now - ts <= 60]) >= self.max_burst:
            return False
            
        self.requests.append(now)
        return True

class DeliveryStats:
    """Track email delivery statistics"""
    def __init__(self):
        self.sent = 0
        self.failed = 0
        self.last_success = None
        self.last_failure = None
        self.errors = {}

    def record_success(self):
        """Record successful delivery"""
        self.sent += 1
        self.last_success = datetime.utcnow()

    def record_failure(self, error: str):
        """Record delivery failure"""
        self.failed += 1
        self.last_failure = datetime.utcnow()
        self.errors[error] = self.errors.get(error, 0) + 1

class EmailService:
    """Enhanced email service with SendGrid and SMTP fallback"""

    def __init__(self, config: NotificationConfig, template_manager: NotificationTemplateManager):
        """Initialize email service with configuration and template manager"""
        self._config = config
        self._template_manager = template_manager
        self._email_config = config.get_email_config()
        
        # Initialize SendGrid client
        self._sendgrid_client = None
        if self._email_config['sendgrid']['api_key']:
            self._sendgrid_client = SendGridAPIClient(self._email_config['sendgrid']['api_key'])
        
        # Initialize SMTP client
        self._smtp_client = None
        if all(self._email_config['smtp'].values()):
            self._smtp_client = aiosmtplib.SMTP(
                hostname=self._email_config['smtp']['host'],
                port=self._email_config['smtp']['port'],
                use_tls=self._email_config['smtp']['use_tls']
            )
        
        # Initialize rate limiters and stats
        self._rate_limiters: Dict[str, RateLimiter] = {}
        self._delivery_stats: Dict[str, DeliveryStats] = {}

    @retry(
        stop=stop_after_attempt(RETRY_CONFIG['max_attempts']),
        wait=wait_exponential(multiplier=RETRY_CONFIG['min_delay'], max=RETRY_CONFIG['max_delay'])
    )
    async def send_email(
        self,
        to_email: str,
        subject: str,
        notification_type: NotificationType,
        context: Dict[str, Any]
    ) -> bool:
        """Send email with enhanced error handling and delivery tracking"""
        try:
            # Validate email address
            valid = validate_email(to_email)
            to_email = valid.email

            # Check rate limits
            if to_email not in self._rate_limiters:
                self._rate_limiters[to_email] = RateLimiter(**RATE_LIMIT_CONFIG)
            
            if not await self._rate_limiters[to_email].acquire():
                logger.warning(f"Rate limit exceeded for {to_email}")
                return False

            # Initialize delivery stats if needed
            if to_email not in self._delivery_stats:
                self._delivery_stats[to_email] = DeliveryStats()

            # Render email content
            content = self._template_manager.render_template(
                notification_type=notification_type,
                channel='email',
                context=context
            )

            # Attempt SendGrid delivery first
            if self._sendgrid_client:
                success = await self._send_via_sendgrid(to_email, subject, content)
                if success:
                    self._delivery_stats[to_email].record_success()
                    return True

            # Fall back to SMTP if SendGrid fails
            if self._smtp_client:
                success = await self._send_via_smtp(to_email, subject, content)
                if success:
                    self._delivery_stats[to_email].record_success()
                    return True

            # Record failure if both methods fail
            error_msg = "Both SendGrid and SMTP delivery failed"
            self._delivery_stats[to_email].record_failure(error_msg)
            logger.error(error_msg, extra={"to_email": to_email})
            return False

        except EmailNotValidError as e:
            logger.error(f"Invalid email address: {to_email}", exc_info=e)
            return False
        except Exception as e:
            logger.error(f"Email delivery failed: {str(e)}", exc_info=e)
            if to_email in self._delivery_stats:
                self._delivery_stats[to_email].record_failure(str(e))
            raise

    async def _send_via_sendgrid(self, to_email: str, subject: str, content: str) -> bool:
        """Send email using SendGrid with enhanced error handling"""
        try:
            message = Mail(
                from_email=Email(self._email_config['sendgrid'].get('from_email', 'noreply@fpbe.com')),
                to_emails=To(to_email),
                subject=subject,
                html_content=Content("text/html", content)
            )
            
            response = await asyncio.to_thread(
                self._sendgrid_client.send,
                message
            )
            
            return response.status_code in (200, 202)

        except Exception as e:
            logger.error(f"SendGrid delivery failed: {str(e)}", exc_info=e)
            return False

    async def _send_via_smtp(self, to_email: str, subject: str, content: str) -> bool:
        """Send email using SMTP fallback with connection pooling"""
        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = self._email_config['smtp']['username']
            message['To'] = to_email
            message.attach(MIMEText(content, 'html'))

            if not self._smtp_client.is_connected:
                await self._smtp_client.connect()
                await self._smtp_client.login(
                    self._email_config['smtp']['username'],
                    self._email_config['smtp']['password']
                )

            await self._smtp_client.send_message(message)
            return True

        except Exception as e:
            logger.error(f"SMTP delivery failed: {str(e)}", exc_info=e)
            try:
                await self._smtp_client.quit()
            except:
                pass
            return False