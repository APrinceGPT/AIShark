'use client';

import { useState, forwardRef } from 'react';
import { PacketFilter } from '@/types/packet';

interface FilterBarProps {
  onFilterChange: (filter: PacketFilter) => void;
  protocolCounts: Record<string, number>;
}

const FilterBar = forwardRef<HTMLInputElement, FilterBarProps>(
  ({ onFilterChange, protocolCounts }, ref) => {
  const [activeProtocols, setActiveProtocols] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceIP, setSourceIP] = useState('');
  const [destIP, setDestIP] = useState('');

  const commonProtocols = ['HTTP', 'HTTPS', 'DNS', 'TCP', 'UDP', 'TLS'];

  const handleProtocolToggle = (protocol: string) => {
    const newProtocols = activeProtocols.includes(protocol)
      ? activeProtocols.filter(p => p !== protocol)
      : [...activeProtocols, protocol];
    
    setActiveProtocols(newProtocols);
    updateFilter({ protocols: newProtocols });
  };

  const handleClearFilters = () => {
    setActiveProtocols([]);
    setSearchTerm('');
    setSourceIP('');
    setDestIP('');
    onFilterChange({ protocols: [] });
  };

  const updateFilter = (updates: Partial<PacketFilter>) => {
    onFilterChange({
      protocols: activeProtocols,
      searchTerm: searchTerm || undefined,
      sourceIP: sourceIP || undefined,
      destinationIP: destIP || undefined,
      ...updates,
    });
  };

  return (
    <div className="bg-white border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Quick Protocol Filters */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 self-center mr-2">
            Quick Filters:
          </span>
          {commonProtocols.map(protocol => {
            const count = protocolCounts[protocol] || 0;
            const isActive = activeProtocols.includes(protocol);
            
            return (
              <button
                key={protocol}
                onClick={() => handleProtocolToggle(protocol)}
                disabled={count === 0}
                aria-label={`Filter by ${protocol} protocol${count > 0 ? ` (${count} packets)` : ''}`}
                aria-pressed={isActive}
                className={`
                  px-3 py-1 rounded-full text-sm font-medium transition-colors
                  ${isActive 
                    ? 'bg-blue-500 text-white' 
                    : count > 0 
                      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                      : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {protocol} {count > 0 && `(${count})`}
              </button>
            );
          })}
          
          {activeProtocols.length > 0 && (
            <button
              onClick={handleClearFilters}
              aria-label="Clear all filters"
              className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 hover:bg-red-200"
            >
              Clear All
            </button>
          )}
        </div>

        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <input
              ref={ref}
              type="text"
              placeholder="Search (IP, port, content...)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                updateFilter({ searchTerm: e.target.value });
              }}
              aria-label="Search packets by IP, port, or content"
              className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <input
            type="text"
            placeholder="Source IP"
            value={sourceIP}
            onChange={(e) => {
              setSourceIP(e.target.value);
              updateFilter({ sourceIP: e.target.value });
            }}
            aria-label="Filter by source IP address"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <input
            type="text"
            placeholder="Destination IP"
            value={destIP}
            onChange={(e) => {
              setDestIP(e.target.value);
              updateFilter({ destinationIP: e.target.value });
            }}
            aria-label="Filter by destination IP address"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
});

FilterBar.displayName = 'FilterBar';

export default FilterBar;
