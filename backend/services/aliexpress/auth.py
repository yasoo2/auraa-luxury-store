"""
AliExpress API Authentication Service
Handles request signing and authentication for AliExpress API calls.
"""

import hashlib
import hmac
from collections import OrderedDict
from datetime import datetime
from typing import Dict, Any


class AliExpressAuthenticator:
    """
    Handles authentication and request signing for AliExpress API.
    Implements MD5 and HMAC-SHA256 signature methods.
    """
    
    def __init__(self, app_key: str, app_secret: str):
        """
        Initialize authenticator with AliExpress credentials.
        
        Args:
            app_key: AliExpress App Key
            app_secret: AliExpress App Secret
        """
        self.app_key = app_key
        self.app_secret = app_secret
    
    def generate_timestamp(self) -> str:
        """
        Generate timestamp in AliExpress required format.
        
        Returns:
            Timestamp string in 'YYYY-MM-DD HH:MM:SS' format
        """
        return datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')
    
    def sign_request_md5(self, parameters: Dict[str, Any]) -> str:
        """
        Generate MD5 signature for API request.
        
        Args:
            parameters: Dictionary of request parameters
            
        Returns:
            Uppercase hexadecimal MD5 signature string
        """
        # Sort parameters alphabetically by key
        sorted_params = OrderedDict(sorted(parameters.items()))
        
        # Concatenate all parameter key-value pairs
        param_string = ''.join(f"{key}{value}" for key, value in sorted_params.items())
        
        # Create signature string with secret sandwich pattern
        sign_string = f"{self.app_secret}{param_string}{self.app_secret}"
        
        # Compute MD5 hash and return uppercase hex
        return hashlib.md5(sign_string.encode('utf-8')).hexdigest().upper()
    
    def sign_request_hmac_sha256(self, parameters: Dict[str, Any]) -> str:
        """
        Generate HMAC-SHA256 signature for API request.
        
        Args:
            parameters: Dictionary of request parameters
            
        Returns:
            Uppercase hexadecimal HMAC-SHA256 signature string
        """
        sorted_params = OrderedDict(sorted(parameters.items()))
        param_string = ''.join(f"{key}{value}" for key, value in sorted_params.items())
        sign_string = f"{self.app_secret}{param_string}{self.app_secret}"
        
        signature = hmac.new(
            self.app_secret.encode('utf-8'),
            sign_string.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
        
        return signature.upper()
    
    def prepare_request_params(
        self, 
        method: str, 
        params: Dict[str, Any],
        sign_method: str = 'md5'
    ) -> Dict[str, Any]:
        """
        Prepare complete request parameters including signature.
        
        Args:
            method: API method name (e.g., 'aliexpress.affiliate.productdetail.get')
            params: Method-specific parameters
            sign_method: Signature method ('md5' or 'hmac')
            
        Returns:
            Complete parameter dictionary with signature
        """
        # Build base parameters
        request_params = {
            'method': method,
            'app_key': self.app_key,
            'sign_method': sign_method,
            'timestamp': self.generate_timestamp(),
            'format': 'json',
            'v': '2.0',
            **params
        }
        
        # Generate and add signature
        if sign_method == 'md5':
            signature = self.sign_request_md5(request_params)
        else:
            signature = self.sign_request_hmac_sha256(request_params)
        
        request_params['sign'] = signature
        
        return request_params
