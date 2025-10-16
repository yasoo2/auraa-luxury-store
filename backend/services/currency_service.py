import asyncio
import aiohttp
from datetime import datetime, timedelta
from typing import Dict, Optional, List
from pydantic import BaseModel
import logging
import os
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)

class ExchangeRate(BaseModel):
    """Exchange rate model"""
    base_currency: str
    target_currency: str
    rate: float
    updated_at: datetime
    source: str = "exchangerate-api"

class CurrencyService:
    """Real-time currency conversion service with automatic updates"""
    
    def __init__(self, database: AsyncIOMotorDatabase):
        self.db = database
        self.api_key = os.environ.get("EXCHANGE_RATE_API_KEY", "free")  # Can use free tier for testing
        self.base_url = f"https://v6.exchangerate-api.com/v6/{self.api_key}"
        self.supported_currencies = ["USD", "SAR", "AED", "QAR", "KWD", "BHD", "OMR"]
        self.cache_duration = timedelta(hours=1)  # Update rates every hour
        
    async def get_latest_rates(self, base_currency: str = "USD") -> Dict[str, float]:
        """
        Fetch latest exchange rates from API
        
        Args:
            base_currency: Base currency for conversions (default: USD)
            
        Returns:
            Dictionary of currency codes to exchange rates
        """
        # Use fallback static rates if API key is not set
        if self.api_key == "free":
            logger.info("Using static fallback exchange rates (no API key configured)")
            return await self._get_fallback_rates(base_currency)
        
        url = f"{self.base_url}/latest/{base_currency}"
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as response:
                    if response.status == 200:
                        data = await response.json()
                        
                        if data.get("result") == "success":
                            rates = data.get("conversion_rates", {})
                            logger.info(f"Successfully fetched {len(rates)} exchange rates for {base_currency}")
                            return rates
                        else:
                            logger.error(f"API returned error: {data.get('error-type')}")
                            return {}
                    else:
                        logger.error(f"HTTP error {response.status} when fetching rates")
                        return {}
                        
        except Exception as e:
            logger.error(f"Error fetching exchange rates: {str(e)}")
            return {}
    
    async def update_exchange_rates(self) -> bool:
        """
        Update exchange rates in database
        
        Returns:
            True if update was successful, False otherwise
        """
        try:
            rates_data = await self.get_latest_rates("USD")
            
            if not rates_data:
                logger.warning("No exchange rate data received")
                return False
            
            # Store rates in database
            updated_count = 0
            for currency_code, rate in rates_data.items():
                if currency_code in self.supported_currencies:
                    exchange_rate = ExchangeRate(
                        base_currency="USD",
                        target_currency=currency_code,
                        rate=rate,
                        updated_at=datetime.utcnow()
                    )
                    
                    # Upsert the rate
                    await self.db.exchange_rates.update_one(
                        {"base_currency": "USD", "target_currency": currency_code},
                        {"$set": exchange_rate.dict()},
                        upsert=True
                    )
                    updated_count += 1
            
            logger.info(f"Updated {updated_count} exchange rates in database")
            return True
            
        except Exception as e:
            logger.error(f"Error updating exchange rates: {str(e)}")
            return False
    
    async def get_cached_rate(self, from_currency: str, to_currency: str) -> Optional[float]:
        """
        Get exchange rate from database cache
        
        Args:
            from_currency: Source currency code
            to_currency: Target currency code
            
        Returns:
            Exchange rate if found and not expired, None otherwise
        """
        if from_currency == to_currency:
            return 1.0
        
        try:
            # Direct rate lookup
            rate_doc = await self.db.exchange_rates.find_one({
                "base_currency": from_currency,
                "target_currency": to_currency,
                "updated_at": {"$gte": datetime.utcnow() - self.cache_duration}
            })
            
            if rate_doc:
                return rate_doc["rate"]
            
            # Reverse rate lookup (if we have USD->SAR, calculate SAR->USD)
            reverse_rate_doc = await self.db.exchange_rates.find_one({
                "base_currency": to_currency,
                "target_currency": from_currency,
                "updated_at": {"$gte": datetime.utcnow() - self.cache_duration}
            })
            
            if reverse_rate_doc and reverse_rate_doc["rate"] != 0:
                return 1.0 / reverse_rate_doc["rate"]
            
            # Cross-currency calculation via USD
            if from_currency != "USD" and to_currency != "USD":
                usd_to_target = await self.get_cached_rate("USD", to_currency)
                usd_to_source = await self.get_cached_rate("USD", from_currency)
                
                if usd_to_target and usd_to_source and usd_to_source != 0:
                    return usd_to_target / usd_to_source
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching cached rate: {str(e)}")
            return None
    
    async def convert_currency(
        self, 
        amount: float, 
        from_currency: str, 
        to_currency: str
    ) -> Optional[float]:
        """
        Convert amount between currencies
        
        Args:
            amount: Amount to convert
            from_currency: Source currency code
            to_currency: Target currency code
            
        Returns:
            Converted amount or None if conversion fails
        """
        if from_currency == to_currency:
            return amount
        
        # Try to get cached rate first
        rate = await self.get_cached_rate(from_currency, to_currency)
        
        if rate is None:
            # Update rates and try again
            await self.update_exchange_rates()
            rate = await self.get_cached_rate(from_currency, to_currency)
        
        if rate is not None:
            converted = amount * rate
            return round(converted, 2)
        
        logger.warning(f"Could not convert {amount} from {from_currency} to {to_currency}")
        return None
    
    async def get_multi_currency_prices(
        self, 
        base_amount: float, 
        base_currency: str = "USD"
    ) -> Dict[str, float]:
        """
        Get prices in multiple currencies
        
        Args:
            base_amount: Amount in base currency
            base_currency: Base currency code
            
        Returns:
            Dictionary of currency codes to converted amounts
        """
        prices = {}
        
        for currency in self.supported_currencies:
            converted = await self.convert_currency(base_amount, base_currency, currency)
            if converted is not None:
                prices[currency] = converted
        
        return prices
    
    async def apply_luxury_markup(
        self, 
        base_prices: Dict[str, float], 
        markup_percentage: float = 50.0
    ) -> Dict[str, float]:
        """
        Apply luxury markup to prices
        
        Args:
            base_prices: Dictionary of currency codes to base prices
            markup_percentage: Markup percentage to apply
            
        Returns:
            Dictionary of currency codes to marked-up prices
        """
        marked_up_prices = {}
        multiplier = 1 + (markup_percentage / 100)
        
        for currency, price in base_prices.items():
            marked_up_prices[currency] = round(price * multiplier, 2)
        
        return marked_up_prices
    
    async def format_currency(self, amount: float, currency_code: str, language: str = "en") -> str:
        """
        Format currency amount for display
        
        Args:
            amount: Amount to format
            currency_code: Currency code
            language: Display language (en/ar)
            
        Returns:
            Formatted currency string
        """
        currency_symbols = {
            "USD": {"en": "$", "ar": "$"},
            "SAR": {"en": "SAR", "ar": "ر.س"},
            "AED": {"en": "AED", "ar": "د.إ"},
            "QAR": {"en": "QAR", "ar": "ر.ق"},
            "KWD": {"en": "KWD", "ar": "د.ك"},
            "BHD": {"en": "BHD", "ar": "د.ب"},
            "OMR": {"en": "OMR", "ar": "ر.ع"}
        }
        
        symbol = currency_symbols.get(currency_code, {}).get(language, currency_code)
        
        # Format number with thousand separators
        formatted_amount = f"{amount:,.2f}"
        
        if language == "ar":
            # Arabic formatting (symbol after number)
            return f"{formatted_amount} {symbol}"
        else:
            # English formatting
            if currency_code == "USD":
                return f"{symbol}{formatted_amount}"
            else:
                return f"{formatted_amount} {symbol}"

# Global service instance
currency_service = None

def get_currency_service(database: AsyncIOMotorDatabase) -> CurrencyService:
    """Get currency service instance"""
    global currency_service
    if currency_service is None:
        currency_service = CurrencyService(database)
    return currency_service