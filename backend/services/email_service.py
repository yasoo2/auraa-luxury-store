"""
Email Service for Auraa Luxury
Handles all transactional emails using Gmail SMTP
"""

import os
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
from typing import Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# SMTP Configuration
SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', '587'))
SMTP_USERNAME = os.environ.get('SMTP_USERNAME', 'info.auraaluxury@gmail.com')
SMTP_PASSWORD = os.environ.get('SMTP_PASSWORD', '')
SMTP_FROM_EMAIL = os.environ.get('SMTP_FROM_EMAIL', 'info@auraaluxury.com')
SMTP_FROM_NAME = os.environ.get('SMTP_FROM_NAME', 'Auraa Luxury Support')


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    to_name: Optional[str] = None
) -> bool:
    """
    Send email using Gmail SMTP
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of email
        to_name: Optional recipient name
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        # Create message
        msg = MIMEMultipart('alternative')
        msg['From'] = formataddr((SMTP_FROM_NAME, SMTP_FROM_EMAIL))
        msg['To'] = formataddr((to_name or to_email, to_email))
        msg['Subject'] = subject
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html', 'utf-8')
        msg.attach(html_part)
        
        # Connect to SMTP server and send
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.send_message(msg)
        
        logger.info(f"Email sent successfully to {to_email}: {subject}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False


def send_order_confirmation(
    to_email: str,
    customer_name: str,
    order_number: str,
    order_total: float,
    currency: str,
    items: List[dict],
    shipping_address: dict
) -> bool:
    """
    Send order confirmation email
    
    Args:
        to_email: Customer email
        customer_name: Customer name
        order_number: Order number (e.g., AUR-20251013-ABC123)
        order_total: Total order amount
        currency: Currency code
        items: List of order items
        shipping_address: Shipping address dict
    
    Returns:
        bool: True if sent successfully
    """
    subject = f"✅ Order Confirmation - {order_number}"
    
    # Build items HTML
    items_html = ""
    for item in items:
        item_name = item.get('product_name') or item.get('name', 'Product')
        item_price = item.get('price', 0)
        item_qty = item.get('quantity', 1)
        items_html += f"""
        <tr>
            <td style="padding: 10px; border-bottom: 1px solid #eee;">{item_name}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">{item_qty}</td>
            <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">{item_price} {currency}</td>
        </tr>
        """
    
    # Build shipping address HTML
    address_html = f"""
    {shipping_address.get('firstName', '')} {shipping_address.get('lastName', '')}<br>
    {shipping_address.get('street', '')}<br>
    {shipping_address.get('city', '')}, {shipping_address.get('state', '')} {shipping_address.get('zipCode', '')}<br>
    {shipping_address.get('country', '')}
    """
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">Auraa Luxury</h1>
                <p style="margin: 10px 0 0 0; color: #ffffff; font-size: 14px; opacity: 0.9;">Premium Accessories</p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h2 style="margin: 0 0 20px 0; color: #1F2937; font-size: 24px;">Thank You for Your Order!</h2>
                
                <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                    Dear {customer_name},
                </p>
                
                <p style="color: #4B5563; line-height: 1.6; margin: 0 0 30px 0;">
                    We've received your order and are preparing it for shipment. You'll receive another email with tracking information once your order ships.
                </p>
                
                <!-- Order Details -->
                <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 15px 0; color: #1F2937; font-size: 18px;">Order Details</h3>
                    <p style="margin: 5px 0; color: #4B5563;"><strong>Order Number:</strong> {order_number}</p>
                    <p style="margin: 5px 0; color: #4B5563;"><strong>Order Date:</strong> {datetime.now().strftime('%B %d, %Y')}</p>
                    <p style="margin: 5px 0; color: #4B5563;"><strong>Total:</strong> {order_total} {currency}</p>
                </div>
                
                <!-- Items Table -->
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
                    <thead>
                        <tr style="background-color: #F3F4F6;">
                            <th style="padding: 12px; text-align: left; color: #1F2937; font-weight: 600;">Product</th>
                            <th style="padding: 12px; text-align: center; color: #1F2937; font-weight: 600;">Qty</th>
                            <th style="padding: 12px; text-align: right; color: #1F2937; font-weight: 600;">Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items_html}
                    </tbody>
                </table>
                
                <!-- Shipping Address -->
                <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 15px 0; color: #1F2937; font-size: 18px;">Shipping Address</h3>
                    <p style="margin: 0; color: #4B5563; line-height: 1.6;">
                        {address_html}
                    </p>
                </div>
                
                <!-- Track Order Button -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <a href="https://auraaluxury.com/order-tracking?utm_source=email&utm_medium=order_confirmation&utm_campaign=transactional" 
                       style="display: inline-block; background-color: #D97706; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Track Your Order
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0;">
                    If you have any questions, please don't hesitate to contact us at 
                    <a href="mailto:info@auraaluxury.com" style="color: #D97706; text-decoration: none;">info@auraaluxury.com</a>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #F3F4F6; padding: 20px 30px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">
                    © 2025 Auraa Luxury. All rights reserved.
                </p>
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    Premium Accessories | Saudi Arabia
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content, customer_name)


def send_welcome_email(to_email: str, customer_name: str) -> bool:
    """
    Send welcome email to new customers
    
    Args:
        to_email: Customer email
        customer_name: Customer name
    
    Returns:
        bool: True if sent successfully
    """
    subject = "🎉 Welcome to Auraa Luxury!"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); padding: 40px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 36px; font-weight: bold;">Welcome to Auraa Luxury!</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <h2 style="margin: 0 0 20px 0; color: #1F2937; font-size: 24px;">Hello {customer_name}! 👋</h2>
                
                <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                    Thank you for joining Auraa Luxury, your destination for premium accessories.
                </p>
                
                <p style="color: #4B5563; line-height: 1.6; margin: 0 0 30px 0;">
                    We're excited to have you as part of our exclusive community. Explore our curated collection of luxury accessories designed for discerning customers like you.
                </p>
                
                <!-- Features -->
                <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
                    <h3 style="margin: 0 0 15px 0; color: #1F2937; font-size: 18px;">Why Shop with Us?</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #4B5563; line-height: 1.8;">
                        <li>Premium quality accessories</li>
                        <li>Fast & reliable shipping</li>
                        <li>Secure payment methods</li>
                        <li>24/7 customer support</li>
                    </ul>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 30px;">
                    <a href="https://auraaluxury.com/products" 
                       style="display: inline-block; background-color: #D97706; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Start Shopping
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 0;">
                    Have questions? We're here to help!<br>
                    Contact us at <a href="mailto:info@auraaluxury.com" style="color: #D97706; text-decoration: none;">info@auraaluxury.com</a>
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #F3F4F6; padding: 20px 30px; text-align: center;">
                <p style="margin: 0 0 10px 0; color: #6B7280; font-size: 14px;">
                    © 2025 Auraa Luxury. All rights reserved.
                </p>
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    Premium Accessories | Saudi Arabia
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content, customer_name)


def send_contact_notification(
    customer_name: str,
    customer_email: str,
    message: str,
    subject_line: Optional[str] = None
) -> bool:
    """
    Send contact form notification to store admin
    
    Args:
        customer_name: Customer name
        customer_email: Customer email
        message: Message content
        subject_line: Optional subject line
    
    Returns:
        bool: True if sent successfully
    """
    subject = f"📩 New Contact Form Submission{': ' + subject_line if subject_line else ''}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; padding: 30px;">
            <h2 style="margin: 0 0 20px 0; color: #1F2937;">New Contact Form Submission</h2>
            
            <div style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                <p style="margin: 5px 0; color: #4B5563;"><strong>Name:</strong> {customer_name}</p>
                <p style="margin: 5px 0; color: #4B5563;"><strong>Email:</strong> {customer_email}</p>
                {f'<p style="margin: 5px 0; color: #4B5563;"><strong>Subject:</strong> {subject_line}</p>' if subject_line else ''}
            </div>
            
            <div style="background-color: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #1F2937; font-size: 16px;">Message:</h3>
                <p style="margin: 0; color: #4B5563; line-height: 1.6; white-space: pre-wrap;">{message}</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    # Send to admin email
    return send_email(SMTP_FROM_EMAIL, subject, html_content)


def send_password_reset_email(
    to_email: str,
    customer_name: str,
    reset_token: str
) -> bool:
    """
    Send password reset email
    
    Args:
        to_email: Customer email
        customer_name: Customer name
        reset_token: Password reset token
    
    Returns:
        bool: True if sent successfully
    """
    subject = "🔐 Reset Your Password - Auraa Luxury"
    reset_link = f"https://auraaluxury.com/reset-password?token={reset_token}"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #D97706 0%, #F59E0B 100%); padding: 30px; text-align: center;">
                <h1 style="margin: 0; color: #ffffff; font-size: 28px;">Password Reset Request</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;">
                <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                    Hello {customer_name},
                </p>
                
                <p style="color: #4B5563; line-height: 1.6; margin: 0 0 20px 0;">
                    We received a request to reset your password for your Auraa Luxury account. Click the button below to create a new password.
                </p>
                
                <!-- CTA Button -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" 
                       style="display: inline-block; background-color: #D97706; color: #ffffff; padding: 14px 40px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px;">
                        Reset Password
                    </a>
                </div>
                
                <p style="color: #6B7280; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                    Or copy and paste this link into your browser:<br>
                    <a href="{reset_link}" style="color: #D97706; word-break: break-all;">{reset_link}</a>
                </p>
                
                <div style="background-color: #FEF3C7; border-left: 4px solid #F59E0B; padding: 15px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0; color: #92400E; font-size: 14px;">
                        ⚠️ If you didn't request this password reset, please ignore this email or contact us if you have concerns.
                    </p>
                </div>
                
                <p style="color: #9CA3AF; font-size: 12px; margin: 20px 0 0 0;">
                    This link will expire in 1 hour for security reasons.
                </p>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #F3F4F6; padding: 20px 30px; text-align: center;">
                <p style="margin: 0 0 5px 0; color: #6B7280; font-size: 14px;">
                    © 2025 Auraa Luxury. All rights reserved.
                </p>
                <p style="margin: 0; color: #9CA3AF; font-size: 12px;">
                    <a href="mailto:info@auraaluxury.com" style="color: #D97706; text-decoration: none;">info@auraaluxury.com</a>
                </p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content, customer_name)
