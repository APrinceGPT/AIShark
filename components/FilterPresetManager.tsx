/**
 * Filter Preset Manager Component
 * UI for saving, loading, and managing filter presets
 */

'use client';

import { useState, useEffect } from 'react';
import { Save, Trash2, Download, Upload, Star, Clock, X } from 'lucide-react';
import { AdvancedFilter, getFilterSummary } from '@/lib/filter-engine';
import {
  FilterPreset,
  loadPresets,
  savePreset,
  deletePreset,
  incrementUseCount,
  exportPresets,
  importPresets,
  BUILTIN_PRESETS,
} from '@/lib/filter-presets';
import { toast } from './ToastContainer';

interface FilterPresetManagerProps {
  currentFilter: AdvancedFilter;
  onApplyPreset: (filter: AdvancedFilter) => void;
  onClose: () => void;
}

export default function FilterPresetManager({
  currentFilter,
  onApplyPreset,
  onClose,
}: FilterPresetManagerProps) {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDescription, setSaveDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    refreshPresets();
  }, []);

  const refreshPresets = () => {
    setPresets(loadPresets());
  };

  const handleSave = () => {
    if (!saveName.trim()) {
      toast.error('Please enter a preset name');
      return;
    }

    try {
      savePreset(saveName, currentFilter, saveDescription);
      toast.success(`Preset "${saveName}" saved successfully`);
      setSaveName('');
      setSaveDescription('');
      setShowSaveDialog(false);
      refreshPresets();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save preset');
    }
  };

  const handleApply = (preset: FilterPreset) => {
    incrementUseCount(preset.id);
    onApplyPreset(preset.filter);
    toast.success(`Applied preset: ${preset.name}`);
    onClose();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete preset "${name}"?`)) {
      deletePreset(id);
      toast.success('Preset deleted');
      refreshPresets();
    }
  };

  const handleExport = () => {
    const json = exportPresets();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aishark-filter-presets-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Presets exported');
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const json = event.target?.result as string;
        const result = importPresets(json);
        
        if (result.success > 0) {
          toast.success(`Imported ${result.success} preset(s)`);
          refreshPresets();
        }
        
        if (result.errors.length > 0) {
          toast.error(`${result.errors.length} error(s): ${result.errors[0]}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const filteredPresets = searchQuery
    ? presets.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : presets;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Filter Presets</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <button
            onClick={() => setShowSaveDialog(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4" />
            Save Current Filter
          </button>
          
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>

          <input
            type="text"
            placeholder="Search presets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ml-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
          />
        </div>

        {/* Save Dialog */}
        {showSaveDialog && (
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30">
            <h3 className="font-semibold mb-2 text-gray-900 dark:text-white">Save Current Filter</h3>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Preset name *"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                autoFocus
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Filter: {getFilterSummary(currentFilter)}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Preset List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Built-in Presets */}
          {!searchQuery && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Built-in Presets
              </h3>
              <div className="space-y-2">
                {BUILTIN_PRESETS.map((preset, index) => (
                  <div
                    key={`builtin-${index}`}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onApplyPreset(preset.filter)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="font-medium text-gray-900 dark:text-white">{preset.name}</span>
                        </div>
                        {preset.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{preset.description}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {getFilterSummary(preset.filter)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* User Presets */}
          {filteredPresets.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                My Presets ({filteredPresets.length})
              </h3>
              <div className="space-y-2">
                {filteredPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 dark:text-white">{preset.name}</span>
                          {preset.useCount > 0 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              Used {preset.useCount}x
                            </span>
                          )}
                        </div>
                        {preset.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{preset.description}</p>
                        )}
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {getFilterSummary(preset.filter)}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 mt-2">
                          <Clock className="w-3 h-3" />
                          {new Date(preset.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          onClick={() => handleApply(preset)}
                          className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleDelete(preset.id, preset.name)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          aria-label="Delete preset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredPresets.length === 0 && presets.length > 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No presets match your search
            </div>
          )}

          {presets.length === 0 && !searchQuery && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No saved presets. Save your current filter to get started!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
