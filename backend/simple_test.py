"""
Simple Gmail SMTP Test - Diagnose Connection Issues
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Configuration
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SMTP_USER = "info.auraaluxury@gmail.com"
SMTP_PASS = "kctmoauvcdrjxsft"

print("=" * 60)
print("Gmail SMTP Connection Test")
print("=" * 60)
print(f"Host: {SMTP_HOST}")
print(f"Port: {SMTP_PORT}")
print(f"Username: {SMTP_USER}")
print(f"Password: {'*' * len(SMTP_PASS)} ({len(SMTP_PASS)} chars)")
print()

try:
    print("Step 1: Creating SMTP connection...")
    server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
    print("✅ Connection created")
    
    print("\nStep 2: Starting TLS...")
    server.ehlo()
    server.starttls()
    server.ehlo()
    print("✅ TLS started")
    
    print("\nStep 3: Attempting login...")
    server.login(SMTP_USER, SMTP_PASS)
    print("✅ Login successful!")
    
    print("\nStep 4: Creating test message...")
    msg = MIMEMultipart()
    msg['From'] = "Auraa Luxury Support <info@auraaluxury.com>"
    msg['To'] = "info.auraaluxury@gmail.com"
    msg['Subject'] = "Test Email from Auraa Luxury"
    
    body = """
    <html>
        <body>
            <h2>Test Email</h2>
            <p>This is a test email from Auraa Luxury store.</p>
            <p>If you receive this, the email configuration is working!</p>
        </body>
    </html>
    """
    msg.attach(MIMEText(body, 'html'))
    
    print("\nStep 5: Sending test email...")
    server.send_message(msg)
    print("✅ Email sent successfully!")
    
    server.quit()
    
    print("\n" + "=" * 60)
    print("🎉 SUCCESS! Gmail SMTP is working correctly.")
    print("=" * 60)
    
except smtplib.SMTPAuthenticationError as e:
    print(f"\n❌ Authentication Error: {e}")
    print("\nPossible causes:")
    print("1. App Password is incorrect")
    print("2. 2-Step Verification not enabled")
    print("3. Account locked - visit: https://accounts.google.com/DisplayUnlockCaptcha")
    print("4. 'Less secure app access' not enabled (if using old Gmail)")
    
except Exception as e:
    print(f"\n❌ Error: {e}")
    print(f"Error type: {type(e).__name__}")
