/**
 * Filter Preset Management
 * Save, load, and manage reusable filter configurations
 */

import { AdvancedFilter } from './filter-engine';

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filter: AdvancedFilter;
  createdAt: number;
  updatedAt: number;
  useCount: number;
}

const STORAGE_KEY = 'aishark_filter_presets';
const MAX_PRESETS = 50;

/**
 * Load all filter presets from localStorage
 */
export function loadPresets(): FilterPreset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const presets = JSON.parse(stored) as FilterPreset[];
    return presets.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error('Failed to load filter presets:', error);
    return [];
  }
}

/**
 * Save a new filter preset
 */
export function savePreset(
  name: string, 
  filter: AdvancedFilter,
  description?: string
): FilterPreset {
  const presets = loadPresets();
  
  // Check if preset limit reached
  if (presets.length >= MAX_PRESETS) {
    throw new Error(`Maximum ${MAX_PRESETS} presets allowed. Please delete unused presets.`);
  }

  // Check for duplicate names
  const existingIndex = presets.findIndex(p => p.name.toLowerCase() === name.toLowerCase());
  
  const now = Date.now();
  const preset: FilterPreset = {
    id: existingIndex >= 0 ? presets[existingIndex].id : generateId(),
    name,
    description,
    filter: { ...filter },
    createdAt: existingIndex >= 0 ? presets[existingIndex].createdAt : now,
    updatedAt: now,
    useCount: existingIndex >= 0 ? presets[existingIndex].useCount : 0,
  };

  if (existingIndex >= 0) {
    // Update existing preset
    presets[existingIndex] = preset;
  } else {
    // Add new preset
    presets.unshift(preset);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  return preset;
}

/**
 * Delete a filter preset
 */
export function deletePreset(id: string): void {
  const presets = loadPresets();
  const filtered = presets.filter(p => p.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get a specific preset by ID
 */
export function getPreset(id: string): FilterPreset | null {
  const presets = loadPresets();
  return presets.find(p => p.id === id) || null;
}

/**
 * Increment use count when preset is applied
 */
export function incrementUseCount(id: string): void {
  const presets = loadPresets();
  const preset = presets.find(p => p.id === id);
  
  if (preset) {
    preset.useCount++;
    preset.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  }
}

/**
 * Export presets as JSON
 */
export function exportPresets(): string {
  const presets = loadPresets();
  return JSON.stringify(presets, null, 2);
}

/**
 * Import presets from JSON
 */
export function importPresets(json: string): { success: number; errors: string[] } {
  const errors: string[] = [];
  let success = 0;

  try {
    const imported = JSON.parse(json) as FilterPreset[];
    
    if (!Array.isArray(imported)) {
      throw new Error('Invalid format: expected array of presets');
    }

    const existing = loadPresets();
    const merged = [...existing];

    for (const preset of imported) {
      // Validate preset structure
      if (!preset.name || !preset.filter) {
        errors.push(`Invalid preset: ${preset.name || 'unnamed'}`);
        continue;
      }

      // Check for duplicates
      const existingIndex = merged.findIndex(p => p.name === preset.name);
      if (existingIndex >= 0) {
        errors.push(`Preset "${preset.name}" already exists - skipped`);
        continue;
      }

      // Add preset with new ID
      merged.push({
        ...preset,
        id: generateId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      success++;
    }

    if (success > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    return { success, errors };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown import error');
    return { success: 0, errors };
  }
}

/**
 * Get popular/frequently used presets
 */
export function getPopularPresets(limit: number = 5): FilterPreset[] {
  const presets = loadPresets();
  return presets
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, limit);
}

/**
 * Search presets by name or description
 */
export function searchPresets(query: string): FilterPreset[] {
  const presets = loadPresets();
  const lowerQuery = query.toLowerCase();
  
  return presets.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) ||
    p.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Generate unique ID
 */
function generateId(): string {
  return `preset_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Default/Built-in presets
 */
export const BUILTIN_PRESETS: Omit<FilterPreset, 'id' | 'createdAt' | 'updatedAt' | 'useCount'>[] = [
  {
    name: 'HTTP Errors',
    description: 'Show HTTP 4xx and 5xx responses',
    filter: {
      protocols: ['HTTP'],
      hasErrors: true,
      logicMode: 'AND',
    },
  },
  {
    name: 'DNS Failures',
    description: 'Show failed DNS queries',
    filter: {
      protocols: ['DNS'],
      hasErrors: true,
      logicMode: 'AND',
    },
  },
  {
    name: 'TCP Retransmissions',
    description: 'Show packets with retransmissions',
    filter: {
      protocols: ['TCP'],
      hasErrors: true,
      logicMode: 'AND',
    },
  },
  {
    name: 'TLS Handshakes',
    description: 'Show TLS/SSL connection setup',
    filter: {
      protocols: ['TLS'],
      searchTerm: 'handshake',
      logicMode: 'AND',
    },
  },
  {
    name: 'Large Packets',
    description: 'Packets larger than 1000 bytes',
    filter: {
      protocols: [],
      // Note: Size filter would need to be added to AdvancedFilter interface
      logicMode: 'AND',
    },
  },
  {
    name: 'SYN Scan Detection',
    description: 'Show SYN packets without ACK',
    filter: {
      protocols: ['TCP'],
      tcpFlags: ['SYN'],
      logicMode: 'AND',
    },
  },
];
