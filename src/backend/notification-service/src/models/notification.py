"""
Notification service data models for FPBE mobile banking application.
Handles various types of notifications with comprehensive delivery tracking.

External dependencies:
pydantic==1.10.0
"""

from datetime import datetime
from typing import Dict, Optional, List, Any
from uuid import uuid4
import enum
from pydantic import BaseModel, Field

from ..config import NotificationConfig

class NotificationType(str, enum.Enum):
    """Supported notification types with descriptions"""
    TRANSACTION_ALERT = "transaction_alert"
    SECURITY_ALERT = "security_alert"
    MINING_UPDATE = "mining_update"
    MARKETING = "marketing"
    SYSTEM_UPDATE = "system_update"

class NotificationStatus(str, enum.Enum):
    """Notification delivery status values with transition validation"""
    PENDING = "pending"
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"

    @classmethod
    def validate_transition(cls, current: 'NotificationStatus', new: 'NotificationStatus') -> bool:
        """
        Validates if status transition is allowed
        
        Args:
            current: Current notification status
            new: New notification status
        Returns:
            bool: Whether transition is valid
        """
        valid_transitions = {
            cls.PENDING: [cls.SENT, cls.FAILED],
            cls.SENT: [cls.DELIVERED, cls.FAILED],
            cls.DELIVERED: [cls.READ, cls.FAILED],
            cls.READ: [cls.FAILED],
            cls.FAILED: []
        }
        return new in valid_transitions.get(current, [])

class NotificationPreference(BaseModel):
    """User notification preferences with channel-specific settings"""
    user_id: str = Field(..., description="Unique identifier of the user")
    transaction_alerts: bool = Field(True, description="Enable transaction notifications")
    security_alerts: bool = Field(True, description="Enable security notifications")
    mining_updates: bool = Field(True, description="Enable Pi mining notifications")
    marketing_notifications: bool = Field(False, description="Enable marketing notifications")
    preferred_channel: str = Field("push", description="Preferred notification channel")
    channel_preferences: Dict[str, bool] = Field(
        default_factory=lambda: {
            "push": True,
            "email": True,
            "sms": False
        }
    )
    type_channel_matrix: Dict[str, Dict[str, bool]] = Field(
        default_factory=lambda: {
            NotificationType.TRANSACTION_ALERT: {"push": True, "email": True, "sms": True},
            NotificationType.SECURITY_ALERT: {"push": True, "email": True, "sms": True},
            NotificationType.MINING_UPDATE: {"push": True, "email": False, "sms": False},
            NotificationType.MARKETING: {"push": False, "email": True, "sms": False},
            NotificationType.SYSTEM_UPDATE: {"push": True, "email": True, "sms": False}
        }
    )

    def is_enabled_for_type(self, notification_type: NotificationType, channel: Optional[str] = None) -> bool:
        """
        Check if notifications are enabled for specific type and channel
        
        Args:
            notification_type: Type of notification to check
            channel: Optional specific channel to check
        Returns:
            bool: Whether notifications are enabled
        """
        # Check if notification type is globally enabled
        type_enabled = getattr(self, f"{notification_type.value}s", True)
        if not type_enabled:
            return False

        # If no specific channel requested, check preferred channel
        if not channel:
            channel = self.preferred_channel

        # Verify channel is enabled
        if not self.channel_preferences.get(channel, False):
            return False

        # Check type-channel specific preference
        return self.type_channel_matrix.get(notification_type, {}).get(channel, False)

class Notification(BaseModel):
    """Core notification model with enhanced delivery tracking"""
    id: str = Field(default_factory=lambda: str(uuid4()))
    user_id: str
    type: NotificationType
    title: str
    message: str
    status: NotificationStatus = Field(default=NotificationStatus.PENDING)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    error_message: Optional[str] = None
    delivery_info: Dict[str, str] = Field(default_factory=dict)

    class Config:
        """Pydantic model configuration"""
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            NotificationType: lambda v: v.value,
            NotificationStatus: lambda v: v.value
        }

    def mark_as_read(self) -> None:
        """Mark notification as read with timestamp tracking"""
        if not NotificationStatus.validate_transition(self.status, NotificationStatus.READ):
            raise ValueError(f"Cannot mark as read from status {self.status}")
        
        self.status = NotificationStatus.READ
        self.read_at = datetime.utcnow()
        self.delivery_info["read_timestamp"] = self.read_at.isoformat()

    def update_status(
        self,
        status: NotificationStatus,
        error_message: Optional[str] = None,
        delivery_info: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Update notification delivery status with tracking
        
        Args:
            status: New notification status
            error_message: Optional error message for failed deliveries
            delivery_info: Optional delivery tracking information
        """
        if not NotificationStatus.validate_transition(self.status, status):
            raise ValueError(f"Invalid status transition from {self.status} to {status}")

        self.status = status
        
        # Update timestamps based on status
        if status == NotificationStatus.SENT:
            self.sent_at = datetime.utcnow()
        elif status == NotificationStatus.DELIVERED:
            self.delivered_at = datetime.utcnow()
        elif status == NotificationStatus.FAILED:
            self.error_message = error_message

        # Update delivery tracking information
        if delivery_info:
            self.delivery_info.update(delivery_info)