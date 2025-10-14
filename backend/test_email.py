"""
Test Email Service
Quick script to test SMTP configuration and email sending
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/backend/.env')

# Add backend to path
sys.path.insert(0, '/app/backend')

from services.email_service import (
    send_email,
    send_order_confirmation,
    send_welcome_email,
    send_contact_notification
)

async def test_basic_email():
    """Test basic email sending"""
    print("🧪 Testing basic email sending...")
    
    result = send_email(
        to_email="info.auraaluxury@gmail.com",
        subject="Test Email from Auraa Luxury",
        html_content="""
        <h1>Test Email</h1>
        <p>This is a test email from Auraa Luxury email service.</p>
        <p>If you receive this, SMTP configuration is working correctly!</p>
        """,
        to_name="Test Recipient"
    )
    
    if result:
        print("✅ Basic email sent successfully!")
    else:
        print("❌ Failed to send basic email")
    
    return result

async def test_welcome_email():
    """Test welcome email"""
    print("\n🧪 Testing welcome email...")
    
    result = send_welcome_email(
        to_email="info.auraaluxury@gmail.com",
        customer_name="Test Customer"
    )
    
    if result:
        print("✅ Welcome email sent successfully!")
    else:
        print("❌ Failed to send welcome email")
    
    return result

async def test_order_confirmation():
    """Test order confirmation email"""
    print("\n🧪 Testing order confirmation email...")
    
    result = send_order_confirmation(
        to_email="info.auraaluxury@gmail.com",
        customer_name="Test Customer",
        order_number="AUR-20251013-TEST123",
        order_total=299.99,
        currency="SAR",
        items=[
            {
                "product_name": "Gold Bracelet",
                "price": 199.99,
                "quantity": 1
            },
            {
                "product_name": "Silver Necklace",
                "price": 100.00,
                "quantity": 1
            }
        ],
        shipping_address={
            "firstName": "Test",
            "lastName": "Customer",
            "street": "123 Test Street",
            "city": "Riyadh",
            "state": "Riyadh",
            "zipCode": "12345",
            "country": "Saudi Arabia"
        }
    )
    
    if result:
        print("✅ Order confirmation email sent successfully!")
    else:
        print("❌ Failed to send order confirmation email")
    
    return result

async def test_contact_notification():
    """Test contact form notification"""
    print("\n🧪 Testing contact form notification...")
    
    result = send_contact_notification(
        customer_name="Test Customer",
        customer_email="test@example.com",
        message="This is a test message from the contact form.",
        subject_line="Test Contact Form"
    )
    
    if result:
        print("✅ Contact notification sent successfully!")
    else:
        print("❌ Failed to send contact notification")
    
    return result

async def main():
    print("=" * 60)
    print("AURAA LUXURY EMAIL SERVICE TEST")
    print("=" * 60)
    print()
    
    # Test all email types
    tests = [
        ("Basic Email", test_basic_email()),
        ("Welcome Email", test_welcome_email()),
        ("Order Confirmation", test_order_confirmation()),
        ("Contact Notification", test_contact_notification())
    ]
    
    results = {}
    for name, test in tests:
        try:
            result = await test
            results[name] = result
        except Exception as e:
            print(f"❌ Error in {name}: {e}")
            results[name] = False
    
    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} - {name}")
    
    print()
    print(f"Total: {passed}/{total} tests passed ({passed/total*100:.1f}%)")
    print()
    
    if passed == total:
        print("🎉 All tests passed! Email service is working correctly.")
    else:
        print("⚠️  Some tests failed. Check SMTP configuration.")

if __name__ == "__main__":
    asyncio.run(main())
