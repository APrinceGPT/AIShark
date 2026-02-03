'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { X, Minus, Maximize2, Minimize2, Send, Trash2, GripHorizontal, Sparkles, AlertTriangle } from 'lucide-react';
import { aiCache } from '@/lib/ai-cache';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';

interface SharkAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  packets: Packet[];
  selectedPacket: Packet | null;
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  onPacketClick?: (packetId: number) => void;
  sessionId?: string | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    contextMethod?: 'rag' | 'sampling' | 'hybrid';
    ragMatches?: number;
  };
}

interface Position {
  x: number;
  y: number;
}

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 520;
const MIN_WIDTH = 320;
const MIN_HEIGHT = 400;

export default function SharkAIAssistant({
  isOpen,
  onClose,
  packets,
  selectedPacket,
  statistics,
  analysis,
  onPacketClick,
  sessionId,
}: SharkAIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: -1, y: -1 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suppress unused variable warnings for future resize feature
  void MIN_WIDTH;
  void MIN_HEIGHT;

  // Initialize position on first open
  useEffect(() => {
    if (isOpen && position.x === -1) {
      const x = window.innerWidth - DEFAULT_WIDTH - 80;
      const y = window.innerHeight - DEFAULT_HEIGHT - 100;
      setPosition({ x: Math.max(20, x), y: Math.max(20, y) });
    }
  }, [isOpen, position.x]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle dragging
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMaximized) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  }, [isMaximized]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - size.width));
      const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - size.height));
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, size.width, size.height]);

  const handleSend = async () => {
    if (!input.trim() || loading || packets.length === 0) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    const question = input;
    setInput('');
    setLoading(true);

    try {
      // Build context with selected packet info
      const packetContext = selectedPacket
        ? `\n\nCurrently selected packet #${selectedPacket.id + 1}: ${selectedPacket.protocol} from ${selectedPacket.source} to ${selectedPacket.destination} - ${selectedPacket.info}`
        : '';

      const fullQuestion = question + packetContext;

      // Check cache first
      const cacheKey = { question: fullQuestion, packets: packets.length, statistics, analysis };
      const cached = aiCache.get('/api/analyze/query', cacheKey);

      if (cached) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: cached.answer,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setLoading(false);
        return;
      }

      // Use sessionId if available (for large files), otherwise send packets directly
      const requestBody = sessionId
        ? { question: fullQuestion, sessionId, statistics, analysis }
        : { question: fullQuestion, packets, statistics, analysis };

      const response = await fetch('/api/analyze/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          timestamp: Date.now(),
          metadata: data.metrics ? {
            contextMethod: data.metrics.method,
            ragMatches: data.metrics.ragMatches,
          } : undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
        aiCache.set('/api/analyze/query', cacheKey, data);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
        toast.error(data.error);
      }
    } catch {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Network error: Failed to get response',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
      toast.error('Network error: Failed to get response');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const askAboutPacket = () => {
    if (selectedPacket) {
      setInput(`What can you tell me about this packet? Is there anything unusual?`);
    }
  };

  const toggleMaximize = () => {
    setIsMaximized(prev => !prev);
    if (!isMaximized) {
      setIsMinimized(false);
    }
  };

  const quickQuestions = [
    'What issues do you see?',
    'Any security concerns?',
    'Explain the connection flow',
  ];

  if (!isOpen) return null;

  // Minimized state - modern glassmorphism header
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 animate-scale-in"
        style={{ left: position.x, top: position.y, width: 220 }}
      >
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 overflow-hidden">
          <div
            className="flex items-center justify-between px-3 py-2.5 bg-linear-to-r from-blue-600 via-blue-500 to-cyan-500 cursor-move select-none"
            onMouseDown={handleMouseDown}
          >
            <span className="text-white font-medium text-sm flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              SharkAI
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-all duration-200"
                title="Restore"
              >
                <Maximize2 className="w-3.5 h-3.5 text-white" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-red-500/50 rounded-lg transition-all duration-200"
                title="Close"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const containerStyle = isMaximized
    ? { left: 20, top: 20, right: 20, bottom: 100, width: 'auto', height: 'auto' }
    : { left: position.x, top: position.y, width: size.width, height: size.height };

  return (
    <div
      ref={containerRef}
      className="fixed z-50 animate-scale-in"
      style={containerStyle}
    >
      {/* Glassmorphism Container */}
      <div className="w-full h-full bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 flex flex-col overflow-hidden transition-all duration-300">
        
        {/* Modern Gradient Header */}
        <div
          className="flex items-center justify-between px-4 py-3 bg-linear-to-r from-blue-600 via-blue-500 to-cyan-500 cursor-move select-none shrink-0"
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center gap-3">
            <GripHorizontal className="w-4 h-4 text-white/60" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-semibold text-base">SharkAI</span>
            </div>
            {selectedPacket && (
              <span className="text-xs text-white/90 bg-white/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                Packet #{selectedPacket.id + 1}
              </span>
            )}
          </div>
          
          {/* Window Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(true)}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
              title="Minimize"
            >
              <Minus className="w-4 h-4 text-white" />
            </button>
            <button
              onClick={toggleMaximize}
              className="p-2 hover:bg-white/20 rounded-lg transition-all duration-200"
              title={isMaximized ? 'Restore' : 'Maximize'}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4 text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500/50 rounded-lg transition-all duration-200"
              title="Close"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Context Bar - Modern Style */}
        {selectedPacket && (
          <div className="px-4 py-2.5 bg-linear-to-r from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30 border-b border-blue-200/50 dark:border-blue-800/50 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-blue-700 dark:text-blue-300 truncate font-medium">
                {selectedPacket.protocol}: {selectedPacket.source} → {selectedPacket.destination}
              </span>
              <button
                onClick={askAboutPacket}
                className="text-xs px-3 py-1.5 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-full hover:shadow-lg hover:scale-105 transition-all duration-200 shrink-0 font-medium"
              >
                Ask about this
              </button>
            </div>
          </div>
        )}

        {/* Messages Area with Custom Scrollbar */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 chat-scrollbar">
          {messages.length === 0 && (
            <div className="text-center py-6 animate-fade-in">
              <div className="w-16 h-16 mx-auto mb-4 bg-linear-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/30 dark:to-cyan-500/30 rounded-2xl flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-blue-500 dark:text-blue-400" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {packets.length === 0
                  ? 'Upload a capture file to start analyzing'
                  : 'Ask questions about your packet capture'}
              </p>
              {packets.length > 0 && (
                <div className="space-y-2">
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => setInput(q)}
                      className="block w-full text-left px-4 py-2.5 text-sm bg-gray-50/80 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-600/50 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200/50 dark:border-gray-600/50 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-linear-to-r from-blue-600 to-blue-500 text-white'
                    : 'bg-gray-50/80 dark:bg-gray-700/50 backdrop-blur-sm text-gray-900 dark:text-gray-100 border border-gray-200/50 dark:border-gray-600/50'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="text-sm">
                    <FormattedAIResponse content={msg.content} onPacketClick={onPacketClick} />
                    {msg.metadata?.contextMethod === 'sampling' && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-lg px-2.5 py-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Limited context:</strong> Random sampling used. Results may be incomplete.
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                )}
                <p className="text-xs mt-2 opacity-60">
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {/* Modern Typing Indicator */}
          {loading && (
            <div className="flex justify-start animate-message-in">
              <div className="bg-gray-50/80 dark:bg-gray-700/50 backdrop-blur-sm rounded-2xl px-4 py-3 border border-gray-200/50 dark:border-gray-600/50">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">SharkAI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Modern Input Area */}
        <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
          <div className="flex items-center gap-3">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
                title="Clear chat"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <div className="flex-1 relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder={
                  packets.length === 0 ? 'Upload a file first...' : 'Ask SharkAI anything...'
                }
                disabled={loading || packets.length === 0}
                className="w-full px-4 py-3 text-sm border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed placeholder-gray-400 dark:placeholder-gray-500 transition-all duration-200"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading || packets.length === 0}
              className="p-3 bg-linear-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg hover:scale-105 disabled:from-gray-400 disabled:to-gray-500 dark:disabled:from-gray-600 dark:disabled:to-gray-700 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-200"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
