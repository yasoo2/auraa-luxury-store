"""
Category Mapping Service
Maps AliExpress categories to Auraa Luxury store categories.
"""

from typing import Dict, List, Optional
from enum import Enum


class AuraaCategory(str, Enum):
    """Auraa Luxury store categories."""
    EARRINGS = "earrings"
    NECKLACES = "necklaces"
    BRACELETS = "bracelets"
    RINGS = "rings"
    WATCHES = "watches"
    SETS = "sets"


class CategoryMapper:
    """
    Maps AliExpress categories and keywords to Auraa store categories.
    Supports bilingual (AR/EN) category names.
    """
    
    def __init__(self):
        # AliExpress category IDs mapping (approximate)
        self.aliexpress_category_map = {
            # Earrings
            '200000297': AuraaCategory.EARRINGS,
            '200000345': AuraaCategory.EARRINGS,
            
            # Necklaces
            '200000303': AuraaCategory.NECKLACES,
            '200000344': AuraaCategory.NECKLACES,
            
            # Bracelets
            '200000343': AuraaCategory.BRACELETS,
            '200000298': AuraaCategory.BRACELETS,
            
            # Rings
            '200000346': AuraaCategory.RINGS,
            '200000299': AuraaCategory.RINGS,
            
            # Watches
            '200000298': AuraaCategory.WATCHES,
            '502': AuraaCategory.WATCHES,
            
            # Sets
            '200000302': AuraaCategory.SETS,
        }
        
        # Keyword-based mapping for product titles
        self.keyword_map = {
            AuraaCategory.EARRINGS: [
                'earring', 'earrings', 'stud', 'hoop', 'drop earring',
                'أقراط', 'حلق', 'أذن'
            ],
            AuraaCategory.NECKLACES: [
                'necklace', 'pendant', 'chain', 'choker', 'collar',
                'قلادة', 'عقد', 'سلسلة'
            ],
            AuraaCategory.BRACELETS: [
                'bracelet', 'bangle', 'cuff', 'wristband', 'anklet',
                'أسورة', 'سوار', 'معصم'
            ],
            AuraaCategory.RINGS: [
                'ring', 'band', 'wedding ring', 'engagement ring',
                'خاتم', 'خواتم', 'دبلة'
            ],
            AuraaCategory.WATCHES: [
                'watch', 'timepiece', 'wristwatch', 'smartwatch',
                'ساعة', 'ساعات', 'معصم'
            ],
            AuraaCategory.SETS: [
                'set', 'jewelry set', 'bridal set', 'matching',
                'طقم', 'مجموعة', 'سيت'
            ]
        }
        
        # Category names in both languages
        self.category_names = {
            AuraaCategory.EARRINGS: {
                'en': 'Earrings',
                'ar': 'أقراط'
            },
            AuraaCategory.NECKLACES: {
                'en': 'Necklaces',
                'ar': 'قلادات'
            },
            AuraaCategory.BRACELETS: {
                'en': 'Bracelets',
                'ar': 'أساور'
            },
            AuraaCategory.RINGS: {
                'en': 'Rings',
                'ar': 'خواتم'
            },
            AuraaCategory.WATCHES: {
                'en': 'Watches',
                'ar': 'ساعات'
            },
            AuraaCategory.SETS: {
                'en': 'Sets',
                'ar': 'أطقم'
            }
        }
        
        # AliExpress search keywords for each category
        self.search_keywords = {
            AuraaCategory.EARRINGS: 'luxury earrings jewelry',
            AuraaCategory.NECKLACES: 'luxury necklace pendant jewelry',
            AuraaCategory.BRACELETS: 'luxury bracelet bangle jewelry',
            AuraaCategory.RINGS: 'luxury ring band jewelry',
            AuraaCategory.WATCHES: 'luxury watch timepiece',
            AuraaCategory.SETS: 'luxury jewelry set bridal'
        }
    
    def map_by_category_id(self, aliexpress_category_id: str) -> Optional[AuraaCategory]:
        """
        Map AliExpress category ID to Auraa category.
        
        Args:
            aliexpress_category_id: AliExpress category ID
            
        Returns:
            AuraaCategory or None if not found
        """
        return self.aliexpress_category_map.get(aliexpress_category_id)
    
    def map_by_title(self, title: str) -> AuraaCategory:
        """
        Detect category from product title using keywords.
        
        Args:
            title: Product title (EN or AR)
            
        Returns:
            Best matching AuraaCategory (defaults to SETS if ambiguous)
        """
        title_lower = title.lower()
        
        # Score each category based on keyword matches
        scores = {category: 0 for category in AuraaCategory}
        
        for category, keywords in self.keyword_map.items():
            for keyword in keywords:
                if keyword.lower() in title_lower:
                    scores[category] += 1
        
        # Return category with highest score
        max_score = max(scores.values())
        if max_score > 0:
            return max(scores, key=scores.get)
        
        # Default to SETS if no match
        return AuraaCategory.SETS
    
    def get_category_name(self, category: AuraaCategory, language: str = 'en') -> str:
        """
        Get localized category name.
        
        Args:
            category: AuraaCategory enum
            language: Language code ('en' or 'ar')
            
        Returns:
            Localized category name
        """
        return self.category_names.get(category, {}).get(language, category.value)
    
    def get_search_keyword(self, category: AuraaCategory) -> str:
        """
        Get search keyword for AliExpress API.
        
        Args:
            category: AuraaCategory enum
            
        Returns:
            Search keyword string
        """
        return self.search_keywords.get(category, 'luxury jewelry')
    
    def get_all_categories(self) -> List[AuraaCategory]:
        """Get list of all available categories."""
        return list(AuraaCategory)
    
    def sanitize_product_name(self, name: str, category: AuraaCategory) -> Dict[str, str]:
        """
        Clean and localize product name, removing vendor/marketplace mentions.
        
        Args:
            name: Original product name from AliExpress
            category: Product category
            
        Returns:
            Dict with 'en' and 'ar' versions of sanitized name
        """
        # Remove common vendor/marketplace terms
        remove_terms = [
            'aliexpress', 'ali express', 'china', 'wholesale',
            'dropship', 'free shipping', 'hot sale', 'new arrival',
            'fashion', 'trendy', 'vintage', 'luxury', 'for women',
            'for men', 'unisex', '2024', '2025'
        ]
        
        clean_name = name.lower()
        for term in remove_terms:
            clean_name = clean_name.replace(term, '')
        
        # Clean up extra spaces and capitalize
        clean_name = ' '.join(clean_name.split()).title()
        
        # Add category prefix if not present
        category_name_en = self.get_category_name(category, 'en')
        if category_name_en.lower() not in clean_name.lower():
            clean_name = f"{category_name_en} - {clean_name}"
        
        # For Arabic, use a template approach
        category_name_ar = self.get_category_name(category, 'ar')
        clean_name_ar = f"{category_name_ar} فاخر"
        
        return {
            'en': clean_name[:100],  # Limit length
            'ar': clean_name_ar
        }
