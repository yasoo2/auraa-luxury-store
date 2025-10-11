"""
Content Protection Service
Anti-screenshot and content protection for luxury products
"""

import asyncio
import os
import hashlib
import base64
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO


class ContentProtectionService:
    """
    Service for protecting luxury product content from unauthorized use
    """
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.watermark_enabled = os.getenv('CONTENT_PROTECTION_ENABLED', 'true').lower() == 'true'
        self.watermark_opacity = int(os.getenv('WATERMARK_OPACITY', '30'))
        self.detection_enabled = os.getenv('SCREENSHOT_DETECTION_ENABLED', 'true').lower() == 'true'
    
    async def apply_dynamic_watermark(
        self,
        image_data: bytes,
        user_id: str,
        product_id: str,
        timestamp: Optional[datetime] = None
    ) -> bytes:
        """
        Apply dynamic watermark to product image
        
        Args:
            image_data: Original image data
            user_id: User identifier
            product_id: Product identifier
            timestamp: Watermark timestamp
            
        Returns:
            Watermarked image data
        """
        if not self.watermark_enabled:
            return image_data
        
        try:
            if timestamp is None:
                timestamp = datetime.utcnow()
            
            # Generate unique watermark text
            watermark_id = self._generate_watermark_id(user_id, product_id, timestamp)
            watermark_text = f"AL-{watermark_id}"
            
            # Load image
            image = Image.open(BytesIO(image_data))
            
            # Convert to RGBA for transparency
            if image.mode != 'RGBA':
                image = image.convert('RGBA')
            
            # Create watermark overlay
            watermark = self._create_watermark_overlay(
                image.size,
                watermark_text,
                self.watermark_opacity
            )
            
            # Composite images
            watermarked = Image.alpha_composite(image, watermark)
            
            # Convert back to RGB if needed
            if watermarked.mode == 'RGBA':
                background = Image.new('RGB', watermarked.size, (255, 255, 255))
                background.paste(watermarked, mask=watermarked.split()[-1])
                watermarked = background
            
            # Save to bytes
            output = BytesIO()
            watermarked.save(output, format='JPEG', quality=85, optimize=True)
            
            # Log watermark application
            await self._log_watermark_application(user_id, product_id, watermark_id)
            
            return output.getvalue()
        
        except Exception as e:
            # Return original image if watermarking fails
            await self._log_protection_error('watermark_failed', str(e), user_id, product_id)
            return image_data
    
    def _generate_watermark_id(self, user_id: str, product_id: str, timestamp: datetime) -> str:
        """Generate unique watermark identifier"""
        data = f"{user_id}:{product_id}:{timestamp.strftime('%Y%m%d%H%M%S')}"
        return hashlib.sha256(data.encode()).hexdigest()[:12].upper()
    
    def _create_watermark_overlay(self, size: tuple, text: str, opacity: int) -> Image.Image:
        """Create transparent watermark overlay"""
        # Create transparent overlay
        overlay = Image.new('RGBA', size, (255, 255, 255, 0))
        draw = ImageDraw.Draw(overlay)
        
        # Try to load custom font, fallback to default
        try:
            font_size = max(size) // 30  # Dynamic font size based on image
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        # Get text dimensions
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        
        # Calculate positions for diagonal pattern
        positions = []
        spacing_x = text_width + 50
        spacing_y = text_height + 30
        
        for y in range(-text_height, size[1] + text_height, spacing_y):
            for x in range(-text_width, size[0] + text_width, spacing_x):
                # Offset every other row for diagonal pattern
                offset = (spacing_x // 2) if (y // spacing_y) % 2 else 0
                positions.append((x + offset, y))
        
        # Draw watermark at each position
        alpha = int(255 * (opacity / 100))
        text_color = (200, 200, 200, alpha)
        
        for x, y in positions:
            draw.text((x, y), text, fill=text_color, font=font)
        
        return overlay
    
    async def log_screenshot_attempt(
        self,
        user_id: str,
        user_agent: str,
        ip_address: str,
        page_url: str,
        detection_method: str
    ) -> str:
        """
        Log potential screenshot attempt
        
        Args:
            user_id: User identifier
            user_agent: Browser user agent
            ip_address: Client IP address
            page_url: Page URL where attempt occurred
            detection_method: How it was detected
            
        Returns:
            Incident ID
        """
        try:
            incident_id = hashlib.sha256(
                f"{user_id}:{ip_address}:{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()[:16].upper()
            
            incident = {
                'incident_id': incident_id,
                'user_id': user_id,
                'ip_address': ip_address,
                'user_agent': user_agent,
                'page_url': page_url,
                'detection_method': detection_method,
                'timestamp': datetime.utcnow(),
                'severity': self._assess_incident_severity(detection_method),
                'processed': False
            }
            
            await self.db.security_incidents.insert_one(incident)
            
            # Check for repeated attempts
            await self._check_repeat_attempts(user_id, ip_address)
            
            return incident_id
        
        except Exception as e:
            await self._log_protection_error('incident_logging_failed', str(e), user_id)
            return 'ERROR'
    
    def _assess_incident_severity(self, detection_method: str) -> str:
        """Assess severity of security incident"""
        severity_map = {
            'screenshot_key': 'medium',
            'print_screen': 'medium',
            'dev_tools': 'high',
            'right_click_image': 'low',
            'rapid_browsing': 'medium',
            'suspicious_pattern': 'high'
        }
        
        return severity_map.get(detection_method, 'low')
    
    async def _check_repeat_attempts(self, user_id: str, ip_address: str):
        """Check for repeated screenshot attempts and take action"""
        try:
            # Count incidents in last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            count = await self.db.security_incidents.count_documents({
                '$or': [
                    {'user_id': user_id},
                    {'ip_address': ip_address}
                ],
                'timestamp': {'$gte': one_hour_ago}
            })
            
            if count >= 5:  # 5 attempts in 1 hour
                # Flag for admin review
                await self._flag_suspicious_activity(user_id, ip_address, count)
        
        except Exception as e:
            await self._log_protection_error('repeat_check_failed', str(e), user_id)
    
    async def _flag_suspicious_activity(self, user_id: str, ip_address: str, attempt_count: int):
        """Flag suspicious activity for admin review"""
        alert = {
            'type': 'suspicious_screenshot_activity',
            'user_id': user_id,
            'ip_address': ip_address,
            'attempt_count': attempt_count,
            'timestamp': datetime.utcnow(),
            'status': 'pending_review',
            'severity': 'high' if attempt_count >= 10 else 'medium'
        }
        
        await self.db.admin_alerts.insert_one(alert)
    
    async def generate_protected_url(
        self,
        resource_path: str,
        user_id: str,
        expires_in_seconds: int = 3600
    ) -> str:
        """
        Generate time-limited protected URL for resources
        
        Args:
            resource_path: Path to resource
            user_id: User accessing resource
            expires_in_seconds: URL validity period
            
        Returns:
            Protected URL with token
        """
        try:
            expires_at = datetime.utcnow() + timedelta(seconds=expires_in_seconds)
            
            # Create token data
            token_data = {
                'resource': resource_path,
                'user_id': user_id,
                'expires': expires_at.timestamp()
            }
            
            # Generate signature
            token_string = base64.b64encode(
                f"{resource_path}:{user_id}:{expires_at.timestamp()}".encode()
            ).decode()
            
            signature = hashlib.sha256(
                f"{token_string}:{os.getenv('SECRET_KEY', 'fallback')}".encode()
            ).hexdigest()[:16]
            
            # Store token
            await self.db.access_tokens.insert_one({
                'token': token_string,
                'signature': signature,
                'user_id': user_id,
                'resource': resource_path,
                'expires_at': expires_at,
                'created_at': datetime.utcnow(),
                'used': False
            })
            
            return f"/protected/{token_string}/{signature}"
        
        except Exception as e:
            await self._log_protection_error('url_generation_failed', str(e), user_id)
            return resource_path  # Fallback to unprotected URL
    
    async def validate_access_token(self, token: str, signature: str) -> Dict[str, Any]:
        """
        Validate protected resource access token
        
        Args:
            token: Access token
            signature: Token signature
            
        Returns:
            Validation result
        """
        try:
            # Find token in database
            token_doc = await self.db.access_tokens.find_one({
                'token': token,
                'signature': signature
            })
            
            if not token_doc:
                return {'valid': False, 'reason': 'Token not found'}
            
            # Check expiration
            if datetime.utcnow() > token_doc['expires_at']:
                return {'valid': False, 'reason': 'Token expired'}
            
            # Check if already used (optional single-use tokens)
            if token_doc.get('single_use', False) and token_doc.get('used', False):
                return {'valid': False, 'reason': 'Token already used'}
            
            # Mark as used if single-use
            if token_doc.get('single_use', False):
                await self.db.access_tokens.update_one(
                    {'_id': token_doc['_id']},
                    {'$set': {'used': True, 'used_at': datetime.utcnow()}}
                )
            
            return {
                'valid': True,
                'user_id': token_doc['user_id'],
                'resource': token_doc['resource']
            }
        
        except Exception as e:
            return {'valid': False, 'reason': f'Validation error: {str(e)}'}
    
    async def get_protection_analytics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """
        Get content protection analytics
        
        Args:
            start_date: Start of analysis period
            end_date: End of analysis period
            
        Returns:
            Protection analytics data
        """
        try:
            # Screenshot attempts
            attempts_pipeline = [
                {
                    '$match': {
                        'timestamp': {'$gte': start_date, '$lte': end_date}
                    }
                },
                {
                    '$group': {
                        '_id': {
                            'method': '$detection_method',
                            'date': {'$dateToString': {'format': '%Y-%m-%d', 'date': '$timestamp'}}
                        },
                        'count': {'$sum': 1}
                    }
                }
            ]
            
            attempts_data = await self.db.security_incidents.aggregate(attempts_pipeline).to_list(None)
            
            # Watermark applications
            watermarks_count = await self.db.watermark_logs.count_documents({
                'timestamp': {'$gte': start_date, '$lte': end_date}
            })
            
            # Protected URL accesses
            url_accesses = await self.db.access_tokens.count_documents({
                'created_at': {'$gte': start_date, '$lte': end_date}
            })
            
            # Top suspicious IPs
            suspicious_ips = await self.db.security_incidents.aggregate([
                {
                    '$match': {
                        'timestamp': {'$gte': start_date, '$lte': end_date}
                    }
                },
                {
                    '$group': {
                        '_id': '$ip_address',
                        'attempts': {'$sum': 1},
                        'methods': {'$addToSet': '$detection_method'}
                    }
                },
                {'$sort': {'attempts': -1}},
                {'$limit': 10}
            ]).to_list(10)
            
            return {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'screenshot_attempts': attempts_data,
                'watermarks_applied': watermarks_count,
                'protected_url_accesses': url_accesses,
                'top_suspicious_ips': suspicious_ips,
                'total_incidents': len(attempts_data)
            }
        
        except Exception as e:
            return {
                'error': str(e),
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                }
            }
    
    async def _log_watermark_application(self, user_id: str, product_id: str, watermark_id: str):
        """Log watermark application for tracking"""
        try:
            log_entry = {
                'user_id': user_id,
                'product_id': product_id,
                'watermark_id': watermark_id,
                'timestamp': datetime.utcnow(),
                'type': 'watermark_applied'
            }
            
            await self.db.watermark_logs.insert_one(log_entry)
        
        except Exception:
            pass  # Silently fail logging to not affect main functionality
    
    async def _log_protection_error(self, error_type: str, error_message: str, user_id: str = None, product_id: str = None):
        """Log protection system errors"""
        try:
            error_log = {
                'error_type': error_type,
                'error_message': error_message,
                'user_id': user_id,
                'product_id': product_id,
                'timestamp': datetime.utcnow()
            }
            
            await self.db.protection_errors.insert_one(error_log)
        
        except Exception:
            pass  # Silently fail to prevent cascading errors