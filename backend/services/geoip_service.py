"""
GeoIP Service
Detects user country from IP address and provides country-specific configurations.
"""

import httpx
from typing import Dict, Optional
from fastapi import Request


class GeoIPService:
    """
    Service for detecting user location and providing country-specific data.
    """
    
    def __init__(self):
        # GCC countries configuration
        self.gcc_countries = {
            'SA': {
                'name_en': 'Saudi Arabia',
                'name_ar': 'السعودية',
                'currency': 'SAR',
                'vat_rate': 0.15,
                'currency_symbol': 'ر.س',
                'language_default': 'ar'
            },
            'AE': {
                'name_en': 'United Arab Emirates',
                'name_ar': 'الإمارات',
                'currency': 'AED',
                'vat_rate': 0.05,
                'currency_symbol': 'د.إ',
                'language_default': 'ar'
            },
            'KW': {
                'name_en': 'Kuwait',
                'name_ar': 'الكويت',
                'currency': 'KWD',
                'vat_rate': 0.00,
                'currency_symbol': 'د.ك',
                'language_default': 'ar'
            },
            'QA': {
                'name_en': 'Qatar',
                'name_ar': 'قطر',
                'currency': 'QAR',
                'vat_rate': 0.00,
                'currency_symbol': 'ر.ق',
                'language_default': 'ar'
            },
            'BH': {
                'name_en': 'Bahrain',
                'name_ar': 'البحرين',
                'currency': 'BHD',
                'vat_rate': 0.10,
                'currency_symbol': 'د.ب',
                'language_default': 'ar'
            },
            'OM': {
                'name_en': 'Oman',
                'name_ar': 'عمان',
                'currency': 'OMR',
                'vat_rate': 0.05,
                'currency_symbol': 'ر.ع',
                'language_default': 'ar'
            }
        }
        
        # Default country (Saudi Arabia)
        self.default_country = 'SA'
    
    async def detect_country_from_ip(self, ip_address: str) -> str:
        """
        Detect country code from IP address using ip-api.com (free).
        
        Args:
            ip_address: User IP address
            
        Returns:
            ISO country code (e.g., 'SA', 'AE')
        """
        # Skip localhost and private IPs
        if ip_address in ['127.0.0.1', 'localhost', '::1'] or ip_address.startswith('192.168.') or ip_address.startswith('10.'):
            return self.default_country
        
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f'http://ip-api.com/json/{ip_address}',
                    params={'fields': 'status,country,countryCode'}
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('status') == 'success':
                        country_code = data.get('countryCode', self.default_country)
                        
                        # Return if GCC country, otherwise default
                        return country_code if country_code in self.gcc_countries else self.default_country
        
        except Exception as e:
            print(f"GeoIP detection failed: {e}")
        
        return self.default_country
    
    def get_country_from_request(self, request: Request) -> str:
        """
        Extract country from request headers or query params.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Country code
        """
        # Priority 1: Query parameter (user override)
        country = request.query_params.get('country')
        if country and country.upper() in self.gcc_countries:
            return country.upper()
        
        # Priority 2: Custom header (from frontend)
        country = request.headers.get('X-User-Country')
        if country and country.upper() in self.gcc_countries:
            return country.upper()
        
        # Priority 3: Accept-Language header
        accept_lang = request.headers.get('Accept-Language', '')
        if 'ar-SA' in accept_lang or 'ar_SA' in accept_lang:
            return 'SA'
        elif 'ar-AE' in accept_lang:
            return 'AE'
        
        return self.default_country
    
    def get_country_config(self, country_code: str) -> Dict:
        """
        Get complete country configuration.
        
        Args:
            country_code: ISO country code
            
        Returns:
            Country configuration dict
        """
        return self.gcc_countries.get(
            country_code.upper(),
            self.gcc_countries[self.default_country]
        )
    
    def get_vat_rate(self, country_code: str) -> float:
        """Get VAT rate for country."""
        return self.get_country_config(country_code).get('vat_rate', 0.0)
    
    def get_currency(self, country_code: str) -> str:
        """Get currency code for country."""
        return self.get_country_config(country_code).get('currency', 'SAR')
    
    def is_gcc_country(self, country_code: str) -> bool:
        """Check if country is in GCC."""
        return country_code.upper() in self.gcc_countries
    
    def get_all_gcc_countries(self) -> list:
        """Get list of all supported GCC countries."""
        return list(self.gcc_countries.keys())
