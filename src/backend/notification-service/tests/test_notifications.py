"""
Test suite for FPBE notification service validating multi-channel notifications,
real-time delivery, security alerts, and status tracking.

External dependencies:
pytest==7.3.1
pytest-asyncio==0.21.0
httpx==0.24.0
faker==18.9.0
"""

import pytest
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from faker import Faker
from httpx import AsyncClient

from app import app, send_notification, get_notification_status
from models.notification import (
    Notification,
    NotificationType,
    NotificationStatus,
    NotificationPreference
)

class NotificationTestCase:
    """Base test class for notification service tests"""
    
    def __init__(self):
        self.faker = Faker()
        self.client = AsyncClient(app=app, base_url="http://test")
        self.test_user_id = str(uuid.uuid4())
        self.test_preferences = NotificationPreference(
            user_id=self.test_user_id,
            transaction_alerts=True,
            security_alerts=True,
            mining_updates=True,
            preferred_channel="push"
        )

    async def setup_method(self):
        """Setup method run before each test"""
        # Reset notification counters and mocks
        self.sent_notifications = []
        self.delivery_statuses = {}
        
        # Setup test data
        self.test_transaction = {
            "amount": self.faker.pydecimal(left_digits=4, right_digits=2),
            "timestamp": datetime.utcnow(),
            "merchant": self.faker.company()
        }
        
        # Configure test channels
        self.test_channels = ["push", "email", "sms"]

    def create_test_notification(
        self,
        notification_type: NotificationType,
        data: Dict,
        channels: List[str]
    ) -> Notification:
        """Create test notification instance"""
        return Notification(
            user_id=self.test_user_id,
            type=notification_type,
            title=f"Test {notification_type.value}",
            message=f"Test notification with data: {data}",
            metadata=data,
            delivery_info={"channels": channels}
        )

@pytest.mark.asyncio
class TestNotificationDelivery(NotificationTestCase):
    """Test notification delivery across channels"""

    async def test_send_transaction_notification(self):
        """Test sending transaction alert notifications"""
        # Create transaction notification
        notification = self.create_test_notification(
            NotificationType.TRANSACTION_ALERT,
            self.test_transaction,
            self.test_channels
        )
        
        # Send notification
        response = await self.client.post(
            "/api/v1/notifications",
            json=notification.dict()
        )
        
        # Verify response
        assert response.status_code == 200
        result = response.json()
        assert result["status"] == NotificationStatus.SENT.value
        assert "notification_id" in result
        
        # Verify delivery status
        status_response = await self.client.get(
            f"/api/v1/notifications/{result['notification_id']}"
        )
        status_data = status_response.json()
        assert status_data["status"] in [
            NotificationStatus.SENT.value,
            NotificationStatus.DELIVERED.value
        ]
        
        # Verify channel delivery
        for channel in self.test_channels:
            assert channel in status_data["delivery_info"]["channel_statuses"]

    async def test_security_alert_priority(self):
        """Test security alert notifications have proper priority"""
        security_data = {
            "alert_type": "suspicious_login",
            "location": self.faker.city(),
            "timestamp": datetime.utcnow()
        }
        
        notification = self.create_test_notification(
            NotificationType.SECURITY_ALERT,
            security_data,
            ["push", "sms", "email"]
        )
        
        response = await self.client.post(
            "/api/v1/notifications",
            json=notification.dict()
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify high priority delivery
        delivery_info = result["delivery_info"]
        assert delivery_info["priority"] == "high"
        assert "sms" in delivery_info["channel_statuses"]
        assert delivery_info["channel_statuses"]["sms"] != "failed"

    async def test_notification_rate_limiting(self):
        """Test rate limiting for notification sending"""
        # Send multiple notifications rapidly
        notifications = []
        for _ in range(10):
            notification = self.create_test_notification(
                NotificationType.MARKETING,
                {"campaign": self.faker.word()},
                ["push"]
            )
            notifications.append(notification)
        
        # Send notifications concurrently
        responses = await asyncio.gather(
            *[
                self.client.post(
                    "/api/v1/notifications",
                    json=notification.dict()
                )
                for notification in notifications
            ]
        )
        
        # Verify rate limiting
        status_codes = [r.status_code for r in responses]
        assert 429 in status_codes  # Some requests should be rate limited
        
        # Verify critical notifications bypass rate limiting
        security_notification = self.create_test_notification(
            NotificationType.SECURITY_ALERT,
            {"alert": "critical_security_event"},
            ["push", "sms"]
        )
        
        response = await self.client.post(
            "/api/v1/notifications",
            json=security_notification.dict()
        )
        assert response.status_code == 200

    async def test_failed_delivery_handling(self):
        """Test handling of failed notification deliveries"""
        # Create notification with invalid channel
        notification = self.create_test_notification(
            NotificationType.TRANSACTION_ALERT,
            self.test_transaction,
            ["invalid_channel"]
        )
        
        response = await self.client.post(
            "/api/v1/notifications",
            json=notification.dict()
        )
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify failure handling
        assert result["status"] == NotificationStatus.FAILED.value
        assert "error_message" in result
        
        # Verify retry attempt
        retry_response = await self.client.post(
            f"/api/v1/notifications/{result['notification_id']}/retry"
        )
        assert retry_response.status_code == 200
        
        # Verify fallback channel
        retry_result = retry_response.json()
        assert "fallback_channel" in retry_result["delivery_info"]

    async def test_notification_status_tracking(self):
        """Test notification status updates and tracking"""
        notification = self.create_test_notification(
            NotificationType.MINING_UPDATE,
            {"mined_amount": "5.0 Pi"},
            ["push"]
        )
        
        # Send notification
        response = await self.client.post(
            "/api/v1/notifications",
            json=notification.dict()
        )
        
        notification_id = response.json()["notification_id"]
        
        # Track status changes
        statuses = []
        for _ in range(5):  # Poll status for max 5 times
            status_response = await self.client.get(
                f"/api/v1/notifications/{notification_id}"
            )
            status = status_response.json()["status"]
            statuses.append(status)
            if status in [NotificationStatus.DELIVERED.value, NotificationStatus.FAILED.value]:
                break
            await asyncio.sleep(1)
        
        # Verify status progression
        assert NotificationStatus.SENT.value in statuses
        assert len(statuses) > 1  # Should have multiple status updates
        
        # Verify delivery timestamps
        final_status = await self.client.get(
            f"/api/v1/notifications/{notification_id}"
        )
        delivery_info = final_status.json()["delivery_info"]
        assert "initiated_at" in delivery_info
        if "delivered_at" in delivery_info:
            initiated = datetime.fromisoformat(delivery_info["initiated_at"])
            delivered = datetime.fromisoformat(delivery_info["delivered_at"])
            assert delivered > initiated