import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import axios from 'axios';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  MoreVertical,
  User,
  Bot,
  Clock,
  Check,
  CheckCheck,
  Star,
  Heart,
  ThumbsUp,
  Image as ImageIcon,
  Mic,
  MicOff,
  Camera
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const LiveChat = ({ userId = null, productId = null }) => {
  const { t, language } = useLanguage();
  const isRTL = language === 'ar';
  
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [operatorTyping, setOperatorTyping] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('connecting'); // connecting, connected, disconnected
  const [currentOperator, setCurrentOperator] = useState(null);
  const [chatSession, setChatSession] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  // Quick reply suggestions
  const quickReplies = [
    { 
      text: isRTL ? 'مرحباً، أحتاج مساعدة' : 'Hello, I need help',
      category: 'greeting'
    },
    { 
      text: isRTL ? 'أريد معرفة المزيد عن هذا المنتج' : 'Tell me more about this product',
      category: 'product'
    },
    { 
      text: isRTL ? 'ما هي أوقات التسليم؟' : 'What are the delivery times?',
      category: 'shipping'
    },
    { 
      text: isRTL ? 'هل يمكنني إرجاع المنتج؟' : 'Can I return this product?',
      category: 'returns'
    },
    { 
      text: isRTL ? 'أحتاج مساعدة في الطلب' : 'I need help with my order',
      category: 'order'
    }
  ];

  const emojis = ['😊', '😍', '🤔', '👍', '❤️', '🙏', '😢', '😅', '🎉', '👏'];

  useEffect(() => {
    if (isOpen && !chatSession) {
      initializeChat();
    }
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const initializeChat = async () => {
    try {
      const response = await axios.post(`${API}/chat/initialize`, {
        userId,
        productId,
        language
      });
      
      const session = response.data;
      setChatSession(session);
      
      // Initialize WebSocket connection
      initializeWebSocket(session.sessionId);
      
      // Add welcome message
      addSystemMessage(
        isRTL ? 
        'مرحباً بك في دعم أورا لاكشري! كيف يمكنني مساعدتك اليوم؟' :
        'مرحباً بك في دعم لورا لاكشري! كيف يمكنني مساعدتك اليوم؟'
      );
      
    } catch (error) {
      console.error('Chat initialization error:', error);
      setConnectionStatus('disconnected');
    }
  };

  const initializeWebSocket = (sessionId) => {
    const wsUrl = `${BACKEND_URL.replace('http', 'ws')}/ws/chat/${sessionId}`;
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      console.log('Chat WebSocket connected');
      setConnectionStatus('connected');
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      handleWebSocketMessage(data);
    };
    
    wsRef.current.onclose = () => {
      console.log('Chat WebSocket disconnected');
      setConnectionStatus('disconnected');
    };
    
    wsRef.current.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
      setConnectionStatus('disconnected');
    };
  };

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'message':
        addMessage(data.message);
        if (!isOpen) {
          setUnreadCount(prev => prev + 1);
        }
        break;
      case 'typing':
        setOperatorTyping(data.isTyping);
        break;
      case 'operator_assigned':
        setCurrentOperator(data.operator);
        addSystemMessage(
          isRTL ? 
          `تم تعيين ${data.operator.name} لمساعدتك` :
          `${data.operator.name} has been assigned to help you`
        );
        break;
      case 'operator_left':
        setCurrentOperator(null);
        addSystemMessage(
          isRTL ? 
          'انتهت المحادثة. شكراً لتواصلك معنا!' :
          'Chat session ended. Thank you for contacting us!'
        );
        break;
    }
  };

  const addMessage = (message) => {
    setMessages(prev => [...prev, {
      ...message,
      timestamp: new Date().toISOString(),
      status: message.sender === 'user' ? 'sent' : 'received'
    }]);
  };

  const addSystemMessage = (text) => {
    addMessage({
      id: Date.now(),
      type: 'system',
      text,
      sender: 'system'
    });
  };

  const sendMessage = async (messageText = inputMessage) => {
    if (!messageText.trim() || !wsRef.current) return;
    
    const message = {
      id: Date.now(),
      type: 'text',
      text: messageText.trim(),
      sender: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, message]);
    setInputMessage('');
    
    // Send via WebSocket
    wsRef.current.send(JSON.stringify({
      type: 'message',
      message
    }));
    
    // Update message status
    setTimeout(() => {
      setMessages(prev => 
        prev.map(m => 
          m.id === message.id ? { ...m, status: 'sent' } : m
        )
      );
    }, 1000);
  };

  const sendTypingIndicator = (isTyping) => {
    if (wsRef.current && isTyping !== isTyping) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
        isTyping
      }));
      setIsTyping(isTyping);
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
    
    if (e.target.value.trim()) {
      sendTypingIndicator(true);
    } else {
      sendTypingIndicator(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        await sendAudioMessage(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioMessage = async (audioBlob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-message.webm');
    formData.append('sessionId', chatSession.sessionId);
    
    try {
      const response = await axios.post(`${API}/chat/audio`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      addMessage({
        id: Date.now(),
        type: 'audio',
        url: response.data.audioUrl,
        sender: 'user'
      });
    } catch (error) {
      console.error('Audio upload error:', error);
    }
  };

  const sendFileMessage = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('sessionId', chatSession.sessionId);
    
    try {
      const response = await axios.post(`${API}/chat/file`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      addMessage({
        id: Date.now(),
        type: 'file',
        fileName: file.name,
        fileUrl: response.data.fileUrl,
        fileSize: file.size,
        sender: 'user'
      });
    } catch (error) {
      console.error('File upload error:', error);
    }
  };

  const rateChat = async (rating) => {
    try {
      await axios.post(`${API}/chat/rate`, {
        sessionId: chatSession.sessionId,
        rating
      });
      
      addSystemMessage(
        isRTL ? 
        'شكراً لتقييمك! نقدر رأيك.' :
        'Thank you for your rating! We appreciate your feedback.'
      );
    } catch (error) {
      console.error('Rating error:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString(
      isRTL ? 'ar-SA' : 'en-US', 
      { hour: '2-digit', minute: '2-digit' }
    );
  };

  const renderMessage = (message) => {
    const isUser = message.sender === 'user';
    const isSystem = message.sender === 'system';
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        {!isUser && !isSystem && (
          <div className="flex-shrink-0 mr-3">
            <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
              {currentOperator?.avatar ? (
                <img 
                  src={currentOperator.avatar} 
                  alt={currentOperator.name}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <Bot className="h-4 w-4 text-white" />
              )}
            </div>
          </div>
        )}
        
        <div className={`max-w-xs lg:max-w-md ${isSystem ? 'mx-auto' : ''}`}>
          {isSystem ? (
            <div className="text-center text-sm text-gray-500 bg-gray-100 rounded-full px-4 py-2">
              {message.text}
            </div>
          ) : (
            <div
              className={`rounded-lg px-4 py-3 ${
                isUser
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.type === 'text' && (
                <p className="text-sm">{message.text}</p>
              )}
              
              {message.type === 'audio' && (
                <div className="flex items-center">
                  <Mic className="h-4 w-4 mr-2" />
                  <audio controls className="max-w-full">
                    <source src={message.url} type="audio/webm" />
                  </audio>
                </div>
              )}
              
              {message.type === 'file' && (
                <div className="flex items-center">
                  <Paperclip className="h-4 w-4 mr-2" />
                  <a 
                    href={message.fileUrl} 
                    download={message.fileName}
                    className="text-sm underline"
                  >
                    {message.fileName}
                  </a>
                </div>
              )}
              
              <div className={`flex items-center justify-between mt-1 ${isUser ? 'text-amber-100' : 'text-gray-500'}`}>
                <span className="text-xs">{formatTime(message.timestamp)}</span>
                {isUser && (
                  <div className="flex items-center">
                    {message.status === 'sending' && <Clock className="h-3 w-3" />}
                    {message.status === 'sent' && <Check className="h-3 w-3" />}
                    {message.status === 'delivered' && <CheckCheck className="h-3 w-3" />}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {isUser && (
          <div className="flex-shrink-0 ml-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => {
            setIsOpen(true);
            setUnreadCount(0);
          }}
          className="relative bg-amber-500 hover:bg-amber-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 transform hover:scale-105"
        >
          <MessageCircle className="h-6 w-6" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
              {unreadCount}
            </div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div 
      className={`fixed bottom-6 right-6 z-50 bg-white rounded-lg shadow-2xl border border-gray-200 transition-all duration-300 ${
        isMinimized ? 'h-16' : 'h-96 md:h-[32rem]'
      } w-80 md:w-96`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-t-lg">
        <div className="flex items-center">
          <div className="flex items-center">
            <div className={`w-3 h-3 rounded-full mr-2 ${
              connectionStatus === 'connected' ? 'bg-green-400' :
              connectionStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
              'bg-red-400'
            }`} />
            <h3 className="font-semibold text-sm">
              {isRTL ? 'دعم العملاء' : 'Customer Support'}
            </h3>
          </div>
          {currentOperator && (
            <div className="ml-2 text-xs">
              {currentOperator.name}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-amber-600 rounded"
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-amber-600 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="flex-1 p-4 h-64 md:h-80 overflow-y-auto bg-gray-50">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-sm">
                  {isRTL ? 
                    'ابدأ محادثة جديدة أو اختر إحدى الرسائل السريعة أدناه' :
                    'Start a new conversation or choose a quick reply below'
                  }
                </p>
              </div>
            ) : (
              <>
                {messages.map(renderMessage)}
                {operatorTyping && (
                  <div className="flex justify-start mb-4">
                    <div className="bg-gray-200 rounded-lg px-4 py-3 max-w-xs">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75" />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150" />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Quick Replies */}
          {messages.length === 0 && (
            <div className="px-4 pb-2">
              <div className="flex flex-wrap gap-2">
                {quickReplies.slice(0, 3).map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => sendMessage(reply.text)}
                    className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full hover:bg-amber-200 transition-colors"
                  >
                    {reply.text}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-2">
              {/* File upload */}
              <label className="cursor-pointer p-2 text-gray-400 hover:text-amber-500 transition-colors">
                <Paperclip className="h-4 w-4" />
                <input
                  type="file"
                  className="hidden"
                  onChange={(e) => e.target.files[0] && sendFileMessage(e.target.files[0])}
                />
              </label>

              {/* Voice recording */}
              <button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                className={`p-2 transition-colors ${
                  isRecording ? 'text-red-500' : 'text-gray-400 hover:text-amber-500'
                }`}
              >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              {/* Message input */}
              <div className="flex-1 relative">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={isRTL ? 'اكتب رسالتك...' : 'Type your message...'}
                  className="pr-10"
                />
                
                {/* Emoji button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-amber-500"
                >
                  <Smile className="h-4 w-4" />
                </button>
                
                {/* Emoji picker */}
                {showEmojiPicker && (
                  <div className="absolute bottom-full right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1">
                    {emojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setInputMessage(prev => prev + emoji);
                          setShowEmojiPicker(false);
                          inputRef.current?.focus();
                        }}
                        className="p-1 hover:bg-gray-100 rounded text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Send button */}
              <Button
                onClick={() => sendMessage()}
                disabled={!inputMessage.trim()}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 p-2"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Rating */}
          {messages.length > 5 && currentOperator && (
            <div className="px-4 pb-4">
              <div className="text-center">
                <p className="text-xs text-gray-600 mb-2">
                  {isRTL ? 'كيف كانت تجربتك؟' : 'How was your experience?'}
                </p>
                <div className="flex justify-center space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => rateChat(rating)}
                      className="text-gray-300 hover:text-yellow-400 transition-colors"
                    >
                      <Star className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default LiveChat;