"""
Push notification service implementation for FPBE mobile banking application.
Handles FCM and APNS notifications with enhanced error handling and rate limiting.

External dependencies:
firebase-admin==5.3.0
aioapns==2.1.0
aioredis==2.0.0
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
import json
import firebase_admin
from firebase_admin import credentials, messaging
import aioapns
import aioredis
from datetime import datetime, timedelta

from ..config import NotificationConfig
from ..models.notification import Notification, NotificationStatus

# Configure logging
logger = logging.getLogger(__name__)

class PushNotificationService:
    """
    Service for managing and sending push notifications to mobile devices.
    Supports both FCM (Android) and APNS (iOS) with enhanced error handling.
    """

    def __init__(self, config: NotificationConfig):
        """
        Initialize push notification service with required configurations.

        Args:
            config: NotificationConfig instance with push notification settings
        """
        self._config = config.get_push_config()
        
        # Initialize Firebase Admin SDK
        cred = credentials.Certificate({
            "project_id": self._config["fcm"]["project_id"],
            "private_key": self._config["fcm"]["private_key"],
            "client_email": self._config["fcm"]["client_email"]
        })
        self._fcm_app = firebase_admin.initialize_app(cred)

        # Initialize APNS client
        self._apns_client = aioapns.APNsClient(
            key=self._config["apns"]["private_key"],
            key_id=self._config["apns"]["key_id"],
            team_id=self._config["apns"]["team_id"],
            topic=self._config["apns"]["bundle_id"],
            use_sandbox=self._config["apns"]["use_sandbox"]
        )

        # Initialize Redis client
        self._redis_client = aioredis.from_url(
            "redis://localhost",
            encoding="utf-8",
            decode_responses=True,
            max_connections=10
        )

        # Initialize rate limiters
        self._rate_limiters: Dict[str, asyncio.Lock] = {}
        
        # Configuration
        self._batch_size = 500  # FCM batch size limit
        self._max_retries = 3
        self._retry_delay = 1.0  # seconds

    async def register_device(self, user_id: str, device_token: str, platform: str) -> bool:
        """
        Register a device token for push notifications with validation.

        Args:
            user_id: User identifier
            device_token: Device-specific push token
            platform: Device platform ('ios' or 'android')

        Returns:
            bool: Success status of registration
        """
        try:
            # Validate platform
            if platform not in ['ios', 'android']:
                raise ValueError(f"Invalid platform: {platform}")

            # Check token blacklist
            if await self._redis_client.sismember(f"blacklisted_tokens:{platform}", device_token):
                logger.warning(f"Attempted to register blacklisted token: {device_token}")
                return False

            # Store token with metadata
            token_key = f"device_tokens:{user_id}"
            token_data = {
                "token": device_token,
                "platform": platform,
                "registered_at": datetime.utcnow().isoformat(),
                "last_used": datetime.utcnow().isoformat(),
                "status": "active"
            }

            # Remove old tokens if limit exceeded (keep last 5)
            tokens = await self._redis_client.lrange(token_key, 0, -1)
            if len(tokens) >= 5:
                await self._redis_client.ltrim(token_key, -4, -1)

            # Add new token
            await self._redis_client.lpush(token_key, json.dumps(token_data))
            
            # Set expiry based on platform (iOS tokens expire more frequently)
            expiry = 60 * 60 * 24 * (30 if platform == 'android' else 7)
            await self._redis_client.expire(token_key, expiry)

            logger.info(f"Successfully registered device token for user {user_id}")
            return True

        except Exception as e:
            logger.error(f"Error registering device token: {str(e)}")
            return False

    async def send_notification(self, notification: Notification) -> bool:
        """
        Send push notification with retry logic and rate limiting.

        Args:
            notification: Notification instance to be sent

        Returns:
            bool: Success status of notification delivery
        """
        try:
            # Apply rate limiting per user
            rate_limit_key = f"rate_limit:{notification.user_id}"
            if rate_limit_key not in self._rate_limiters:
                self._rate_limiters[rate_limit_key] = asyncio.Lock()

            async with self._rate_limiters[rate_limit_key]:
                # Get device tokens for user
                tokens_key = f"device_tokens:{notification.user_id}"
                tokens_data = await self._redis_client.lrange(tokens_key, 0, -1)
                
                if not tokens_data:
                    logger.warning(f"No device tokens found for user {notification.user_id}")
                    notification.update_status(NotificationStatus.FAILED, "No registered devices")
                    return False

                # Group tokens by platform
                android_tokens = []
                ios_tokens = []
                
                for token_json in tokens_data:
                    token_data = json.loads(token_json)
                    if token_data["status"] == "active":
                        if token_data["platform"] == "android":
                            android_tokens.append(token_data["token"])
                        else:
                            ios_tokens.append(token_data["token"])

                success = True
                delivery_info = {}

                # Send to Android devices
                if android_tokens:
                    fcm_response = await self._send_fcm(android_tokens, notification)
                    success = success and fcm_response.get("success", False)
                    delivery_info["fcm"] = fcm_response

                # Send to iOS devices
                if ios_tokens:
                    apns_response = await self._send_apns(ios_tokens, notification)
                    success = success and apns_response.get("success", False)
                    delivery_info["apns"] = apns_response

                # Update notification status
                if success:
                    notification.update_status(NotificationStatus.SENT, delivery_info=delivery_info)
                else:
                    notification.update_status(
                        NotificationStatus.FAILED,
                        error_message="Partial or complete delivery failure",
                        delivery_info=delivery_info
                    )

                return success

        except Exception as e:
            logger.error(f"Error sending push notification: {str(e)}")
            notification.update_status(NotificationStatus.FAILED, str(e))
            return False

    async def _send_fcm(self, tokens: List[str], notification: Notification) -> Dict[str, Any]:
        """
        Send FCM notification with batch processing.

        Args:
            tokens: List of FCM device tokens
            notification: Notification to be sent

        Returns:
            Dict[str, Any]: FCM response data
        """
        response_data = {"success": False, "results": []}
        
        try:
            # Configure notification priority and TTL
            category_config = self._config["categories"].get(
                notification.type.value,
                self._config["categories"]["transaction"]
            )

            # Prepare FCM message
            fcm_message = messaging.MulticastMessage(
                tokens=tokens[:self._batch_size],
                notification=messaging.Notification(
                    title=notification.title,
                    body=notification.message
                ),
                data=notification.metadata,
                android=messaging.AndroidConfig(
                    priority=category_config["priority"],
                    ttl=timedelta(seconds=category_config["ttl"])
                )
            )

            # Send with retry
            for attempt in range(self._max_retries):
                try:
                    batch_response = messaging.send_multicast(fcm_message)
                    response_data["success"] = batch_response.success_count > 0
                    response_data["results"] = batch_response.responses
                    
                    # Handle failed tokens
                    for idx, result in enumerate(batch_response.responses):
                        if not result.success:
                            await self._redis_client.sadd(
                                "blacklisted_tokens:android",
                                tokens[idx]
                            )
                    
                    break
                except Exception as e:
                    if attempt == self._max_retries - 1:
                        raise e
                    await asyncio.sleep(self._retry_delay * (attempt + 1))

        except Exception as e:
            logger.error(f"FCM send error: {str(e)}")
            response_data["error"] = str(e)

        return response_data

    async def _send_apns(self, tokens: List[str], notification: Notification) -> Dict[str, Any]:
        """
        Send APNS notification with enhanced error handling.

        Args:
            tokens: List of APNS device tokens
            notification: Notification to be sent

        Returns:
            Dict[str, Any]: APNS response data
        """
        response_data = {"success": False, "results": []}
        
        try:
            # Configure notification priority and expiry
            category_config = self._config["categories"].get(
                notification.type.value,
                self._config["categories"]["transaction"]
            )

            # Prepare APNS payload
            payload = {
                "aps": {
                    "alert": {
                        "title": notification.title,
                        "body": notification.message
                    },
                    "sound": "default",
                    "priority": 10 if category_config["priority"] == "high" else 5,
                    "expiration": int(datetime.utcnow().timestamp() + category_config["ttl"])
                },
                "data": notification.metadata
            }

            results = []
            for token in tokens:
                for attempt in range(self._max_retries):
                    try:
                        await self._apns_client.send_notification(
                            token,
                            payload
                        )
                        results.append({"token": token, "success": True})
                        break
                    except aioapns.exceptions.BadDeviceToken:
                        await self._redis_client.sadd("blacklisted_tokens:ios", token)
                        results.append({"token": token, "success": False, "error": "BadDeviceToken"})
                        break
                    except Exception as e:
                        if attempt == self._max_retries - 1:
                            results.append({"token": token, "success": False, "error": str(e)})
                        else:
                            await asyncio.sleep(self._retry_delay * (attempt + 1))

            response_data["success"] = any(r["success"] for r in results)
            response_data["results"] = results

        except Exception as e:
            logger.error(f"APNS send error: {str(e)}")
            response_data["error"] = str(e)

        return response_data