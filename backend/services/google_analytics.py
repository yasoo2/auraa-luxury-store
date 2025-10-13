"""
Google Analytics 4 Measurement Protocol Integration
Sends server-side events to GA4 for reliable purchase tracking
"""

import httpx
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

# GA4 Configuration
GA4_MEASUREMENT_ID = "G-C44D1325QM"
GA4_API_SECRET = "81t-7zRf7quf8Ul2Qds0g"
GA4_ENDPOINT = "https://www.google-analytics.com/mp/collect"


async def send_ga4_event(
    client_id: str,
    event_name: str,
    event_params: Dict[str, Any]
) -> bool:
    """
    Send event to Google Analytics 4 via Measurement Protocol
    
    Args:
        client_id: User identifier (user_id, session_id, or generated UUID)
        event_name: Event name (e.g., 'purchase', 'refund')
        event_params: Event parameters (transaction_id, value, items, etc.)
    
    Returns:
        bool: True if successful, False otherwise
    """
    try:
        url = f"{GA4_ENDPOINT}?measurement_id={GA4_MEASUREMENT_ID}&api_secret={GA4_API_SECRET}"
        
        payload = {
            "client_id": client_id,
            "events": [{
                "name": event_name,
                "params": event_params
            }]
        }
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(url, json=payload)
            
            if response.status_code == 204:
                logger.info(f"GA4 event '{event_name}' sent successfully for client {client_id}")
                return True
            else:
                logger.error(f"GA4 API error: {response.status_code} - {response.text}")
                return False
                
    except Exception as e:
        logger.error(f"Failed to send GA4 event '{event_name}': {e}")
        return False


async def track_purchase(
    user_id: str,
    order_id: str,
    currency: str,
    value: float,
    items: List[Dict[str, Any]],
    shipping: float = 0.0,
    tax: float = 0.0,
    country: Optional[str] = None
) -> bool:
    """
    Track purchase event in GA4
    
    Args:
        user_id: User ID
        order_id: Order/Transaction ID
        currency: Currency code (e.g., 'SAR', 'USD')
        value: Total transaction value
        items: List of items with item_id, item_name, price, quantity
        shipping: Shipping cost
        tax: Tax amount
        country: Country code
    
    Returns:
        bool: True if successful
    """
    event_params = {
        "transaction_id": order_id,
        "currency": currency,
        "value": value,
        "shipping": shipping,
        "tax": tax,
        "items": items
    }
    
    if country:
        event_params["country"] = country
    
    return await send_ga4_event(
        client_id=user_id,
        event_name="purchase",
        event_params=event_params
    )


async def track_refund(
    user_id: str,
    order_id: str,
    currency: str,
    value: float,
    items: Optional[List[Dict[str, Any]]] = None
) -> bool:
    """
    Track refund event in GA4
    
    Args:
        user_id: User ID
        order_id: Order/Transaction ID
        currency: Currency code
        value: Refund amount
        items: Optional list of refunded items
    
    Returns:
        bool: True if successful
    """
    event_params = {
        "transaction_id": order_id,
        "currency": currency,
        "value": value
    }
    
    if items:
        event_params["items"] = items
    
    return await send_ga4_event(
        client_id=user_id,
        event_name="refund",
        event_params=event_params
    )


async def track_custom_event(
    user_id: str,
    event_name: str,
    params: Dict[str, Any]
) -> bool:
    """
    Track custom event in GA4
    
    Args:
        user_id: User ID
        event_name: Custom event name
        params: Event parameters
    
    Returns:
        bool: True if successful
    """
    return await send_ga4_event(
        client_id=user_id,
        event_name=event_name,
        event_params=params
    )
