#!/usr/bin/env python3
"""
Test Email Service (SendGrid/Gmail SMTP)
"""

import sys
import os
from pathlib import Path

# Add backend to path
backend_path = Path(__file__).parent / 'backend'
sys.path.insert(0, str(backend_path))

# Load environment
from dotenv import load_dotenv
load_dotenv(backend_path / '.env')

# Import email service
from services.email_service import send_email, send_welcome_email, send_order_confirmation

def test_simple_email():
    """Test simple email"""
    print("\n" + "="*60)
    print("   Testing Email Service")
    print("="*60)
    
    # Get config
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = os.environ.get('SMTP_PORT')
    smtp_user = os.environ.get('SMTP_USERNAME')
    smtp_from = os.environ.get('SMTP_FROM_EMAIL')
    
    print(f"\n📧 SMTP Configuration:")
    print(f"   Host: {smtp_host}")
    print(f"   Port: {smtp_port}")
    print(f"   Username: {smtp_user}")
    print(f"   From: {smtp_from}")
    print()
    
    # Ask for test email
    test_email = input("🎯 Enter test email address (press Enter for younes.sowady2011@gmail.com): ").strip()
    if not test_email:
        test_email = "younes.sowady2011@gmail.com"
    
    print(f"\n📨 Sending test email to: {test_email}")
    print("⏳ Please wait...")
    
    # Test 1: Simple Email
    print("\n1️⃣ Testing Simple Email...")
    try:
        html_content = """
        <html>
            <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
                <div style="max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                    <h1 style="color: #D97706; text-align: center;">🎉 SendGrid/SMTP Test Email</h1>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        Hello! This is a test email from <strong>Auraa Luxury</strong> store.
                    </p>
                    <p style="font-size: 16px; color: #333; line-height: 1.6;">
                        If you're seeing this, your email service is working perfectly! ✅
                    </p>
                    <div style="background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 0; color: #92400E;">
                            <strong>Test Details:</strong><br>
                            Service: SendGrid/Gmail SMTP<br>
                            Time: {time}<br>
                            Status: SUCCESS ✅
                        </p>
                    </div>
                    <p style="text-align: center; color: #666; font-size: 14px; margin-top: 30px;">
                        Best regards,<br>
                        <strong>Auraa Luxury Team</strong>
                    </p>
                </div>
            </body>
        </html>
        """.format(time=__import__('datetime').datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
        
        success = send_email(
            to_email=test_email,
            subject="🧪 Test Email from Auraa Luxury",
            html_content=html_content,
            to_name="Test User"
        )
        
        if success:
            print("   ✅ Simple email sent successfully!")
        else:
            print("   ❌ Failed to send simple email")
            return False
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False
    
    # Test 2: Welcome Email
    print("\n2️⃣ Testing Welcome Email Template...")
    try:
        success = send_welcome_email(
            to_email=test_email,
            customer_name="Test User"
        )
        
        if success:
            print("   ✅ Welcome email sent successfully!")
        else:
            print("   ❌ Failed to send welcome email")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test 3: Order Confirmation Email
    print("\n3️⃣ Testing Order Confirmation Email Template...")
    try:
        test_order = {
            "id": "TEST-12345",
            "items": [
                {
                    "name": "Luxury Watch",
                    "quantity": 1,
                    "price": 299.99
                },
                {
                    "name": "Designer Sunglasses",
                    "quantity": 2,
                    "price": 149.99
                }
            ],
            "total": 599.97,
            "shipping_address": {
                "street": "123 Test Street",
                "city": "Riyadh",
                "country": "Saudi Arabia"
            }
        }
        
        success = send_order_confirmation(
            to_email=test_email,
            customer_name="Test User",
            order_number=test_order["id"],
            order_total=test_order["total"],
            currency="SAR",
            items=test_order["items"],
            shipping_address=test_order["shipping_address"]
        )
        
        if success:
            print("   ✅ Order confirmation email sent successfully!")
        else:
            print("   ❌ Failed to send order confirmation email")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Summary
    print("\n" + "="*60)
    print("   📬 Email Test Summary")
    print("="*60)
    print(f"\n✅ Test emails sent to: {test_email}")
    print("\n📱 Please check your inbox (and spam folder) for:")
    print("   1. Simple test email")
    print("   2. Welcome email")
    print("   3. Order confirmation email")
    print("\n💡 If you don't see the emails:")
    print("   - Check your spam/junk folder")
    print("   - Verify SMTP credentials in .env file")
    print("   - Check backend logs for errors")
    print("\n" + "="*60)
    
    return True

if __name__ == "__main__":
    try:
        test_simple_email()
    except KeyboardInterrupt:
        print("\n\n❌ Test cancelled by user")
    except Exception as e:
        print(f"\n\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
