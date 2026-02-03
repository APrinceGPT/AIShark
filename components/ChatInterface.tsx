import { useState, useRef, useEffect } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { aiCache } from '@/lib/ai-cache';
import { toast } from './ToastContainer';
import FormattedAIResponse from './FormattedAIResponse';

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
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatInterface({ packets, statistics, analysis, onPacketClick, sessionId }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    } catch (err) {
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
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex flex-col h-150">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">💬 Ask AI</h2>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Ask questions about your packet capture
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">Quick questions:</p>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  disabled={packets.length === 0}
                  className="block w-full text-left px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
              }`}
            >
              {msg.role === 'assistant' ? (
                <FormattedAIResponse content={msg.content} onPacketClick={onPacketClick} />
              ) : (
                <p className="whitespace-pre-wrap">{msg.content}</p>
              )}
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={
              packets.length === 0
                ? 'Upload a capture file first...'
                : 'Ask a question about your capture...'
            }
            disabled={loading || packets.length === 0}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed placeholder-gray-500 dark:placeholder-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || packets.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
