'use client';

import { useState, useRef, useEffect } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { aiCache } from '@/lib/ai-cache';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';
import { RAGIndexingProgress } from '@/lib/use-packet-session';

// Help question detection (matches server-side logic)
const HELP_KEYWORDS = [
  'how to use', 'how do i use', 'how does this work', 'how does aishark work',
  'help', 'guide', 'tutorial', 'getting started', 'what can you do',
  'what features', 'what is aishark', 'what is this', 'explain the app',
  'how to upload', 'how to filter', 'how to export', 'how to save',
  'what formats', 'supported formats', 'file types', 'keyboard shortcuts',
  'dark mode', 'light mode', 'theme', 'sign in', 'login', 'account',
  'your capabilities', 'what can i ask', 'what questions',
  'project', 'about this app', 'about aishark', 'documentation',
  'faq', 'frequently asked', 'tips', 'best practices'
];

function isHelpQuestion(question: string): boolean {
  const lowerQuestion = question.toLowerCase();
  return HELP_KEYWORDS.some(keyword => lowerQuestion.includes(keyword));
}

interface ChatInterfaceProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
  onPacketClick?: (packetId: number) => void;
  sessionId?: string | null;
  ragProgress?: RAGIndexingProgress;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  metadata?: {
    contextMethod?: 'rag';
    ragMatches?: number;
  };
}

export default function ChatInterface({ packets, statistics, analysis, onPacketClick, sessionId, ragProgress }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Check if RAG is ready (required for packet analysis)
  const isRAGReady = ragProgress?.isReady ?? false;
  const ragStatus = ragProgress?.status ?? 'idle';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const question = input.trim();
    const isHelp = isHelpQuestion(question);
    
    // Require packets for non-help questions
    if (!isHelp && packets.length === 0) {
      toast.error('Upload a packet capture first to ask analysis questions');
      return;
    }
    
    // Require RAG to be ready for non-help questions
    if (!isHelp && !isRAGReady && sessionId) {
      toast.error('Please wait for RAG indexing to complete before asking questions');
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Check cache first (only for packet analysis, not help)
      const cacheKey = { question, packets: packets.length, statistics, analysis };
      if (!isHelp) {
        const cached = aiCache.get('/api/analyze/query', cacheKey);
        
        if (cached) {
          const assistantMessage: Message = {
            role: 'assistant',
            content: cached.answer,
            timestamp: Date.now(),
          };
          setMessages(prev => [...prev, assistantMessage]);
          toast.info('Loaded from cache');
          setLoading(false);
          return;
        }
      }

      // For help questions, only send the question
      // For packet analysis, use sessionId if available (for large files), otherwise send packets
      const requestBody = isHelp
        ? { question }
        : sessionId
          ? { question, sessionId, statistics, analysis }
          : { question, packets, statistics, analysis };

      const response = await fetch('/api/analyze/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();
      
      // Handle RAG not ready (503 response)
      if (response.status === 503 && data.ragNotReady) {
        const errorMessage: Message = {
          role: 'assistant',
          content: `⏳ **RAG Indexing In Progress**\n\n${data.ragStatus?.message || 'Please wait for indexing to complete.'}\n\nCurrent progress: ${data.ragStatus?.percentage || 0}%`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
        toast.warning('RAG indexing is still in progress. Please wait.');
        setLoading(false);
        return;
      }

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

  // Quick questions for packet analysis
  const packetQuestions = [
    'Why is this connection slow?',
    'Are there any security concerns?',
    'What\'s causing the packet loss?',
    'Explain the TLS handshake errors',
  ];

  // Quick questions for help/guidance
  const helpQuestions = [
    'How do I use AIShark?',
    'What features are available?',
    'How do I filter packets?',
  ];

  // Combine both - show help questions when no packets loaded
  const quickQuestions = packets.length === 0 
    ? helpQuestions 
    : [...packetQuestions.slice(0, 3), helpQuestions[0]];

  return (
    <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm rounded-2xl shadow-xl shadow-gray-900/10 dark:shadow-black/30 border border-gray-200/50 dark:border-gray-700/50 flex flex-col h-150 transition-colors duration-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between bg-linear-to-r from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          <h2 className="text-xl font-bold gradient-text">Ask AI</h2>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 chat-scrollbar">
        {/* RAG Indexing Progress Bar */}
        {sessionId && !isRAGReady && ragStatus !== 'idle' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-4 animate-fade-in">
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="font-medium text-blue-700 dark:text-blue-300">
                RAG Indexing in Progress
              </span>
            </div>
            <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
              {ragProgress?.message || 'Processing packet embeddings...'}
            </p>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${ragProgress?.percentage || 0}%` }}
              />
            </div>
            <p className="text-xs text-blue-500 dark:text-blue-400 mt-2">
              {ragProgress?.percentage || 0}% complete • SharkAI will be available once indexing finishes
            </p>
          </div>
        )}
        
        {messages.length === 0 && (
          <div className="text-center py-8 animate-fade-in">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-linear-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-blue-500 dark:text-blue-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {packets.length === 0 
                ? 'Upload a packet capture to start analyzing'
                : sessionId && !isRAGReady
                  ? 'Wait for RAG indexing to complete, then ask questions'
                  : 'Ask questions about your packet capture'
              }
            </p>
            <div className="space-y-2 max-w-sm mx-auto">
              <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
                Quick questions
              </p>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  className="block w-full text-left px-4 py-3 text-sm bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl border border-gray-200/50 dark:border-gray-700/50 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md hover:shadow-blue-500/5 transition-all duration-200 hover:translate-x-1"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-message-in`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-linear-to-r from-blue-500 to-indigo-600 dark:from-blue-600 dark:to-indigo-700 text-white rounded-2xl rounded-br-md shadow-lg shadow-blue-500/20'
                  : 'bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 text-gray-900 dark:text-gray-100 rounded-2xl rounded-bl-md shadow-lg shadow-gray-900/5 dark:shadow-black/20'
              }`}
            >
              {msg.role === 'assistant' ? (
                <FormattedAIResponse content={msg.content} onPacketClick={onPacketClick} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-white/70' : 'text-gray-400 dark:text-gray-500'}`}>
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-message-in">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-lg shadow-gray-900/5 dark:shadow-black/20">
              <div className="flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full typing-dot" />
                  <span className="w-2 h-2 bg-blue-500 rounded-full typing-dot" />
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  SharkAI is thinking...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/50 dark:bg-gray-800/50 rounded-b-2xl">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              packets.length === 0
                ? 'Upload a capture file first...'
                : sessionId && !isRAGReady
                  ? 'Waiting for RAG indexing to complete...'
                  : 'Ask a question about your capture...'
            }
            disabled={loading || (sessionId !== null && !isRAGReady)}
            className="flex-1 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 dark:focus:border-blue-400 focus:shadow-lg focus:shadow-blue-500/10 disabled:bg-gray-100 dark:disabled:bg-gray-900 disabled:cursor-not-allowed transition-all duration-200"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || (sessionId !== null && !isRAGReady)}
            className="px-5 py-3 bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:active:scale-100 transition-all duration-200 flex items-center gap-2"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
