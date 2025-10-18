import React, { useState } from 'react';
import { Search, Package, ShoppingCart, DollarSign, Truck, Check, X, Loader } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AliExpressImportPage = () => {
  const [searchKeywords, setSearchKeywords] = useState('');
  const [targetCountry, setTargetCountry] = useState('SA');
  const [category, setCategory] = useState('imported');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState({});
  
  const countries = [
    { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
    { code: 'KW', name: 'Kuwait', flag: '🇰🇼' },
    { code: 'QA', name: 'Qatar', flag: '🇶🇦' },
    { code: 'BH', name: 'Bahrain', flag: '🇧🇭' },
    { code: 'OM', name: 'Oman', flag: '🇴🇲' }
  ];
  
  const categories = [
    { value: 'earrings', label: 'Earrings' },
    { value: 'necklaces', label: 'Necklaces' },
    { value: 'bracelets', label: 'Bracelets' },
    { value: 'rings', label: 'Rings' },
    { value: 'watches', label: 'Watches' },
    { value: 'sets', label: 'Sets' },
    { value: 'imported', label: 'Imported Products' }
  ];
  
  const handleSearch = async () => {
    if (!searchKeywords.trim()) {
      toast.error('Please enter search keywords');
      return;
    }
    
    setSearching(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/aliexpress/real/search`,
        null,
        {
          params: {
            keywords: searchKeywords,
            country: targetCountry,
            limit: 20,
            auto_import: false,
            category: category
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        setSearchResults(response.data.products || []);
        toast.success(`Found ${response.data.count} products`);
      } else {
        toast.error(response.data.message || 'Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast.error('Failed to search products');
    } finally {
      setSearching(false);
    }
  };
  
  const handleImportProduct = async (product) => {
    const productId = product.product_id;
    setImporting(prev => ({ ...prev, [productId]: true }));
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/aliexpress/real/import/${productId}`,
        null,
        {
          params: {
            country: targetCountry,
            category: category
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        toast.success('Product imported successfully!');
        // Mark as imported in UI
        setSearchResults(prev =>
          prev.map(p =>
            p.product_id === productId ? { ...p, imported: true } : p
          )
        );
      } else {
        toast.error(response.data.message || 'Import failed');
      }
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Failed to import product');
    } finally {
      setImporting(prev => ({ ...prev, [productId]: false }));
    }
  };
  
  const handleBulkImport = async () => {
    if (!searchKeywords.trim()) {
      toast.error('Please enter search keywords first');
      return;
    }
    
    const confirmed = window.confirm(
      `Import up to 50 products matching "${searchKeywords}"?`
    );
    
    if (!confirmed) return;
    
    setSearching(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API}/aliexpress/real/bulk-import`,
        null,
        {
          params: {
            keywords: searchKeywords,
            count: 50,
            country: targetCountry,
            category: category
          },
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      if (response.data.success) {
        const stats = response.data.statistics;
        toast.success(
          `Imported ${stats.imported} products successfully! (${stats.failed} failed)`
        );
      } else {
        toast.error(response.data.message || 'Bulk import failed');
      }
    } catch (error) {
      console.error('Bulk import error:', error);
      toast.error('Failed to bulk import products');
    } finally {
      setSearching(false);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Import from AliExpress</h1>
        <p className="text-gray-600">
          Search and import products with automatic pricing calculation
        </p>
      </div>
      
      {/* Search Section */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Input */}
            <div className="md:col-span-1">
              <label className="block text-sm font-medium mb-2">
                Search Keywords
              </label>
              <input
                type="text"
                value={searchKeywords}
                onChange={(e) => setSearchKeywords(e.target.value)}
                placeholder="e.g., luxury watch"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            
            {/* Country Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Target Country
              </label>
              <select
                value={targetCountry}
                onChange={(e) => setTargetCountry(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                {countries.map(country => (
                  <option key={country.code} value={country.code}>
                    {country.flag} {country.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Category Selection */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Store Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleSearch}
              disabled={searching}
              className="flex items-center gap-2"
            >
              {searching ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              Search Products
            </Button>
            
            <Button
              onClick={handleBulkImport}
              disabled={searching || !searchKeywords}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Bulk Import (50 products)
            </Button>
          </div>
        </div>
      </Card>
      
      {/* Results Section */}
      {searchResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">
              Search Results ({searchResults.length})
            </h2>
            <div className="text-sm text-gray-600">
              Prices calculated for {countries.find(c => c.code === targetCountry)?.name}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {searchResults.map((product) => {
              const pricing = product.pricing || {};
              const isImporting = importing[product.product_id];
              const isImported = product.imported;
              
              return (
                <Card key={product.product_id} className="overflow-hidden">
                  {/* Product Image */}
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={product.image_url || product.images?.[0]}
                      alt={product.title}
                      className="w-full h-full object-cover"
                    />
                    {isImported && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Imported
                      </div>
                    )}
                  </div>
                  
                  {/* Product Info */}
                  <div className="p-4 space-y-3">
                    <h3 className="font-medium text-sm line-clamp-2 h-10">
                      {product.title}
                    </h3>
                    
                    {/* Pricing Info */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Base Price:</span>
                        <span className="font-medium">${pricing.base_price?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Shipping:</span>
                        <span className="font-medium">
                          {pricing.free_shipping ? 'Free' : `$${pricing.shipping_cost?.toFixed(2)}`}
                        </span>
                      </div>
                      {pricing.total_taxes > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Taxes:</span>
                          <span className="font-medium">${pricing.total_taxes?.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="border-t pt-2 flex justify-between items-center">
                        <span className="font-semibold">Final Price:</span>
                        <span className="text-lg font-bold text-primary">
                          ${pricing.final_price?.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        Profit: ${pricing.profit_amount?.toFixed(2)} ({pricing.profit_margin_percentage}%)
                      </div>
                    </div>
                    
                    {/* Shipping Info */}
                    <div className="flex items-center gap-2 text-xs text-gray-600 bg-blue-50 p-2 rounded">
                      <Truck className="w-3 h-3" />
                      <span>{pricing.delivery_estimate || '15-30 days'}</span>
                    </div>
                    
                    {/* Rating */}
                    {product.rating > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-yellow-500">★ {product.rating}</span>
                        <span className="text-gray-500">
                          ({product.orders_count} orders)
                        </span>
                      </div>
                    )}
                    
                    {/* Import Button */}
                    <Button
                      onClick={() => handleImportProduct(product)}
                      disabled={isImporting || isImported}
                      className="w-full"
                      size="sm"
                    >
                      {isImporting ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin mr-2" />
                          Importing...
                        </>
                      ) : isImported ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Imported
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Import to Store
                        </>
                      )}
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Empty State */}
      {!searching && searchResults.length === 0 && (
        <Card className="p-12 text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-medium mb-2">No products yet</h3>
          <p className="text-gray-600">
            Search for products on AliExpress to get started
          </p>
        </Card>
      )}
    </div>
  );
};

export default AliExpressImportPage;

