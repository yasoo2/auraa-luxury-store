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



# ---------------------------------------------------------------------------
# The owner's alert
#
# Orders wait for a human before anything is bought from the supplier, so the
# store has to tell that human an order is waiting. Without this the queue is
# only visible to whoever thinks to open the dashboard.
# ---------------------------------------------------------------------------

ORDER_NOTIFY_EMAIL = os.environ.get("ORDER_NOTIFY_EMAIL", SENDGRID_FROM_EMAIL)
STORE_ADMIN_URL = os.environ.get("STORE_ADMIN_URL", "https://auraaluxury.com/admin/orders")


def email_is_configured() -> bool:
    """Whether this deployment can actually send mail."""
    return bool(SENDGRID_API_KEY)


def send_order_awaiting_approval_email(order: dict) -> bool:
    """
    Tell the owner an order has come in and what it is waiting for.

    The subject used to say "waiting for your approval" whatever the order was
    actually waiting for. An order paid by bank transfer is waiting for money
    to land in an account, which is a different job, done somewhere else, and
    the owner should not have to open the panel to find out which of the two
    this is.

    Returns False rather than raising: a customer's order must not fail because
    the shop's mail provider is down. The caller logs it.
    """
    if not email_is_configured():
        logger.error(
            "SENDGRID_API_KEY is not set — nobody was told that order "
            f"{order.get('order_number')} is waiting for approval"
        )
        return False

    number = order.get("order_number") or order.get("id")
    total = order.get("total_amount", 0)
    address = order.get("shipping_address") or {}
    recipient = " ".join(str(address.get(k) or "") for k in ("firstName", "lastName")).strip() \
        or address.get("fullName") or address.get("name") or "—"

    # What this order is actually waiting for, which is not the same thing for
    # every payment method.
    if order.get("payment_status") == "paid":
        headline = "طلب مدفوع بانتظار موافقتك"
        sub = "المبلغ مؤكَّد. لن يُشترى شيء من المورّد حتى تضغط «أرسل إلى CJ»."
    elif order.get("payment_method") == "bank_transfer":
        headline = "طلب جديد بانتظار وصول الحوالة"
        sub = ("راجع حسابك البنكي بحثاً عن حوالة بهذا الرقم، ثم أكّد استلام المبلغ "
               "في لوحة التحكم — عندها فقط يمكن إرساله إلى CJ.")
    else:
        headline = "طلب جديد بانتظار إتمام الدفع"
        sub = ("تواصل مع العميل لإتمام الدفع، ثم أكّد استلام المبلغ في لوحة التحكم — "
               "عندها فقط يمكن إرساله إلى CJ.")

    rows = "".join(
        f"<tr><td style='padding:6px 10px;border-bottom:1px solid #eee'>{item.get('product_name') or item.get('product_id')}</td>"
        f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:center'>{item.get('quantity')}</td>"
        f"<td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:left' dir='ltr'>{item.get('price')} SAR</td></tr>"
        for item in (order.get("items") or [])
    )

    html_content = f"""
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:system-ui,Arial,sans-serif;background:#faf7f2;padding:24px">
      <div style="max-width:640px;margin:auto;background:#fff;border-radius:12px;padding:24px">
        <h2 style="color:#b45309;margin:0 0 4px">{headline}</h2>
        <p style="color:#666;margin:0 0 20px">{sub}</p>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
          <tr><td style="padding:6px 0;color:#666">رقم الطلب</td>
              <td style="padding:6px 0;font-weight:bold" dir="ltr">{number}</td></tr>
          <tr><td style="padding:6px 0;color:#666">الإجمالي</td>
              <td style="padding:6px 0;font-weight:bold" dir="ltr">{total} SAR</td></tr>
          <tr><td style="padding:6px 0;color:#666">طريقة الدفع</td>
              <td style="padding:6px 0">{'حوالة بنكية' if order.get('payment_method') == 'bank_transfer' else 'الدفع عند تأكيد الطلب'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">المستلِم</td>
              <td style="padding:6px 0">{recipient}</td></tr>
          <tr><td style="padding:6px 0;color:#666">المدينة</td>
              <td style="padding:6px 0">{address.get('city') or '—'} — {address.get('country') or '—'}</td></tr>
          <tr><td style="padding:6px 0;color:#666">الهاتف</td>
              <td style="padding:6px 0" dir="ltr">{address.get('phone') or '—'}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:24px">
          <thead><tr style="background:#faf7f2">
            <th style="padding:8px 10px;text-align:right">المنتج</th>
            <th style="padding:8px 10px">الكمية</th>
            <th style="padding:8px 10px;text-align:left">السعر</th>
          </tr></thead>
          <tbody>{rows}</tbody>
        </table>

        <a href="{STORE_ADMIN_URL}"
           style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;
                  padding:12px 24px;border-radius:8px;font-weight:bold">
          مراجعة الطلب
        </a>
      </div>
    </body>
    </html>
    """

    return send_email(
        to_email=ORDER_NOTIFY_EMAIL,
        subject=f"{headline} #{number}",
        html_content=html_content,
    )
