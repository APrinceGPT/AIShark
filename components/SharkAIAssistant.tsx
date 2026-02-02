'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { X, Minus, Maximize2, Minimize2, Send, Trash2, GripHorizontal } from 'lucide-react';
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
}

interface Position {
  x: number;
  y: number;
}

const DEFAULT_WIDTH = 400;
const DEFAULT_HEIGHT = 500;
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

  // Minimized state - show only header bar
  if (isMinimized) {
    return (
      <div
        ref={containerRef}
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        style={{
          left: position.x,
          top: position.y,
          width: 200,
        }}
      >
        <div
          className="flex items-center justify-between px-3 py-2 bg-blue-600 cursor-move select-none"
          onMouseDown={handleMouseDown}
        >
          <span className="text-white font-medium text-sm flex items-center gap-1">
            🦈 SharkAI
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 hover:bg-white/20 rounded"
              title="Restore"
            >
              <Maximize2 className="w-3.5 h-3.5 text-white" />
            </button>
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/20 rounded"
              title="Close"
            >
              <X className="w-3.5 h-3.5 text-white" />
            </button>
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
      className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden"
      style={containerStyle}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-blue-600 cursor-move select-none shrink-0"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-white/70" />
          <span className="text-white font-semibold flex items-center gap-1.5">
            🦈 SharkAI
          </span>
          {selectedPacket && (
            <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded">
              Packet #{selectedPacket.id + 1}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Minimize"
          >
            <Minus className="w-4 h-4 text-white" />
          </button>
          <button
            onClick={toggleMaximize}
            className="p-1 hover:bg-white/20 rounded transition-colors"
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
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Context Bar */}
      {selectedPacket && (
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-800 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-blue-700 dark:text-blue-300 truncate">
              {selectedPacket.protocol}: {selectedPacket.source} → {selectedPacket.destination}
            </span>
            <button
              onClick={askAboutPacket}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors shrink-0"
            >
              Ask about this
            </button>
          </div>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">
              {packets.length === 0
                ? 'Upload a capture file to start analyzing'
                : 'Ask questions about your packet capture'}
            </p>
            {packets.length > 0 && (
              <div className="space-y-1.5">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="block w-full text-left px-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
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
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                <div className="text-sm">
                  <FormattedAIResponse content={msg.content} onPacketClick={onPacketClick} />
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
              )}
              <p className="text-xs mt-1 opacity-60">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:100ms]" />
                <div className="w-1.5 h-1.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce [animation-delay:200ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              title="Clear chat"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={
              packets.length === 0 ? 'Upload a file first...' : 'Ask SharkAI...'
            }
            disabled={loading || packets.length === 0}
            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || packets.length === 0}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            title="Send message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
