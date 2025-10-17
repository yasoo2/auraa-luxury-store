"""
Email Service for Auraa Luxury
Handles all transactional emails using SendGrid
"""

import os
import logging
from typing import Optional
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Email, To, Content

logger = logging.getLogger(__name__)

# SendGrid Configuration
SENDGRID_API_KEY = os.environ.get('SENDGRID_API_KEY', '')
SENDGRID_FROM_EMAIL = os.environ.get('SENDGRID_FROM_EMAIL', 'info.auraaluxury@gmail.com')
SENDGRID_FROM_NAME = os.environ.get('SENDGRID_FROM_NAME', 'Auraa Luxury')


def send_email(
    to_email: str,
    subject: str,
    html_content: str,
    to_name: Optional[str] = None
) -> bool:
    """
    Send email using SendGrid
    
    Args:
        to_email: Recipient email address
        subject: Email subject
        html_content: HTML content of email
        to_name: Optional recipient name
    
    Returns:
        bool: True if successful, False otherwise
    """
    
    if not SENDGRID_API_KEY:
        logger.error("SendGrid API key not configured")
        return False
    
    try:
        # Create message
        from_email = Email(SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME)
        to = To(to_email, to_name)
        content = Content("text/html", html_content)
        
        mail = Mail(from_email, to, subject, content)
        
        # Send email
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(mail)
        
        if response.status_code in [200, 201, 202]:
            logger.info(f"Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"Failed to send email to {to_email}: {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {str(e)}")
        return False


def send_welcome_email(user_email: str, user_name: str) -> bool:
    """Send welcome email to new user"""
    
    subject = "مرحباً بك في Auraa Luxury! 🎉"
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }}
            .header h1 {{
                margin: 0;
                font-size: 32px;
                font-weight: 700;
            }}
            .content {{
                padding: 40px 30px;
                color: #333;
            }}
            .content h2 {{
                color: #667eea;
                margin-top: 0;
            }}
            .button {{
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 15px 40px;
                text-decoration: none;
                border-radius: 5px;
                margin: 20px 0;
                font-weight: bold;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✨ Auraa Luxury ✨</h1>
            </div>
            <div class="content">
                <h2>مرحباً {user_name}! 🎉</h2>
                <p>نحن سعداء جداً بانضمامك إلى عائلة Auraa Luxury!</p>
                
                <p>متجرنا يقدم لك:</p>
                <ul>
                    <li>💎 إكسسوارات فاخرة حصرية</li>
                    <li>🚚 توصيل سريع وموثوق</li>
                    <li>✨ جودة عالية مضمونة</li>
                    <li>🎁 عروض وخصومات حصرية</li>
                </ul>
                
                <p style="text-align: center;">
                    <a href="https://auraa-luxury-store.vercel.app" class="button">
                        تسوق الآن
                    </a>
                </p>
                
                <p>إذا كان لديك أي استفسار، لا تتردد في التواصل معنا!</p>
                
                <p>مع أطيب التحيات،<br>
                <strong>فريق Auraa Luxury</strong></p>
            </div>
            <div class="footer">
                <p>© 2024 Auraa Luxury. جميع الحقوق محفوظة.</p>
                <p>info.auraaluxury@gmail.com</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content, user_name)


def send_order_confirmation_email(
    user_email: str,
    user_name: str,
    order_id: str,
    total_amount: float
) -> bool:
    """Send order confirmation email"""
    
    subject = f"تأكيد طلبك #{order_id} 📦"
    
    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
        <meta charset="UTF-8">
        <style>
            body {{
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 0;
            }}
            .container {{
                max-width: 600px;
                margin: 40px auto;
                background-color: #ffffff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            }}
            .header {{
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 40px 20px;
                text-align: center;
            }}
            .content {{
                padding: 40px 30px;
                color: #333;
            }}
            .order-box {{
                background-color: #f8f9fa;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
            }}
            .footer {{
                background-color: #f8f9fa;
                padding: 20px;
                text-align: center;
                color: #666;
                font-size: 14px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>✅ تم استلام طلبك!</h1>
            </div>
            <div class="content">
                <h2>شكراً {user_name}! 🎉</h2>
                <p>تم استلام طلبك بنجاح وجاري تجهيزه للشحن.</p>
                
                <div class="order-box">
                    <p><strong>رقم الطلب:</strong> #{order_id}</p>
                    <p><strong>المبلغ الإجمالي:</strong> {total_amount} ريال</p>
                </div>
                
                <p>سنرسل لك تحديثات عن حالة طلبك قريباً!</p>
                
                <p>مع أطيب التحيات،<br>
                <strong>فريق Auraa Luxury</strong></p>
            </div>
            <div class="footer">
                <p>© 2024 Auraa Luxury. جميع الحقوق محفوظة.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(user_email, subject, html_content, user_name)

