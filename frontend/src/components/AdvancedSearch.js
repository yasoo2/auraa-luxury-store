import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Star,
  Heart,
  ShoppingCart,
  Eye,
  Sparkles,
  Zap,
  TrendingUp,
  Palette,
  Gem,
  Crown
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AdvancedSearch = ({ onResults, showFilters = true }) => {
  const { t, language, currency } = useLanguage();
  const isRTL = language === 'ar';
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    material: searchParams.get('material') || '',
    color: searchParams.get('color') || '',
    size: searchParams.get('size') || '',
    brand: searchParams.get('brand') || '',
    rating: searchParams.get('rating') || '',
    inStock: searchParams.get('inStock') === 'true',
    onSale: searchParams.get('onSale') === 'true',
    sortBy: searchParams.get('sortBy') || 'relevance'
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // AI-powered search suggestions
  const generateAISuggestions = (searchQuery) => {
    const baseSuggestions = [
      { 
        text: isRTL ? 'قلادات ذهبية للمناسبات' : 'Gold necklaces for occasions',
        category: 'necklaces',
        icon: Gem,
        color: 'from-yellow-400 to-amber-500'
      },
      { 
        text: isRTL ? 'أقراط لؤلؤ كلاسيكية' : 'Classic pearl earrings',
        category: 'earrings',
        icon: Sparkles,
        color: 'from-gray-200 to-white'
      },
      { 
        text: isRTL ? 'أساور فضية عصرية' : 'Modern silver bracelets',
        category: 'bracelets',
        icon: Crown,
        color: 'from-gray-300 to-gray-500'
      },
      { 
        text: isRTL ? 'ساعات فاخرة للنساء' : 'Luxury watches for women',
        category: 'watches',
        icon: TrendingUp,
        color: 'from-purple-400 to-pink-500'
      }
    ];

    // Simple AI-like filtering based on query
    if (searchQuery.toLowerCase().includes('gold') || searchQuery.includes('ذهب')) {
      return baseSuggestions.filter(s => s.text.toLowerCase().includes('gold') || s.text.includes('ذهب'));
    }
    if (searchQuery.toLowerCase().includes('pearl') || searchQuery.includes('لؤلؤ')) {
      return baseSuggestions.filter(s => s.text.toLowerCase().includes('pearl') || s.text.includes('لؤلؤ'));
    }
    
    return baseSuggestions.slice(0, 3);
  };

  // Debounced search with AI suggestions
  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (searchQuery.length < 2) {
        setSuggestions([]);
        setAiSuggestions([]);
        return;
      }

      try {
        setIsSearching(true);
        
        // Fetch regular suggestions
        const response = await axios.get(`${API}/search/suggestions?q=${encodeURIComponent(searchQuery)}`);
        setSuggestions(response.data || []);
        
        // Generate AI suggestions
        const aiSuggs = generateAISuggestions(searchQuery);
        setAiSuggestions(aiSuggs);
        
        setShowSuggestions(true);
      } catch (error) {
        console.error('Search suggestions error:', error);
        // Fallback to AI suggestions only
        const aiSuggs = generateAISuggestions(searchQuery);
        setAiSuggestions(aiSuggs);
        setSuggestions([]);
        setShowSuggestions(true);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (query) {
      debouncedSearch(query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
      setAiSuggestions([]);
    }
  }, [query, debouncedSearch]);

  const handleSearch = async (searchQuery = query, newFilters = filters) => {
    if (!searchQuery.trim() && !Object.values(newFilters).some(v => v)) return;

    try {
      setIsSearching(true);
      setShowSuggestions(false);

      // Update URL params
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      Object.entries(newFilters).forEach(([key, value]) => {
        if (value && value !== '') {
          params.set(key, value);
        }
      });

      setSearchParams(params);

      // Perform search
      const response = await axios.get(`${API}/search?${params.toString()}`);
      const results = response.data || [];
      
      if (onResults) {
        onResults(results);
      } else {
        navigate(`/products?${params.toString()}`);
      }
    } catch (error) {
      console.error('Search error:', error);
      if (onResults) {
        onResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    
    // Auto-search when filters change
    if (query || Object.values(newFilters).some(v => v)) {
      handleSearch(query, newFilters);
    }
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      minPrice: '',
      maxPrice: '',
      material: '',
      color: '',
      size: '',
      brand: '',
      rating: '',
      inStock: false,
      onSale: false,
      sortBy: 'relevance'
    });
    setQuery('');
    setSearchParams({});
    if (onResults) {
      onResults([]);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    if (typeof suggestion === 'string') {
      setQuery(suggestion);
      handleSearch(suggestion, filters);
    } else {
      // AI suggestion with category
      setQuery(suggestion.text);
      const newFilters = { ...filters, category: suggestion.category };
      setFilters(newFilters);
      handleSearch(suggestion.text, newFilters);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="relative" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Main Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <Search className={`absolute ${isRTL ? 'right-4' : 'left-4'} top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400`} />
            <Input
              type="text"
              placeholder={isRTL ? 'ابحث عن المنتجات، العلامات التجارية، الفئات...' : 'Search for products, brands, categories...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={`${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 text-lg border-2 border-amber-200 focus:border-amber-500 rounded-full shadow-lg`}
              dir={isRTL ? 'rtl' : 'ltr'}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className={`absolute ${isRTL ? 'left-4' : 'right-4'} top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600`}
              >
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          
          <Button
            onClick={() => handleSearch()}
            disabled={isSearching}
            className="ml-3 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full shadow-lg"
          >
            {isSearching ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              <Search className="h-5 w-5" />
            )}
          </Button>
          
          {showFilters && (
            <Button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              variant="outline"
              className="ml-2 px-4 py-3 rounded-full border-2 border-amber-200 hover:border-amber-500"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Search Suggestions */}
        {showSuggestions && (suggestions.length > 0 || aiSuggestions.length > 0) && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-80 overflow-y-auto">
            {aiSuggestions.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <div className="flex items-center mb-2">
                  <Zap className="h-4 w-4 text-amber-500 mr-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {isRTL ? 'اقتراحات ذكية' : 'Smart Suggestions'}
                  </span>
                </div>
                {aiSuggestions.map((suggestion, index) => {
                  const IconComponent = suggestion.icon;
                  return (
                    <button
                      key={index}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="w-full text-left p-2 hover:bg-amber-50 rounded-md transition-colors flex items-center"
                    >
                      <div className={`p-2 rounded-full bg-gradient-to-r ${suggestion.color} mr-3`}>
                        <IconComponent className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-sm text-gray-700">{suggestion.text}</span>
                    </button>
                  );
                })}
              </div>
            )}
            
            {suggestions.length > 0 && (
              <div className="p-3">
                <div className="flex items-center mb-2">
                  <Search className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-sm font-medium text-gray-700">
                    {isRTL ? 'اقتراحات البحث' : 'Search Suggestions'}
                  </span>
                </div>
                {suggestions.slice(0, 5).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full text-left p-2 hover:bg-gray-50 rounded-md transition-colors text-sm text-gray-700"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Advanced Filters */}
      {showFilters && showAdvancedFilters && (
        <div className="mt-4 p-6 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'فلاتر متقدمة' : 'Advanced Filters'}
            </h3>
            <Button onClick={clearFilters} variant="ghost" size="sm">
              <X className="h-4 w-4 mr-1" />
              {isRTL ? 'مسح الكل' : 'Clear All'}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'الفئة' : 'Category'}
              </label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">{isRTL ? 'جميع الفئات' : 'All Categories'}</option>
                <option value="necklaces">{isRTL ? 'قلادات' : 'Necklaces'}</option>
                <option value="earrings">{isRTL ? 'أقراط' : 'Earrings'}</option>
                <option value="bracelets">{isRTL ? 'أساور' : 'Bracelets'}</option>
                <option value="rings">{isRTL ? 'خواتم' : 'Rings'}</option>
                <option value="watches">{isRTL ? 'ساعات' : 'Watches'}</option>
                <option value="sets">{isRTL ? 'أطقم' : 'Sets'}</option>
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'نطاق السعر' : 'Price Range'}
              </label>
              <div className="flex space-x-2">
                <Input
                  type="number"
                  placeholder={isRTL ? 'من' : 'Min'}
                  value={filters.minPrice}
                  onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                  className="w-1/2"
                />
                <Input
                  type="number"
                  placeholder={isRTL ? 'إلى' : 'Max'}
                  value={filters.maxPrice}
                  onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                  className="w-1/2"
                />
              </div>
            </div>

            {/* Material Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'المادة' : 'Material'}
              </label>
              <select
                value={filters.material}
                onChange={(e) => handleFilterChange('material', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">{isRTL ? 'جميع المواد' : 'All Materials'}</option>
                <option value="gold">{isRTL ? 'ذهب' : 'Gold'}</option>
                <option value="silver">{isRTL ? 'فضة' : 'Silver'}</option>
                <option value="platinum">{isRTL ? 'بلاتين' : 'Platinum'}</option>
                <option value="pearl">{isRTL ? 'لؤلؤ' : 'Pearl'}</option>
                <option value="diamond">{isRTL ? 'ماس' : 'Diamond'}</option>
              </select>
            </div>

            {/* Color Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'اللون' : 'Color'}
              </label>
              <div className="flex flex-wrap gap-2">
                {['gold', 'silver', 'rose-gold', 'black', 'white'].map((color) => (
                  <button
                    key={color}
                    onClick={() => handleFilterChange('color', color === filters.color ? '' : color)}
                    className={`w-8 h-8 rounded-full border-2 ${
                      filters.color === color ? 'border-amber-500' : 'border-gray-300'
                    } ${
                      color === 'gold' ? 'bg-yellow-400' :
                      color === 'silver' ? 'bg-gray-300' :
                      color === 'rose-gold' ? 'bg-pink-300' :
                      color === 'black' ? 'bg-black' :
                      'bg-white'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {isRTL ? 'التقييم' : 'Rating'}
              </label>
              <select
                value={filters.rating}
                onChange={(e) => handleFilterChange('rating', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              >
                <option value="">{isRTL ? 'جميع التقييمات' : 'All Ratings'}</option>
                <option value="4">{isRTL ? '4 نجوم وأكثر' : '4+ Stars'}</option>
                <option value="3">{isRTL ? '3 نجوم وأكثر' : '3+ Stars'}</option>
              </select>
            </div>

            {/* Stock Filter */}
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.inStock}
                  onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {isRTL ? 'متوفر في المخزون' : 'In Stock Only'}
                </span>
              </label>
            </div>

            {/* Sale Filter */}
            <div className="flex items-center">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={filters.onSale}
                  onChange={(e) => handleFilterChange('onSale', e.target.checked)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  {isRTL ? 'عروض خاصة' : 'On Sale'}
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {isRTL ? 'ترتيب حسب' : 'Sort By'}
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
            >
              <option value="relevance">{isRTL ? 'الأكثر صلة' : 'Most Relevant'}</option>
              <option value="price-low-high">{isRTL ? 'السعر: من الأقل إلى الأعلى' : 'Price: Low to High'}</option>
              <option value="price-high-low">{isRTL ? 'السعر: من الأعلى إلى الأقل' : 'Price: High to Low'}</option>
              <option value="rating">{isRTL ? 'الأعلى تقييماً' : 'Highest Rated'}</option>
              <option value="newest">{isRTL ? 'الأحدث' : 'Newest'}</option>
              <option value="popular">{isRTL ? 'الأكثر شيوعاً' : 'Most Popular'}</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

// Debounce utility function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default AdvancedSearch;