'use client';

import { useState, useEffect, useRef } from 'react';
import { Packet } from '@/types/packet';
import { aiCache } from '@/lib/ai-cache';
import { X, Sparkles, Loader2 } from 'lucide-react';
import FormattedAIResponse from './FormattedAIResponse';

interface AIPacketAssistantProps {
  selectedPacket: Packet | null;
  allPackets: Packet[];
}

export default function AIPacketAssistant({ 
  selectedPacket, 
  allPackets
}: AIPacketAssistantProps) {
  const [analysis, setAnalysis] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  const lastPacketId = useRef<number | null>(null);

  useEffect(() => {
    if (!selectedPacket) {
      setAnalysis('');
      setError('');
      return;
    }

    // Skip if same packet
    if (lastPacketId.current === selectedPacket.id) {
      return;
    }

    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Debounce: wait 1 second before analyzing
    debounceTimer.current = setTimeout(() => {
      analyzePacket(selectedPacket);
    }, 1000);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [selectedPacket]);

  const analyzePacket = async (selectedPacket: Packet) => {
    lastPacketId.current = selectedPacket.id;
    setLoading(true);
    setError('');

    try {
      // Check cache first
      const cacheKey = { packetId: selectedPacket.id };
      const cached = aiCache.get('/api/analyze/packet-context', cacheKey);

      if (cached) {
        setAnalysis(cached.analysis);
        setLoading(false);
        return;
      }

      // Find related packets (same conversation)
      const relatedPackets = findRelatedPackets(selectedPacket, allPackets);

      const response = await fetch('/api/analyze/packet-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packet: selectedPacket,
          relatedPackets,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        aiCache.set('/api/analyze/packet-context', cacheKey, data);
      } else {
        setError(data.error || 'Failed to analyze packet');
      }
    } catch (err) {
      setError('Network error analyzing packet');
      console.error('Packet analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Find packets in the same conversation (same endpoints)
  const findRelatedPackets = (selectedPacket: Packet, packets: Packet[]): Packet[] => {
    const related = packets.filter(p => 
      p.id !== selectedPacket.id &&
      (
        (p.source === selectedPacket.source && p.destination === selectedPacket.destination) ||
        (p.source === selectedPacket.destination && p.destination === selectedPacket.source)
      )
    );
    return related.slice(0, 5); // Limit to 5 related packets
  };

  if (!isVisible || !selectedPacket) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 z-[60]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">AI Assistant</h3>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          aria-label="Close AI assistant"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          Packet #{selectedPacket.id + 1} • {selectedPacket.protocol}
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing packet...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 p-3 rounded border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

        {!loading && !error && analysis && (
          <div className="text-sm">
            <FormattedAIResponse content={analysis} />
          </div>
        )}

        {!loading && !error && !analysis && (
          <div className="text-sm text-gray-500 dark:text-gray-400 italic">
            Analyzing packet...
          </div>
        )}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700">
        💡 Tip: AI analyzes packets after 1 second delay
      </div>
    </div>
  );
}
