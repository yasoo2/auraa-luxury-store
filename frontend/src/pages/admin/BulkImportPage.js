import React, { useState, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import {
  Upload,
  Download,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Eye,
  Trash2,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { Button } from '../../components/ui/button';

const BulkImportPage = () => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  const fileInputRef = useRef(null);
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState([]);
  const [currentStep, setCurrentStep] = useState('upload'); // upload, preview, import, results

  const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  const csvTemplate = `name,name_en,description,price,category,images,stock_quantity,sku,material,color,tags
قلادة ذهبية,Golden Necklace,قلادة ذهبية فاخرة,299.99,necklaces,https://example.com/image1.jpg,100,NK001,gold,gold,"jewelry,luxury,necklace"
أقراط لؤلؤ,Pearl Earrings,أقراط لؤلؤية طبيعية,199.99,earrings,https://example.com/image2.jpg,50,ER001,pearl,white,"jewelry,pearl,earrings"`;

  const requiredFields = [
    { key: 'name', label: isRTL ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)' },
    { key: 'name_en', label: isRTL ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)' },
    { key: 'price', label: isRTL ? 'السعر' : 'Price' },
    { key: 'category', label: isRTL ? 'الفئة' : 'Category' }
  ];

  const optionalFields = [
    { key: 'description', label: isRTL ? 'الوصف' : 'Description' },
    { key: 'images', label: isRTL ? 'الصور (مفصولة بفاصلة)' : 'Images (comma-separated)' },
    { key: 'stock_quantity', label: isRTL ? 'كمية المخزون' : 'Stock Quantity' },
    { key: 'sku', label: isRTL ? 'رمز المنتج' : 'SKU' },
    { key: 'material', label: isRTL ? 'المادة' : 'Material' },
    { key: 'color', label: isRTL ? 'اللون' : 'Color' },
    { key: 'tags', label: isRTL ? 'العلامات (مفصولة بفاصلة)' : 'Tags (comma-separated)' }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert(isRTL ? 'يرجى اختيار ملف CSV فقط' : 'Please select CSV files only');
      return;
    }

    setSelectedFile(file);
    parseCSV(file);
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const csv = e.target.result;
      const lines = csv.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = [];

      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          
          // Validate row
          row._valid = validateRow(row);
          row._id = `row_${i}`;
          data.push(row);
        }
      }

      setParsedData(data);
      setCurrentStep('preview');
    };
    reader.readAsText(file);
  };

  const validateRow = (row) => {
    const errors = [];
    
    // Check required fields
    requiredFields.forEach(field => {
      if (!row[field.key] || row[field.key].trim() === '') {
        errors.push(`${field.label} ${isRTL ? 'مطلوب' : 'is required'}`);
      }
    });

    // Validate price
    if (row.price && isNaN(parseFloat(row.price))) {
      errors.push(isRTL ? 'السعر يجب أن يكون رقماً' : 'Price must be a number');
    }

    // Validate stock quantity
    if (row.stock_quantity && isNaN(parseInt(row.stock_quantity))) {
      errors.push(isRTL ? 'كمية المخزون يجب أن تكون رقماً صحيحاً' : 'Stock quantity must be an integer');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const startImport = async () => {
    setImporting(true);
    setCurrentStep('import');
    
    const validRows = parsedData.filter(row => row._valid.isValid);
    const results = [];

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      
      try {
        // Prepare product data
        const productData = {
          name: row.name,
          name_en: row.name_en,
          description: row.description || row.name,
          description_en: row.description || row.name_en,
          price: parseFloat(row.price),
          category: row.category,
          images: row.images ? row.images.split(',').map(img => img.trim()) : [],
          stock_quantity: parseInt(row.stock_quantity) || 100,
          sku: row.sku || `BULK_${Date.now()}_${i}`,
          material: row.material || '',
          color: row.color || '',
          tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : [],
          is_featured: false,
          is_active: true,
          import_source: 'bulk_csv'
        };

        // Make API request
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/products`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productData)
        });

        if (response.ok) {
          const createdProduct = await response.json();
          results.push({
            row: i + 1,
            status: 'success',
            product: createdProduct,
            message: isRTL ? 'تم الإنشاء بنجاح' : 'Created successfully'
          });
        } else {
          const error = await response.text();
          results.push({
            row: i + 1,
            status: 'error',
            product: row,
            message: error || (isRTL ? 'فشل في الإنشاء' : 'Failed to create')
          });
        }
      } catch (error) {
        results.push({
          row: i + 1,
          status: 'error',
          product: row,
          message: error.message || (isRTL ? 'خطأ غير معروف' : 'Unknown error')
        });
      }

      // Update progress
      setImportResults([...results]);
    }

    setImporting(false);
    setCurrentStep('results');
  };

  const downloadTemplate = () => {
    const element = document.createElement('a');
    const file = new Blob([csvTemplate], { type: 'text/csv' });
    element.href = URL.createObjectURL(file);
    element.download = 'bulk_import_template.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const resetImport = () => {
    setSelectedFile(null);
    setParsedData([]);
    setImportResults([]);
    setCurrentStep('upload');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const validRowsCount = parsedData.filter(row => row._valid.isValid).length;
  const invalidRowsCount = parsedData.length - validRowsCount;

  return (
    <div className="p-6 max-w-7xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isRTL ? 'الاستيراد المجمع' : 'Bulk Import'}
        </h1>
        <p className="text-gray-600">
          {isRTL ? 'استيراد منتجات متعددة باستخدام ملف CSV' : 'Import multiple products using CSV file'}
        </p>
      </div>

      {/* Steps */}
      <div className="mb-8">
        <div className="flex items-center">
          {[
            { key: 'upload', label: isRTL ? 'رفع الملف' : 'Upload File', icon: Upload },
            { key: 'preview', label: isRTL ? 'معاينة البيانات' : 'Preview Data', icon: Eye },
            { key: 'import', label: isRTL ? 'الاستيراد' : 'Import', icon: Play },
            { key: 'results', label: isRTL ? 'النتائج' : 'Results', icon: CheckCircle }
          ].map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.key;
            const isCompleted = ['upload', 'preview', 'import', 'results'].indexOf(currentStep) > index;
            
            return (
              <React.Fragment key={step.key}>
                <div className={`flex items-center ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
                    isActive ? 'border-blue-600 bg-blue-50' : isCompleted ? 'border-green-600 bg-green-50' : 'border-gray-300'
                  }`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="ml-2 text-sm font-medium">{step.label}</span>
                </div>
                {index < 3 && (
                  <div className={`flex-1 h-px mx-4 ${isCompleted ? 'bg-green-600' : 'bg-gray-300'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {currentStep === 'upload' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-6">
            <Upload className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isRTL ? 'رفع ملف CSV' : 'Upload CSV File'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isRTL ? 'اختر ملف CSV يحتوي على بيانات المنتجات' : 'Select a CSV file containing product data'}
            </p>
            
            <div className="flex flex-col items-center gap-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
              />
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Upload className="h-4 w-4 mr-2" />
                {isRTL ? 'اختيار ملف CSV' : 'Choose CSV File'}
              </Button>
              
              <Button
                variant="outline"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                {isRTL ? 'تحميل قالب CSV' : 'Download CSV Template'}
              </Button>
            </div>
          </div>

          {/* Field Requirements */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {isRTL ? 'الحقول المطلوبة' : 'Required Fields'}
              </h4>
              <ul className="space-y-2">
                {requiredFields.map(field => (
                  <li key={field.key} className="flex items-center text-sm text-gray-600">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <code className="bg-gray-100 px-1 rounded text-xs mr-2">{field.key}</code>
                    <span>{field.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">
                {isRTL ? 'الحقول الاختيارية' : 'Optional Fields'}
              </h4>
              <ul className="space-y-2">
                {optionalFields.map(field => (
                  <li key={field.key} className="flex items-center text-sm text-gray-600">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mr-2 flex-shrink-0" />
                    <code className="bg-gray-100 px-1 rounded text-xs mr-2">{field.key}</code>
                    <span>{field.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'preview' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isRTL ? 'ملخص البيانات' : 'Data Summary'}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{parsedData.length}</div>
                <div className="text-sm text-gray-600">{isRTL ? 'إجمالي الصفوف' : 'Total Rows'}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validRowsCount}</div>
                <div className="text-sm text-gray-600">{isRTL ? 'صفوف صالحة' : 'Valid Rows'}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{invalidRowsCount}</div>
                <div className="text-sm text-gray-600">{isRTL ? 'صفوف غير صالحة' : 'Invalid Rows'}</div>
              </div>
            </div>
          </div>

          {/* Data Preview */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {isRTL ? 'معاينة البيانات' : 'Data Preview'}
              </h3>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'اسم المنتج' : 'Name'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'السعر' : 'Price'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'الفئة' : 'Category'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'الأخطاء' : 'Errors'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {parsedData.slice(0, 10).map((row, index) => (
                    <tr key={index} className={row._valid.isValid ? 'bg-green-50' : 'bg-red-50'}>
                      <td className="px-4 py-2">
                        {row._valid.isValid ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.price}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{row.category}</td>
                      <td className="px-4 py-2 text-sm text-red-600">
                        {!row._valid.isValid && (
                          <div className="space-y-1">
                            {row._valid.errors.map((error, i) => (
                              <div key={i} className="text-xs">{error}</div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button variant="outline" onClick={resetImport}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRTL ? 'إعادة تحميل' : 'Reset'}
            </Button>
            
            <Button
              onClick={startImport}
              disabled={validRowsCount === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="h-4 w-4 mr-2" />
              {isRTL ? `استيراد ${validRowsCount} منتج` : `Import ${validRowsCount} Products`}
            </Button>
          </div>
        </div>
      )}

      {currentStep === 'import' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center">
            <Loader2 className="h-16 w-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {isRTL ? 'جارٍ الاستيراد...' : 'Importing Products...'}
            </h3>
            <p className="text-gray-600 mb-6">
              {isRTL ? 'يتم إنشاء المنتجات، يرجى الانتظار...' : 'Products are being created, please wait...'}
            </p>
            
            {importResults.length > 0 && (
              <div className="mt-6">
                <div className="text-sm text-gray-600">
                  {isRTL ? 'تم الانتهاء من:' : 'Completed:'} {importResults.length} / {validRowsCount}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(importResults.length / validRowsCount) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentStep === 'results' && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {isRTL ? 'نتائج الاستيراد' : 'Import Results'}
            </h3>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {importResults.filter(r => r.status === 'success').length}
                </div>
                <div className="text-sm text-gray-600">{isRTL ? 'نجح' : 'Success'}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {importResults.filter(r => r.status === 'error').length}
                </div>
                <div className="text-sm text-gray-600">{isRTL ? 'فشل' : 'Failed'}</div>
              </div>
            </div>
          </div>

          {/* Results Detail */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'الصف' : 'Row'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'المنتج' : 'Product'}</th>
                    <th className="px-4 py-2 text-xs font-medium text-gray-500 uppercase">{isRTL ? 'الرسالة' : 'Message'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {importResults.map((result, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm text-gray-900">{result.row}</td>
                      <td className="px-4 py-2">
                        {result.status === 'success' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {result.product?.name || result.product?.name_en || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-600">{result.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={resetImport}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isRTL ? 'استيراد جديد' : 'New Import'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkImportPage;