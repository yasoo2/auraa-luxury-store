"""
GeoIP Service
Detects user country from IP address and provides country-specific configurations.
"""

import httpx
from typing import Dict, Optional
from fastapi import Request


def _is_country_code(value) -> bool:
    """A plausible ISO 3166-1 alpha-2 code."""
    return bool(value) and len(str(value)) == 2 and str(value).isalpha()


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
        # The shop sells worldwide. Any ISO country code is accepted; the six
        # with their own configuration are not the six it will ship to. This
        # used to require membership of `gcc_countries`, so a customer saying
        # "France" was overruled and served as Saudi Arabia — wrong currency,
        # wrong tax, and a shipping estimate for the wrong continent.
        country = request.query_params.get('country')
        if _is_country_code(country):
            return country.upper()

        country = request.headers.get('X-User-Country')
        if _is_country_code(country):
            return country.upper()

        # Accept-Language names a language, not a residence: `ar-SA` on a phone
        # bought in Riyadh says nothing about where its owner is standing. Used
        # only as a last hint, and only for the region it actually carries.
        accept_lang = request.headers.get('Accept-Language', '')
        for tag in accept_lang.split(','):
            parts = tag.strip().replace('_', '-').split('-')
            if len(parts) >= 2 and _is_country_code(parts[1]):
                return parts[1].upper()

        return self.default_country
    
    def get_country_config(self, country_code: str) -> Dict:
        """
        Get complete country configuration.
        
        Args:
            country_code: ISO country code
            
        Returns:
            Country configuration dict
        """
        code = (country_code or '').upper()
        if code in self.gcc_countries:
            return self.gcc_countries[code]

        # Anywhere else. This used to return the *Saudi* configuration, so a
        # customer in Germany was quoted in riyals and charged 15% Saudi VAT —
        # a tax their country never levied and this shop cannot remit on their
        # behalf. A Saudi seller's exports are zero-rated; what the buyer may
        # owe is import duty at their own border, which is theirs to pay and
        # ours to say out loud rather than quietly add to the bill.
        return {
            'name_en': code or 'International',
            'name_ar': 'دولية',
            'currency': 'USD',
            'vat_rate': 0.0,
            'currency_symbol': '$',
            'language_default': 'en',
            'import_duty_may_apply': True,
        }
    
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
