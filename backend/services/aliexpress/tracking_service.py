"""
AliExpress Order Tracking Service
Comprehensive tracking system for orders and shipments
"""

import asyncio
import os
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

from .auth import AliExpressAuthenticator


class OrderTrackingService:
    """
    Comprehensive order tracking service for AliExpress orders
    Handles order status, tracking numbers, delivery updates
    """
    
    def __init__(
        self,
        authenticator: AliExpressAuthenticator,
        db: AsyncIOMotorDatabase,
        api_base_url: str = "http://gw.api.taobao.com/router/rest"
    ):
        self.auth = authenticator
        self.db = db
        self.api_url = api_base_url
        
    async def make_api_request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Make authenticated API request"""
        return await self.auth.make_signed_request(self.api_url, method, params)
    
    async def create_dropship_order(
        self,
        order_data: Dict[str, Any],
        auraa_order_id: str
    ) -> Dict[str, Any]:
        """
        Create dropshipping order on AliExpress
        
        Args:
            order_data: Order details
            auraa_order_id: Our internal order ID
            
        Returns:
            AliExpress order response
        """
        try:
            # Prepare order request
            order_request = {
                'logistics_address': {
                    'country': order_data['shipping_address']['country'],
                    'province': order_data['shipping_address']['state'],
                    'city': order_data['shipping_address']['city'],
                    'address': order_data['shipping_address']['address1'],
                    'address2': order_data['shipping_address'].get('address2', ''),
                    'zip': order_data['shipping_address']['postal_code'],
                    'contact_person': order_data['customer_name'],
                    'mobile_no': order_data['customer_phone'],
                    'phone_number': order_data['customer_phone']
                },
                'product_items': [
                    {
                        'product_id': item['aliexpress_product_id'],
                        'quantity': item['quantity'],
                        'sku_attr': item.get('variant', ''),
                        'order_memo': f"Order from Auraa Luxury - {auraa_order_id}"
                    }
                    for item in order_data['items']
                ]
            }
            
            params = {
                'param_place_order_request': order_request
            }
            
            response = await self.make_api_request(
                'aliexpress.trade.buy.placeorder',
                params
            )
            
            # Parse response
            result = response.get('aliexpress_trade_buy_placeorder_response', {})
            order_result = result.get('result', {})
            
            if order_result.get('is_success'):
                # Store AliExpress order mapping
                mapping = {
                    'auraa_order_id': auraa_order_id,
                    'aliexpress_order_id': order_result.get('order_id'),
                    'aliexpress_order_list': order_result.get('order_list', []),
                    'created_at': datetime.utcnow(),
                    'status': 'placed',
                    'total_amount': order_data['total_amount']
                }
                
                await self.db.aliexpress_orders.insert_one(mapping)
                
                return {
                    'success': True,
                    'aliexpress_order_id': order_result.get('order_id'),
                    'order_list': order_result.get('order_list', []),
                    'message': 'Order placed successfully on AliExpress'
                }
            else:
                return {
                    'success': False,
                    'error': order_result.get('error_msg', 'Unknown error'),
                    'error_code': order_result.get('error_code')
                }
                
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_order_status(self, aliexpress_order_id: str) -> Dict[str, Any]:
        """
        Get order status from AliExpress
        
        Args:
            aliexpress_order_id: AliExpress order ID
            
        Returns:
            Order status information
        """
        try:
            params = {
                'order_id': aliexpress_order_id
            }
            
            response = await self.make_api_request(
                'aliexpress.trade.buyer.order.query',
                params
            )
            
            result = response.get('aliexpress_trade_buyer_order_query_response', {})
            order_info = result.get('resp_result', {}).get('result', {})
            
            return {
                'success': True,
                'order_status': order_info.get('order_status'),
                'logistics_status': order_info.get('logistics_status'),
                'order_detail_url': order_info.get('order_detail_url'),
                'tracking_info': order_info.get('logistics_info_list', [])
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_logistics_tracking(self, tracking_number: str) -> Dict[str, Any]:
        """
        Get detailed logistics tracking information
        
        Args:
            tracking_number: Tracking number
            
        Returns:
            Tracking details
        """
        try:
            params = {
                'out_ref': tracking_number,
                'to_area': 'SA'  # Default to Saudi Arabia
            }
            
            response = await self.make_api_request(
                'aliexpress.logistics.redefining.getlogisticsselleraddresses',
                params
            )
            
            result = response.get('aliexpress_logistics_redefining_getlogisticsselleraddresses_response', {})
            tracking_info = result.get('result', {})
            
            return {
                'success': True,
                'tracking_number': tracking_number,
                'events': tracking_info.get('details', []),
                'current_status': tracking_info.get('official_status'),
                'last_update': tracking_info.get('status_update_time')
            }
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    async def sync_all_order_statuses(self) -> Dict[str, Any]:
        """
        Sync status for all active orders
        
        Returns:
            Sync statistics
        """
        start_time = datetime.utcnow()
        stats = {
            'start_time': start_time.isoformat(),
            'orders_checked': 0,
            'orders_updated': 0,
            'notifications_sent': 0,
            'errors': []
        }
        
        try:
            # Get orders that need status updates
            cursor = self.db.orders.find({
                'status': {
                    '$in': ['processing', 'shipped', 'in_transit']
                },
                'aliexpress_order_id': {'$exists': True, '$ne': None}
            })
            
            orders = await cursor.to_list(length=None)
            stats['orders_checked'] = len(orders)
            
            for order in orders:
                try:
                    # Get latest status
                    status_response = await self.get_order_status(order['aliexpress_order_id'])
                    
                    if status_response['success']:
                        old_status = order.get('status')
                        new_status = self._map_aliexpress_status(status_response['order_status'])
                        
                        # Update if status changed
                        if new_status != old_status:
                            await self.db.orders.update_one(
                                {'_id': order['_id']},
                                {
                                    '$set': {
                                        'status': new_status,
                                        'updated_at': datetime.utcnow(),
                                        'aliexpress_status': status_response['order_status'],
                                        'logistics_status': status_response.get('logistics_status')
                                    }
                                }
                            )
                            
                            stats['orders_updated'] += 1
                            
                            # Send notification if significant status change
                            if self._should_notify_status_change(old_status, new_status):
                                await self._send_status_notification(order, new_status)
                                stats['notifications_sent'] += 1
                    
                except Exception as e:
                    stats['errors'].append({
                        'order_id': str(order['_id']),
                        'error': str(e)
                    })
                
                # Rate limiting
                await asyncio.sleep(1)
        
        except Exception as e:
            stats['errors'].append({'general': str(e)})
        
        end_time = datetime.utcnow()
        stats['end_time'] = end_time.isoformat()
        stats['duration_seconds'] = (end_time - start_time).total_seconds()
        
        # Store sync log
        await self.db.sync_logs.insert_one({
            'type': 'order_status_sync',
            **stats
        })
        
        return stats
    
    def _map_aliexpress_status(self, ae_status: str) -> str:
        """
        Map AliExpress order status to our internal status
        
        Args:
            ae_status: AliExpress status
            
        Returns:
            Internal status
        """
        status_mapping = {
            'PLACE_ORDER_SUCCESS': 'processing',
            'IN_CANCEL': 'cancelled',
            'WAIT_SELLER_SEND_GOODS': 'processing',
            'SELLER_PART_SEND_GOODS': 'shipped',
            'WAIT_BUYER_ACCEPT_GOODS': 'in_transit',
            'FUND_PROCESSING': 'delivered',
            'FINISH': 'completed',
            'IN_ISSUE': 'disputed',
            'IN_FROZEN': 'frozen',
            'WAIT_SELLER_EXAMINE_MONEY': 'processing'
        }
        
        return status_mapping.get(ae_status, 'processing')
    
    def _should_notify_status_change(self, old_status: str, new_status: str) -> bool:
        """
        Determine if status change warrants customer notification
        
        Args:
            old_status: Previous status
            new_status: New status
            
        Returns:
            True if notification should be sent
        """
        notification_worthy_changes = [
            ('processing', 'shipped'),
            ('shipped', 'in_transit'),
            ('in_transit', 'delivered'),
            ('processing', 'cancelled'),
            ('shipped', 'cancelled')
        ]
        
        return (old_status, new_status) in notification_worthy_changes
    
    async def _send_status_notification(self, order: Dict[str, Any], new_status: str):
        """
        Send status update notification to customer
        
        Args:
            order: Order data
            new_status: New order status
        """
        # This would integrate with the notification service
        notification_data = {
            'order_id': str(order['_id']),
            'order_number': order.get('order_number'),
            'customer_email': order.get('customer_email'),
            'customer_phone': order.get('customer_phone'),
            'new_status': new_status,
            'status_message': self._get_status_message(new_status, order.get('language', 'ar'))
        }
        
        # Store notification for processing by notification service
        await self.db.pending_notifications.insert_one({
            'type': 'order_status_update',
            'data': notification_data,
            'created_at': datetime.utcnow(),
            'processed': False
        })
    
    def _get_status_message(self, status: str, language: str = 'ar') -> str:
        """
        Get localized status message
        
        Args:
            status: Order status
            language: Language code
            
        Returns:
            Localized message
        """
        messages = {
            'ar': {
                'processing': 'جاري تجهيز طلبك',
                'shipped': 'تم شحن طلبك',
                'in_transit': 'طلبك في الطريق إليك',
                'delivered': 'تم تسليم طلبك',
                'cancelled': 'تم إلغاء طلبك',
                'completed': 'تم إنجاز طلبك بنجاح'
            },
            'en': {
                'processing': 'Your order is being processed',
                'shipped': 'Your order has been shipped',
                'in_transit': 'Your order is on its way',
                'delivered': 'Your order has been delivered',
                'cancelled': 'Your order has been cancelled',
                'completed': 'Your order is complete'
            }
        }
        
        return messages.get(language, messages['ar']).get(status, 'Order status updated')
    
    async def get_delivery_estimate(
        self,
        country_code: str,
        product_ids: List[str]
    ) -> Dict[str, Any]:
        """
        Get delivery time estimates for products
        
        Args:
            country_code: Destination country
            product_ids: List of product IDs
            
        Returns:
            Delivery estimates
        """
        estimates = {}
        
        for product_id in product_ids:
            try:
                params = {
                    'product_id': product_id,
                    'country_code': country_code,
                    'product_num': 1
                }
                
                response = await self.make_api_request(
                    'aliexpress.ds.shipping.info',
                    params
                )
                
                result = response.get('aliexpress_ds_shipping_info_response', {}).get('result', {})
                freight_list = result.get('aeop_freight_calculate_result_list', [])
                
                if freight_list:
                    # Get fastest and cheapest options
                    fastest = min(freight_list, key=lambda x: int(x.get('delivery_date_max', 999)))
                    cheapest = min(freight_list, key=lambda x: float(x.get('freight', 999)))
                    
                    estimates[product_id] = {
                        'fastest': {
                            'method': fastest.get('service_name'),
                            'min_days': int(fastest.get('delivery_date_min', 0)),
                            'max_days': int(fastest.get('delivery_date_max', 0)),
                            'cost': float(fastest.get('freight', 0))
                        },
                        'cheapest': {
                            'method': cheapest.get('service_name'),
                            'min_days': int(cheapest.get('delivery_date_min', 0)),
                            'max_days': int(cheapest.get('delivery_date_max', 0)),
                            'cost': float(cheapest.get('freight', 0))
                        }
                    }
                else:
                    estimates[product_id] = {
                        'error': 'No shipping options available'
                    }
                    
            except Exception as e:
                estimates[product_id] = {
                    'error': str(e)
                }
        
        return estimates