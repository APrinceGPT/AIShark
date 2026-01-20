'use client';

import { useState } from 'react';
import { Packet } from '@/types/packet';
import { Sparkles, Search, X, Loader2 } from 'lucide-react';
import { toast } from './ToastContainer';

interface AISemanticSearchProps {
  allPackets: Packet[];
  onSearchResults: (packetIds: number[], explanation: string) => void;
  onClearSearch: () => void;
}

interface SearchResult {
  matchingPacketIds: number[];
  explanation: string;
  count: number;
}

export default function AISemanticSearch({ 
  allPackets, 
  onSearchResults,
  onClearSearch 
}: AISemanticSearchProps) {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [lastResult, setLastResult] = useState<SearchResult | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!query.trim() || allPackets.length === 0) {
      toast.error('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setShowResults(false);

    try {
      const response = await fetch('/api/analyze/semantic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query.trim(),
          packets: allPackets,
        }),
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const result: SearchResult = await response.json();
      
      setLastResult(result);
      setShowResults(true);
      
      if (result.count === 0) {
        toast.info('No packets found matching your query');
        onClearSearch();
      } else {
        toast.success(`Found ${result.count} matching packets`);
        onSearchResults(result.matchingPacketIds, result.explanation);
      }
    } catch (error) {
      console.error('AI search error:', error);
      toast.error('AI search failed. Please try again.');
      setLastResult(null);
    } finally {
      setIsSearching(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setLastResult(null);
    setShowResults(false);
    onClearSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-b border-purple-200 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          {/* Icon and Label */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span className="text-sm font-semibold text-purple-900">AI Search:</span>
          </div>

          {/* Search Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Try: "find all HTTP errors" or "show DNS failures" or "retransmissions"'
              disabled={isSearching || allPackets.length === 0}
              className="w-full px-4 py-2 pr-10 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed text-sm"
            />
            {query && !isSearching && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                aria-label="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isSearching || !query.trim() || allPackets.length === 0}
            className="px-5 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium text-sm"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                Search
              </>
            )}
          </button>

          {/* Clear Results Button */}
          {showResults && lastResult && lastResult.count > 0 && (
            <button
              onClick={handleClear}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 text-sm"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}
        </div>

        {/* Results Banner */}
        {showResults && lastResult && lastResult.count > 0 && (
          <div className="mt-3 bg-white border-2 border-purple-300 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <Search className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-sm text-purple-900">
                  Found {lastResult.count} packet{lastResult.count !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-gray-700 mt-1">
                  {lastResult.explanation}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Help Text */}
        {!showResults && (
          <div className="mt-2 text-xs text-purple-700">
            💡 Use natural language to search packets. Examples: "large file transfers", "failed connections", "packets to port 443"
          </div>
        )}
      </div>
    </div>
  );
}
