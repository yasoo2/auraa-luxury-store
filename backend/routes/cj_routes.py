"""
CJ Dropshipping API Routes
Endpoints for managing CJ Dropshipping integration
"""

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from pydantic import BaseModel
import logging

from services.cj_dropshipping import get_cj_service, CJDropshippingService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/cj", tags=["CJ Dropshipping"])


class ProductSearchRequest(BaseModel):
    keyword: str
    page: int = 1
    page_size: int = 20


class ShippingCostRequest(BaseModel):
    product_id: str
    country_code: str = "SA"
    quantity: int = 1


class SyncProductRequest(BaseModel):
    cj_product_id: str
    country_code: str = "SA"


class CreateOrderRequest(BaseModel):
    order_data: dict


class TrackShipmentRequest(BaseModel):
    tracking_number: str


class ReturnRequest(BaseModel):
    order_id: str
    reason: str
    items: List[dict]


@router.get("/test")
async def test_cj_connection(cj: CJDropshippingService = Depends(get_cj_service)):
    """Test CJ API connection"""
    try:
        # Try to search for a simple product
        products = cj.search_products("watch", page=1, page_size=1)
        
        if products:
            return {
                "status": "success",
                "message": "CJ API connection successful",
                "sample_product": products[0] if products else None
            }
        else:
            return {
                "status": "warning",
                "message": "CJ API connected but no products found"
            }
    except Exception as e:
        logger.error(f"CJ API test failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"CJ API test failed: {str(e)}")


@router.post("/products/search")
async def search_products(
    request: ProductSearchRequest,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Search for products on CJ Dropshipping
    
    Args:
        request: Search parameters
        
    Returns:
        List of products with calculated prices
    """
    try:
        products = cj.search_products(
            keyword=request.keyword,
            page=request.page,
            page_size=request.page_size
        )
        
        # Calculate prices for each product
        enriched_products = []
        for product in products:
            product_id = product.get('pid')
            product_price = float(product.get('sellPrice', 0))
            
            # Get shipping cost (default to 20 SAR if API fails)
            shipping_cost = 20.0
            try:
                shipping = cj.get_shipping_cost(product_id, request.country_code)
                if shipping and 'logisticList' in shipping:
                    logistics = shipping['logisticList']
                    if logistics:
                        shipping_cost = min(float(log.get('logisticPrice', 20)) for log in logistics)
            except Exception as e:
                logger.warning(f"Failed to get shipping cost for {product_id}: {str(e)}")
            
            # Calculate final price
            pricing = cj.calculate_final_price(product_price, shipping_cost)
            
            enriched_product = {
                **product,
                "pricing": pricing,
                "display_price": pricing['final_price'],
                "currency": "SAR"
            }
            enriched_products.append(enriched_product)
        
        return {
            "products": enriched_products,
            "total": len(enriched_products),
            "page": request.page,
            "page_size": request.page_size
        }
        
    except Exception as e:
        logger.error(f"Product search failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Product search failed: {str(e)}")


@router.get("/products/{product_id}")
async def get_product_details(
    product_id: str,
    country_code: str = "SA",
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Get detailed product information with pricing
    
    Args:
        product_id: CJ product ID
        country_code: Country code for shipping calculation
        
    Returns:
        Product details with calculated prices
    """
    try:
        product = cj.get_product_details(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Get shipping cost
        shipping_cost = 20.0  # Default
        try:
            shipping = cj.get_shipping_cost(product_id, country_code)
            if shipping and 'logisticList' in shipping:
                logistics = shipping['logisticList']
                if logistics:
                    shipping_cost = min(float(log.get('logisticPrice', 20)) for log in logistics)
        except Exception as e:
            logger.warning(f"Failed to get shipping cost: {str(e)}")
        
        # Calculate pricing
        product_price = float(product.get('sellPrice', 0))
        pricing = cj.calculate_final_price(product_price, shipping_cost)
        
        # Get variants
        variants = cj.get_product_variants(product_id)
        
        return {
            "product": product,
            "pricing": pricing,
            "variants": variants,
            "display_price": pricing['final_price'],
            "currency": "SAR"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get product details: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get product details: {str(e)}")


@router.post("/products/sync")
async def sync_product(
    request: SyncProductRequest,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Sync product from CJ to store
    
    Args:
        request: Product sync parameters
        
    Returns:
        Synced product data ready for store
    """
    try:
        product_data = cj.sync_product_to_store(
            request.cj_product_id,
            request.country_code
        )
        
        if not product_data:
            raise HTTPException(status_code=404, detail="Failed to sync product")
        
        return {
            "status": "success",
            "product": product_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Product sync failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Product sync failed: {str(e)}")


@router.post("/shipping/calculate")
async def calculate_shipping(
    request: ShippingCostRequest,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Calculate shipping cost for a product
    
    Args:
        request: Shipping calculation parameters
        
    Returns:
        Shipping cost details
    """
    try:
        shipping = cj.get_shipping_cost(
            request.product_id,
            request.country_code,
            request.quantity
        )
        
        if not shipping:
            raise HTTPException(status_code=404, detail="Failed to calculate shipping")
        
        return shipping
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Shipping calculation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Shipping calculation failed: {str(e)}")


@router.post("/orders/create")
async def create_order(
    request: CreateOrderRequest,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Create order in CJ Dropshipping
    
    Args:
        request: Order data
        
    Returns:
        Created order details
    """
    try:
        order = cj.create_order(request.order_data)
        
        if not order:
            raise HTTPException(status_code=400, detail="Failed to create order")
        
        return {
            "status": "success",
            "order": order
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Order creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Order creation failed: {str(e)}")


@router.get("/orders/{order_id}")
async def get_order_status(
    order_id: str,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Get order status from CJ
    
    Args:
        order_id: CJ order ID
        
    Returns:
        Order status details
    """
    try:
        order = cj.get_order_status(order_id)
        
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")
        
        return order
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get order status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get order status: {str(e)}")


@router.post("/tracking/query")
async def track_shipment(
    request: TrackShipmentRequest,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Track shipment using tracking number
    
    Args:
        request: Tracking request
        
    Returns:
        Tracking details
    """
    try:
        tracking = cj.track_shipment(request.tracking_number)
        
        if not tracking:
            raise HTTPException(status_code=404, detail="Tracking information not found")
        
        return tracking
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tracking query failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Tracking query failed: {str(e)}")


@router.post("/returns/create")
async def create_return(
    request: ReturnRequest,
    cj: CJDropshippingService = Depends(get_cj_service)
):
    """
    Create return request in CJ
    
    Args:
        request: Return request data
        
    Returns:
        Return request details
    """
    try:
        return_request = cj.create_return_request(
            request.order_id,
            request.reason,
            request.items
        )
        
        if not return_request:
            raise HTTPException(status_code=400, detail="Failed to create return request")
        
        return {
            "status": "success",
            "return_request": return_request
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Return request creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Return request creation failed: {str(e)}")

