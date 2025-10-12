import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import axios from 'axios';
import {
  Image as ImageIcon,
  Upload,
  Trash2,
  Download,
  Search,
  Grid,
  List,
  Copy,
  Check,
  X,
  AlertCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MediaLibrary = () => {
  const { isRTL } = useLanguage();
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [copiedUrl, setCopiedUrl] = useState(null);

  useEffect(() => {
    fetchMedia();
  }, []);

  const fetchMedia = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/admin/media`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMedia(response.data || []);
    } catch (error) {
      console.error('Error fetching media:', error);
      toast.error(isRTL ? 'فشل في تحميل الوسائط' : 'Failed to load media');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    const token = localStorage.getItem('token');

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        await axios.post(`${API}/admin/upload-image`, formData, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        });
      }

      toast.success(isRTL ? 'تم رفع الملفات بنجاح' : 'Files uploaded successfully');
      fetchMedia();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast.error(isRTL ? 'فشل في رفع الملفات' : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId) => {
    if (!window.confirm(isRTL ? 'هل تريد حذف هذا الملف؟' : 'Delete this file?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/admin/media/${mediaId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(isRTL ? 'تم حذف الملف' : 'File deleted');
      fetchMedia();
    } catch (error) {
      console.error('Error deleting media:', error);
      toast.error(isRTL ? 'فشل في حذف الملف' : 'Failed to delete file');
    }
  };

  const copyToClipboard = (url) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast.success(isRTL ? 'تم نسخ الرابط' : 'URL copied to clipboard');
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const filteredMedia = media.filter(item => 
    item.filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.url?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const MediaCard = ({ item }) => (
    <Card className="luxury-card p-4 group relative">
      <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-gray-100">
        <img
          src={item.url}
          alt={item.filename}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/300?text=Image+Not+Found';
          }}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center gap-2">
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full hover:bg-amber-50"
            onClick={() => copyToClipboard(item.url)}
          >
            {copiedUrl === item.url ? (
              <Check className="h-4 w-4 text-green-600" />
            ) : (
              <Copy className="h-4 w-4 text-gray-700" />
            )}
          </button>
          <a
            href={item.url}
            download
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full hover:bg-amber-50"
          >
            <Download className="h-4 w-4 text-gray-700" />
          </a>
          <button
            className="opacity-0 group-hover:opacity-100 transition-opacity bg-white p-2 rounded-full hover:bg-red-50"
            onClick={() => handleDelete(item.id)}
          >
            <Trash2 className="h-4 w-4 text-red-600" />
          </button>
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium truncate" title={item.filename}>
          {item.filename}
        </p>
        <p className="text-xs text-gray-500">
          {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Unknown size'}
        </p>
        <p className="text-xs text-gray-400 truncate" title={item.url}>
          {item.url}
        </p>
      </div>
    </Card>
  );

  const MediaListItem = ({ item }) => (
    <Card className="luxury-card p-4 flex items-center gap-4">
      <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
        <img
          src={item.url}
          alt={item.filename}
          className="w-full h-full object-cover"
          onError={(e) => {
            e.target.src = 'https://via.placeholder.com/80?text=Image';
          }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{item.filename}</p>
        <p className="text-sm text-gray-500">
          {item.size ? `${(item.size / 1024).toFixed(1)} KB` : 'Unknown size'}
        </p>
        <p className="text-xs text-gray-400 truncate mt-1">{item.url}</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => copyToClipboard(item.url)}
        >
          {copiedUrl === item.url ? (
            <Check className="h-4 w-4 text-green-600" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
        <a href={item.url} download>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
          </Button>
        </a>
        <Button
          variant="outline"
          size="sm"
          className="text-red-600"
          onClick={() => handleDelete(item.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-3 mb-2">
          <ImageIcon className="h-8 w-8 text-amber-600" />
          {isRTL ? 'مكتبة الوسائط' : 'Media Library'}
        </h1>
        <p className="text-gray-600">
          {isRTL 
            ? 'إدارة الصور والملفات الخاصة بالمتجر' 
            : 'Manage store images and files'}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isRTL ? 'بحث في الوسائط...' : 'Search media...'}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
        <label htmlFor="file-upload">
          <Button className="btn-luxury" disabled={uploading} as="span">
            <Upload className="h-4 w-4 mr-2" />
            {uploading 
              ? (isRTL ? 'جاري الرفع...' : 'Uploading...') 
              : (isRTL ? 'رفع ملفات' : 'Upload Files')}
          </Button>
          <input
            id="file-upload"
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
        </div>
      ) : filteredMedia.length === 0 ? (
        <Card className="luxury-card p-12 text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-4">
            {searchQuery 
              ? (isRTL ? 'لا توجد نتائج' : 'No results found')
              : (isRTL ? 'لا توجد ملفات حتى الآن' : 'No files yet')}
          </p>
          {!searchQuery && (
            <label htmlFor="file-upload-empty">
              <Button className="btn-luxury" as="span">
                <Upload className="h-4 w-4 mr-2" />
                {isRTL ? 'رفع أول ملف' : 'Upload First File'}
              </Button>
              <input
                id="file-upload-empty"
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          )}
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredMedia.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredMedia.map((item) => (
            <MediaListItem key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
};

export default MediaLibrary;
