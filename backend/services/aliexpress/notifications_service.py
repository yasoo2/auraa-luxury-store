"""
Multi-Channel Notification Service for AliExpress Integration
Supports Email, SMS, WhatsApp, and In-App notifications
"""

import asyncio
import os
import json
import httpx
from typing import Dict, List, Any, Optional
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib


class MultiChannelNotificationService:
    """
    Comprehensive notification service supporting multiple channels
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
        # Configuration
        self.sendgrid_api_key = os.getenv('SENDGRID_API_KEY')
        self.twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
        self.twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
        self.twilio_from = os.getenv('TWILIO_FROM_NUMBER')
        self.whatsapp_token = os.getenv('WHATSAPP_ACCESS_TOKEN')
        self.whatsapp_phone_id = os.getenv('WHATSAPP_PHONE_NUMBER_ID')
        
        # Templates
        self.templates = {
            'ar': {
                'order_confirmation': {
                    'subject': 'تأكيد الطلب #{order_number}',
                    'body': '''
                    عزيزي {customer_name},

                    شكراً لك على طلبك من أورا لاكشري!

                    تفاصيل الطلب:
                    رقم الطلب: {order_number}
                    المبلغ الإجمالي: {total_amount} {currency}
                    
                    سيتم شحن طلبك خلال 2-3 أيام عمل.
                    
                    مع أطيب التحيات،
                    فريق أورا لاكشري
                    '''
                },
                'shipping_notification': {
                    'subject': 'تم شحن طلبك #{order_number}',
                    'body': '''
                    عزيزي {customer_name},

                    تم شحن طلبك بنجاح!

                    رقم التتبع: {tracking_number}
                    شركة الشحن: {carrier}
                    الوقت المتوقع للوصول: {estimated_delivery}
                    
                    تتبع طلبك: {tracking_url}
                    
                    مع أطيب التحيات،
                    فريق أورا لاكشري
                    '''
                },
                'delivery_confirmation': {
                    'subject': 'تم تسليم طلبك #{order_number}',
                    'body': '''
                    عزيزي {customer_name},

                    تم تسليم طلبك بنجاح!

                    نأمل أن تكون راضياً عن مشترياتك من أورا لاكشري.
                    يرجى تقييم تجربتك معنا.
                    
                    مع أطيب التحيات،
                    فريق أورا لاكشري
                    '''
                }
            },
            'en': {
                'order_confirmation': {
                    'subject': 'Order Confirmation #{order_number}',
                    'body': '''
                    Dear {customer_name},

                    Thank you for your order from Auraa Luxury!

                    Order Details:
                    Order Number: {order_number}
                    Total Amount: {total_amount} {currency}
                    
                    Your order will be shipped within 2-3 business days.
                    
                    Best regards,
                    Auraa Luxury Team
                    '''
                },
                'shipping_notification': {
                    'subject': 'Your Order #{order_number} Has Shipped',
                    'body': '''
                    Dear {customer_name},

                    Your order has been shipped successfully!

                    Tracking Number: {tracking_number}
                    Carrier: {carrier}
                    Estimated Delivery: {estimated_delivery}
                    
                    Track your order: {tracking_url}
                    
                    Best regards,
                    Auraa Luxury Team
                    '''
                },
                'delivery_confirmation': {
                    'subject': 'Your Order #{order_number} Has Been Delivered',
                    'body': '''
                    Dear {customer_name},

                    Your order has been delivered successfully!

                    We hope you are satisfied with your purchase from Auraa Luxury.
                    Please rate your experience with us.
                    
                    Best regards,
                    Auraa Luxury Team
                    '''
                }
            }
        }
    
    async def send_notification(
        self,
        notification_type: str,
        recipient: Dict[str, Any],
        data: Dict[str, Any],
        channels: List[str] = ['email']
    ) -> Dict[str, Any]:
        """
        Send notification via specified channels
        
        Args:
            notification_type: Type of notification
            recipient: Recipient information
            data: Notification data
            channels: List of channels to use
            
        Returns:
            Results for each channel
        """
        results = {}
        language = data.get('language', 'ar')
        
        # Get template
        template = self.templates[language].get(notification_type)
        if not template:
            return {'error': f'Template not found for {notification_type}'}
        
        # Format message
        formatted_data = self._format_notification_data(data)
        subject = template['subject'].format(**formatted_data)
        body = template['body'].format(**formatted_data)
        
        # Send via each channel
        for channel in channels:
            try:
                if channel == 'email' and recipient.get('email'):
                    results['email'] = await self._send_email(
                        recipient['email'],
                        subject,
                        body,
                        data.get('html_template')
                    )
                
                elif channel == 'sms' and recipient.get('phone'):
                    sms_message = f"{subject}\n\n{body}"
                    results['sms'] = await self._send_sms(
                        recipient['phone'],
                        sms_message
                    )
                
                elif channel == 'whatsapp' and recipient.get('phone'):
                    results['whatsapp'] = await self._send_whatsapp(
                        recipient['phone'],
                        body,
                        notification_type
                    )
                
                elif channel == 'in_app':
                    results['in_app'] = await self._send_in_app_notification(
                        recipient.get('user_id'),
                        subject,
                        body,
                        data
                    )
                
            except Exception as e:
                results[channel] = {'success': False, 'error': str(e)}
        
        # Log notification
        await self._log_notification(notification_type, recipient, data, results)
        
        return results
    
    async def _send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_template: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email via SendGrid"""
        if not self.sendgrid_api_key:
            return {'success': False, 'error': 'SendGrid not configured'}
        
        try:
            url = "https://api.sendgrid.com/v3/mail/send"
            headers = {
                "Authorization": f"Bearer {self.sendgrid_api_key}",
                "Content-Type": "application/json"
            }
            
            email_data = {
                "personalizations": [{
                    "to": [{"email": to_email}],
                    "subject": subject
                }],
                "from": {"email": "noreply@auraaluxury.com", "name": "Auraa Luxury"},
                "content": [
                    {"type": "text/plain", "value": body}
                ]
            }
            
            if html_template:
                email_data["content"].append({
                    "type": "text/html",
                    "value": html_template
                })
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=email_data)
                
                if response.status_code == 202:
                    return {'success': True, 'message_id': response.headers.get('X-Message-Id')}
                else:
                    return {'success': False, 'error': f'SendGrid error: {response.status_code}'}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _send_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send SMS via Twilio"""
        if not all([self.twilio_sid, self.twilio_token, self.twilio_from]):
            return {'success': False, 'error': 'Twilio not configured'}
        
        try:
            url = f"https://api.twilio.com/2010-04-01/Accounts/{self.twilio_sid}/Messages.json"
            
            auth = (self.twilio_sid, self.twilio_token)
            data = {
                'From': self.twilio_from,
                'To': to_phone,
                'Body': message
            }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, data=data, auth=auth)
                
                if response.status_code == 201:
                    result = response.json()
                    return {'success': True, 'message_sid': result['sid']}
                else:
                    return {'success': False, 'error': f'Twilio error: {response.status_code}'}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _send_whatsapp(
        self,
        to_phone: str,
        message: str,
        template_type: str
    ) -> Dict[str, Any]:
        """Send WhatsApp message via Meta API"""
        if not all([self.whatsapp_token, self.whatsapp_phone_id]):
            return {'success': False, 'error': 'WhatsApp not configured'}
        
        try:
            url = f"https://graph.facebook.com/v18.0/{self.whatsapp_phone_id}/messages"
            headers = {
                "Authorization": f"Bearer {self.whatsapp_token}",
                "Content-Type": "application/json"
            }
            
            # Use template for business messages
            if template_type in ['order_confirmation', 'shipping_notification']:
                data = {
                    "messaging_product": "whatsapp",
                    "to": to_phone,
                    "type": "template",
                    "template": {
                        "name": f"auraa_{template_type}",
                        "language": {"code": "ar"},
                        "components": []
                    }
                }
            else:
                # Send as text for other types
                data = {
                    "messaging_product": "whatsapp",
                    "to": to_phone,
                    "type": "text",
                    "text": {"body": message}
                }
            
            async with httpx.AsyncClient() as client:
                response = await client.post(url, headers=headers, json=data)
                
                if response.status_code == 200:
                    result = response.json()
                    return {'success': True, 'message_id': result.get('messages', [{}])[0].get('id')}
                else:
                    return {'success': False, 'error': f'WhatsApp error: {response.status_code}'}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    async def _send_in_app_notification(
        self,
        user_id: str,
        title: str,
        body: str,
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send in-app notification"""
        try:
            notification = {
                'user_id': user_id,
                'title': title,
                'body': body,
                'data': data,
                'created_at': datetime.utcnow(),
                'read': False,
                'type': data.get('notification_type', 'general')
            }
            
            result = await self.db.notifications.insert_one(notification)
            
            return {'success': True, 'notification_id': str(result.inserted_id)}
        
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def _format_notification_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Format notification data for template"""
        formatted = data.copy()
        
        # Format currency amounts
        if 'total_amount' in data:
            formatted['total_amount'] = f"{data['total_amount']:.2f}"
        
        # Format dates
        if 'estimated_delivery' in data and isinstance(data['estimated_delivery'], datetime):
            formatted['estimated_delivery'] = data['estimated_delivery'].strftime('%Y-%m-%d')
        
        # Generate tracking URL if tracking number exists
        if 'tracking_number' in data and not data.get('tracking_url'):
            formatted['tracking_url'] = f"https://auraaluxury.com/track/{data['tracking_number']}"
        
        return formatted
    
    async def _log_notification(
        self,
        notification_type: str,
        recipient: Dict[str, Any],
        data: Dict[str, Any],
        results: Dict[str, Any]
    ):
        """Log notification for analytics"""
        log_entry = {
            'type': notification_type,
            'recipient': {
                'email': recipient.get('email'),
                'phone': recipient.get('phone'),
                'user_id': recipient.get('user_id')
            },
            'channels': list(results.keys()),
            'results': results,
            'data': data,
            'created_at': datetime.utcnow(),
            'success_count': sum(1 for r in results.values() if r.get('success')),
            'total_channels': len(results)
        }
        
        await self.db.notification_logs.insert_one(log_entry)
    
    async def process_pending_notifications(self) -> Dict[str, Any]:
        """
        Process all pending notifications from the queue
        
        Returns:
            Processing statistics
        """
        start_time = datetime.utcnow()
        stats = {
            'start_time': start_time.isoformat(),
            'processed': 0,
            'succeeded': 0,
            'failed': 0,
            'errors': []
        }
        
        try:
            # Get pending notifications
            cursor = self.db.pending_notifications.find({
                'processed': False,
                'created_at': {'$gte': datetime.utcnow() - timedelta(hours=24)}  # Only process recent ones
            }).sort('created_at', 1).limit(100)  # Process in batches
            
            notifications = await cursor.to_list(length=100)
            
            for notification in notifications:
                try:
                    data = notification['data']
                    
                    # Determine recipient and channels
                    recipient = {
                        'email': data.get('customer_email'),
                        'phone': data.get('customer_phone'),
                        'user_id': data.get('user_id')
                    }
                    
                    # Get preferred channels from order or use defaults
                    channels = data.get('notification_channels', ['email'])
                    
                    # Send notification
                    results = await self.send_notification(
                        notification['type'],
                        recipient,
                        data,
                        channels
                    )
                    
                    # Mark as processed
                    await self.db.pending_notifications.update_one(
                        {'_id': notification['_id']},
                        {
                            '$set': {
                                'processed': True,
                                'processed_at': datetime.utcnow(),
                                'results': results
                            }
                        }
                    )
                    
                    stats['processed'] += 1
                    
                    if any(r.get('success') for r in results.values()):
                        stats['succeeded'] += 1
                    else:
                        stats['failed'] += 1
                
                except Exception as e:
                    stats['errors'].append({
                        'notification_id': str(notification['_id']),
                        'error': str(e)
                    })
                    stats['failed'] += 1
                    
                    # Mark as processed with error
                    await self.db.pending_notifications.update_one(
                        {'_id': notification['_id']},
                        {
                            '$set': {
                                'processed': True,
                                'processed_at': datetime.utcnow(),
                                'error': str(e)
                            }
                        }
                    )
        
        except Exception as e:
            stats['errors'].append({'general': str(e)})
        
        end_time = datetime.utcnow()
        stats['end_time'] = end_time.isoformat()
        stats['duration_seconds'] = (end_time - start_time).total_seconds()
        
        return stats
    
    async def get_notification_preferences(self, user_id: str) -> Dict[str, Any]:
        """Get user notification preferences"""
        prefs = await self.db.user_preferences.find_one({'user_id': user_id})
        
        if not prefs:
            # Default preferences
            return {
                'email': True,
                'sms': True,
                'whatsapp': False,
                'in_app': True,
                'order_updates': True,
                'marketing': False,
                'language': 'ar'
            }
        
        return prefs.get('notifications', {})
    
    async def update_notification_preferences(
        self,
        user_id: str,
        preferences: Dict[str, Any]
    ) -> bool:
        """Update user notification preferences"""
        try:
            await self.db.user_preferences.update_one(
                {'user_id': user_id},
                {
                    '$set': {
                        'notifications': preferences,
                        'updated_at': datetime.utcnow()
                    }
                },
                upsert=True
            )
            return True
        except Exception:
            return False