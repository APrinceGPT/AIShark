/**
 * Advanced Filter Bar Component
 * Enhanced filtering with regex, TCP flags, error filtering, and presets
 */

'use client';

import { useState, forwardRef } from 'react';
import { Settings, BookmarkPlus, AlertCircle, Filter as FilterIcon } from 'lucide-react';
import { AdvancedFilter, validateRegexPattern, getFilterSummary, isFilterEmpty } from '@/lib/filter-engine';
import FilterPresetManager from './FilterPresetManager';

interface AdvancedFilterBarProps {
  onFilterChange: (filter: AdvancedFilter) => void;
  protocolCounts: Record<string, number>;
}

const AdvancedFilterBar = forwardRef<HTMLInputElement, AdvancedFilterBarProps>(
  ({ onFilterChange, protocolCounts }, ref) => {
  const [activeProtocols, setActiveProtocols] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sourceIP, setSourceIP] = useState('');
  const [destIP, setDestIP] = useState('');
  
  // Advanced filter states
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [regexPattern, setRegexPattern] = useState('');
  const [regexField, setRegexField] = useState<'source' | 'destination' | 'info' | 'protocol' | 'payload'>('info');
  const [regexFlags, setRegexFlags] = useState('i');
  const [regexError, setRegexError] = useState('');
  const [hasErrors, setHasErrors] = useState(false);
  const [tcpFlags, setTcpFlags] = useState<string[]>([]);
  const [sourcePort, setSourcePort] = useState('');
  const [destPort, setDestPort] = useState('');
  
  // Preset manager
  const [showPresetManager, setShowPresetManager] = useState(false);

  const commonProtocols = ['HTTP', 'HTTPS', 'DNS', 'TCP', 'UDP', 'TLS'];
  const tcpFlagOptions = ['SYN', 'ACK', 'FIN', 'RST', 'PSH', 'URG'];

  const handleProtocolToggle = (protocol: string) => {
    const newProtocols = activeProtocols.includes(protocol)
      ? activeProtocols.filter(p => p !== protocol)
      : [...activeProtocols, protocol];
    
    setActiveProtocols(newProtocols);
    updateFilter({ protocols: newProtocols });
  };

  const handleTcpFlagToggle = (flag: string) => {
    const newFlags = tcpFlags.includes(flag)
      ? tcpFlags.filter(f => f !== flag)
      : [...tcpFlags, flag];
    
    setTcpFlags(newFlags);
    updateFilter({ tcpFlags: newFlags.length > 0 ? newFlags : undefined });
  };

  const handleRegexChange = (pattern: string) => {
    setRegexPattern(pattern);
    
    if (pattern.trim() === '') {
      setRegexError('');
      updateFilter({ regexPattern: undefined, regexField: undefined, regexFlags: undefined });
      return;
    }

    const validation = validateRegexPattern(pattern);
    if (!validation.valid) {
      setRegexError(validation.error || 'Invalid pattern');
      return;
    }

    setRegexError('');
    updateFilter({ 
      regexPattern: pattern, 
      regexField, 
      regexFlags 
    });
  };

  const handleClearFilters = () => {
    setActiveProtocols([]);
    setSearchTerm('');
    setSourceIP('');
    setDestIP('');
    setRegexPattern('');
    setRegexError('');
    setHasErrors(false);
    setTcpFlags([]);
    setSourcePort('');
    setDestPort('');
    onFilterChange({ protocols: [] });
  };

  const updateFilter = (updates: Partial<AdvancedFilter>) => {
    const filter: AdvancedFilter = {
      protocols: activeProtocols,
      searchTerm: searchTerm || undefined,
      sourceIP: sourceIP || undefined,
      destinationIP: destIP || undefined,
      sourcePort: sourcePort ? parseInt(sourcePort) : undefined,
      destinationPort: destPort ? parseInt(destPort) : undefined,
      regexPattern: regexPattern || undefined,
      regexField: regexPattern ? regexField : undefined,
      regexFlags: regexPattern ? regexFlags : undefined,
      hasErrors: hasErrors || undefined,
      tcpFlags: tcpFlags.length > 0 ? tcpFlags : undefined,
      ...updates,
    };
    onFilterChange(filter);
  };

  const getCurrentFilter = (): AdvancedFilter => ({
    protocols: activeProtocols,
    searchTerm: searchTerm || undefined,
    sourceIP: sourceIP || undefined,
    destinationIP: destIP || undefined,
    sourcePort: sourcePort ? parseInt(sourcePort) : undefined,
    destinationPort: destPort ? parseInt(destPort) : undefined,
    regexPattern: regexPattern || undefined,
    regexField: regexPattern ? regexField : undefined,
    regexFlags: regexPattern ? regexFlags : undefined,
    hasErrors: hasErrors || undefined,
    tcpFlags: tcpFlags.length > 0 ? tcpFlags : undefined,
  });

  const handleApplyPreset = (filter: AdvancedFilter) => {
    // Apply preset to state
    setActiveProtocols(filter.protocols || []);
    setSearchTerm(filter.searchTerm || '');
    setSourceIP(filter.sourceIP || '');
    setDestIP(filter.destinationIP || '');
    setSourcePort(filter.sourcePort?.toString() || '');
    setDestPort(filter.destinationPort?.toString() || '');
    setRegexPattern(filter.regexPattern || '');
    setRegexField(filter.regexField || 'info');
    setRegexFlags(filter.regexFlags || 'i');
    setHasErrors(filter.hasErrors || false);
    setTcpFlags(filter.tcpFlags || []);
    
    // Apply filter
    onFilterChange(filter);
  };

  const filterSummary = getFilterSummary(getCurrentFilter());
  const isCurrentFilterEmpty = isFilterEmpty(getCurrentFilter());

  return (
    <>
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header with actions */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filters:</span>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPresetManager(true)}
                className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
                title="Manage filter presets"
              >
                <BookmarkPlus className="w-4 h-4" />
                Presets
              </button>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center gap-1 px-3 py-1 text-sm rounded-md ${
                  showAdvanced ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
                title="Toggle advanced filters"
              >
                <Settings className="w-4 h-4" />
                Advanced
              </button>
            </div>
          </div>

          {/* Quick Protocol Filters */}
          <div className="flex flex-wrap gap-2">
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
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600' 
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }
                  `}
                >
                  {protocol} {count > 0 && `(${count})`}
                </button>
              );
            })}
            
            {!isCurrentFilterEmpty && (
              <button
                onClick={handleClearFilters}
                aria-label="Clear all filters"
                className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Basic Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
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
                className="w-full px-3 py-2 pl-10 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
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
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
            />

            <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600">
              <input
                type="checkbox"
                checked={hasErrors}
                onChange={(e) => {
                  setHasErrors(e.target.checked);
                  updateFilter({ hasErrors: e.target.checked || undefined });
                }}
                className="w-4 h-4 text-blue-600"
              />
              <AlertCircle className="w-4 h-4 text-red-500" />
              <span className="text-sm text-gray-900 dark:text-white">Errors Only</span>
            </label>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvanced && (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 space-y-4">
              <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300">Advanced Filters</h3>
              
              {/* Port Filters */}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Source Port"
                  value={sourcePort}
                  onChange={(e) => {
                    setSourcePort(e.target.value);
                    updateFilter({ sourcePort: e.target.value ? parseInt(e.target.value) : undefined });
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md placeholder-gray-500 dark:placeholder-gray-400"
                />
                <input
                  type="number"
                  placeholder="Destination Port"
                  value={destPort}
                  onChange={(e) => {
                    setDestPort(e.target.value);
                    updateFilter({ destinationPort: e.target.value ? parseInt(e.target.value) : undefined });
                  }}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Regex Filter */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Regex Pattern
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g., ^192\.168\.\d+\.\d+$"
                    value={regexPattern}
                    onChange={(e) => handleRegexChange(e.target.value)}
                    className={`flex-1 px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${
                      regexError ? 'border-red-300 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                  <select
                    value={regexField}
                    onChange={(e) => {
                      const field = e.target.value as typeof regexField;
                      setRegexField(field);
                      if (regexPattern) updateFilter({ regexField: field });
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                  >
                    <option value="info">Info</option>
                    <option value="source">Source</option>
                    <option value="destination">Destination</option>
                    <option value="protocol">Protocol</option>
                    <option value="payload">Payload</option>
                  </select>
                  <select
                    value={regexFlags}
                    onChange={(e) => {
                      setRegexFlags(e.target.value);
                      if (regexPattern) updateFilter({ regexFlags: e.target.value });
                    }}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md"
                  >
                    <option value="i">Case-insensitive</option>
                    <option value="">Case-sensitive</option>
                    <option value="ig">Global + insensitive</option>
                    <option value="g">Global</option>
                  </select>
                </div>
                {regexError && (
                  <p className="text-sm text-red-600 dark:text-red-400">{regexError}</p>
                )}
              </div>

              {/* TCP Flags */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  TCP Flags
                </label>
                <div className="flex flex-wrap gap-2">
                  {tcpFlagOptions.map(flag => (
                    <button
                      key={flag}
                      onClick={() => handleTcpFlagToggle(flag)}
                      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                        tcpFlags.includes(flag)
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500'
                      }`}
                    >
                      {flag}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Active Filter Summary */}
          {!isCurrentFilterEmpty && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded text-sm">
              <FilterIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-blue-900 dark:text-blue-200">{filterSummary}</span>
            </div>
          )}
        </div>
      </div>

      {/* Preset Manager Modal */}
      {showPresetManager && (
        <FilterPresetManager
          currentFilter={getCurrentFilter()}
          onApplyPreset={handleApplyPreset}
          onClose={() => setShowPresetManager(false)}
        />
      )}
    </>
  );
});

AdvancedFilterBar.displayName = 'AdvancedFilterBar';

export default AdvancedFilterBar;
