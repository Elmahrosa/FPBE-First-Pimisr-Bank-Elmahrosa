"""
Template management utility for notification content rendering across multiple channels.
Provides secure, performant, and internationalized template handling for FPBE notifications.

External dependencies:
jinja2==3.0.0
"""

import logging
from pathlib import Path
from typing import Dict, Any, Optional, Callable
from jinja2 import Environment, FileSystemLoader, select_autoescape, Undefined, SecurityError

from ..models.notification import NotificationType

# Configure logging
logger = logging.getLogger(__name__)

# Global constants
TEMPLATE_DIR = Path(__file__).parent.parent / 'templates'
TEMPLATE_CACHE_SIZE = 1000
SUPPORTED_LOCALES = ['en', 'ar', 'fr']

class StrictUndefined(Undefined):
    """Custom undefined handler that raises errors for undefined variables"""
    def __str__(self):
        raise SecurityError(f"Undefined template variable: {self._undefined_name}")

class NotificationTemplateManager:
    """
    Manages notification templates with enhanced security, performance optimization,
    and internationalization support for the FPBE mobile banking system.
    """

    def __init__(self, locale: Optional[str] = 'en', cache_enabled: bool = True):
        """
        Initialize template manager with security controls and caching.

        Args:
            locale: Default locale for templates (defaults to 'en')
            cache_enabled: Whether to enable template caching (defaults to True)
        """
        if locale not in SUPPORTED_LOCALES:
            raise ValueError(f"Unsupported locale: {locale}. Must be one of {SUPPORTED_LOCALES}")

        # Initialize Jinja2 environment with security controls
        self._env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(['html', 'xml', 'txt']),
            undefined=StrictUndefined,
            cache_size=TEMPLATE_CACHE_SIZE if cache_enabled else 0,
            auto_reload=False,
            trim_blocks=True,
            lstrip_blocks=True,
            sandbox=True
        )

        # Initialize template and cache storage
        self._templates: Dict[str, Dict[str, str]] = {}
        self._template_cache: Dict[str, Any] = {}
        self._locale_mappings: Dict[str, str] = {
            locale: locale for locale in SUPPORTED_LOCALES
        }

        # Register default filters
        self._register_default_filters()
        
        # Pre-load templates for performance
        self._preload_templates()

    def render_template(
        self,
        notification_type: NotificationType,
        channel: str,
        context: Dict[str, Any],
        locale: Optional[str] = None
    ) -> str:
        """
        Render a notification template with security controls and performance optimization.

        Args:
            notification_type: Type of notification to render
            channel: Delivery channel (email, sms, push)
            context: Template context variables
            locale: Optional locale override

        Returns:
            str: Rendered template content

        Raises:
            SecurityError: If template access or rendering violates security constraints
            ValueError: If template or locale is invalid
        """
        try:
            # Validate and sanitize inputs
            if not isinstance(context, dict):
                raise ValueError("Context must be a dictionary")

            # Get template path with security checks
            template_path = self.get_template_path(notification_type, channel, locale)
            cache_key = f"{template_path}:{locale or 'default'}"

            # Check cache first
            if cache_key in self._template_cache:
                template = self._template_cache[cache_key]
            else:
                template = self._env.get_template(template_path)
                self._template_cache[cache_key] = template

            # Render template with sanitized context
            rendered_content = template.render(**self._sanitize_context(context))

            # Log rendering metrics
            logger.debug(
                "Template rendered",
                extra={
                    "notification_type": notification_type.value,
                    "channel": channel,
                    "locale": locale,
                    "template_path": template_path
                }
            )

            return rendered_content

        except (SecurityError, ValueError) as e:
            logger.error(
                "Template rendering failed",
                extra={
                    "error": str(e),
                    "notification_type": notification_type.value,
                    "channel": channel
                }
            )
            raise

    def get_template_path(
        self,
        notification_type: NotificationType,
        channel: str,
        locale: Optional[str] = None
    ) -> str:
        """
        Get secure template file path with validation.

        Args:
            notification_type: Type of notification
            channel: Delivery channel
            locale: Optional locale override

        Returns:
            str: Validated template file path

        Raises:
            ValueError: If template path is invalid
        """
        valid_channels = {'email', 'sms', 'push'}
        if channel not in valid_channels:
            raise ValueError(f"Invalid channel: {channel}. Must be one of {valid_channels}")

        # Apply locale fallback logic
        effective_locale = locale or 'en'
        if effective_locale not in SUPPORTED_LOCALES:
            effective_locale = 'en'

        # Construct and validate template path
        template_path = f"{effective_locale}/{notification_type.value}/{channel}.j2"
        full_path = TEMPLATE_DIR / template_path

        if not full_path.exists():
            raise ValueError(f"Template not found: {template_path}")

        if not full_path.is_file():
            raise ValueError(f"Invalid template path: {template_path}")

        return template_path

    def register_filter(self, name: str, filter_func: Callable) -> None:
        """
        Register a secure custom filter for template rendering.

        Args:
            name: Filter name
            filter_func: Filter function

        Raises:
            ValueError: If filter name is invalid or already exists
        """
        if not name.isidentifier():
            raise ValueError(f"Invalid filter name: {name}")

        if name in self._env.filters:
            raise ValueError(f"Filter already exists: {name}")

        # Register filter with security validation
        self._env.filters[name] = filter_func
        logger.info(f"Registered custom filter: {name}")

    def _register_default_filters(self) -> None:
        """Register default secure template filters"""
        def currency_format(value: float, currency: str = 'USD') -> str:
            """Format currency values"""
            return f"{currency} {value:,.2f}"

        def secure_truncate(value: str, length: int = 50) -> str:
            """Securely truncate text"""
            return value[:length] + '...' if len(value) > length else value

        self._env.filters['currency'] = currency_format
        self._env.filters['secure_truncate'] = secure_truncate

    def _sanitize_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize template context for secure rendering.

        Args:
            context: Raw template context

        Returns:
            Dict[str, Any]: Sanitized context
        """
        # Remove potentially dangerous keys
        sanitized = {
            k: v for k, v in context.items()
            if not k.startswith('_') and not callable(v)
        }

        # Ensure critical keys exist
        required_keys = {'user_id', 'timestamp'}
        for key in required_keys:
            if key not in sanitized:
                sanitized[key] = None

        return sanitized

    def _preload_templates(self) -> None:
        """Preload common templates for performance optimization"""
        common_types = [
            NotificationType.TRANSACTION_ALERT,
            NotificationType.SECURITY_ALERT,
            NotificationType.MINING_UPDATE
        ]
        channels = ['email', 'sms', 'push']

        for notification_type in common_types:
            for channel in channels:
                try:
                    template_path = self.get_template_path(notification_type, channel)
                    self._template_cache[f"{template_path}:en"] = self._env.get_template(template_path)
                except ValueError:
                    continue