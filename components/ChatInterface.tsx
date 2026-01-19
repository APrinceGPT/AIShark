import { useState, useRef, useEffect } from 'react';
import { Packet, PacketStatistics, AnalysisResult } from '@/types/packet';

interface ChatInterfaceProps {
  packets: Packet[];
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export default function ChatInterface({ packets, statistics, analysis }: ChatInterfaceProps) {
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
    if (!input.trim() || loading || packets.length === 0) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/analyze/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: input,
          packets,
          statistics,
          analysis,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          role: 'assistant',
          content: data.answer,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        const errorMessage: Message = {
          role: 'assistant',
          content: `Error: ${data.error}`,
          timestamp: Date.now(),
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (err) {
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Network error: Failed to get response',
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, errorMessage]);
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

  const quickQuestions = [
    'Why is this connection slow?',
    'Are there any security concerns?',
    'What\'s causing the packet loss?',
    'Explain the TLS handshake errors',
  ];

  return (
    <div className="bg-white rounded-lg shadow flex flex-col h-[600px]">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">💬 Ask AI</h2>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear Chat
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              Ask questions about your packet capture
            </p>
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-2">Quick questions:</p>
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => setInput(q)}
                  disabled={packets.length === 0}
                  className="block w-full text-left px-4 py-2 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
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
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              <p className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
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
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading || packets.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
