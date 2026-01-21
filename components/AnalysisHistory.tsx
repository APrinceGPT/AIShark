'use client';

import { useState, useEffect } from 'react';
import { Search, Trash2, Share2, Calendar, FileText, Filter, SortAsc, SortDesc, X, ArrowLeftRight, Download } from 'lucide-react';
import { SessionWithDetails } from '@/types/database';
import { listSessions, deleteSession, loadSession } from '@/lib/session-manager';
import { useAuth } from '@/lib/auth-context';
import { toast } from './ToastContainer';
import ShareSessionDialog from './ShareSessionDialog';
import { SessionComparison } from './SessionComparison';
import { generatePDF, downloadPDF } from '@/lib/pdf-export';

interface AnalysisHistoryProps {
  onLoadSession: (sessionId: string) => void;
  onClose: () => void;
}

type SortField = 'date' | 'name' | 'size' | 'packets';
type SortOrder = 'asc' | 'desc';
type DateFilter = 'all' | '7days' | '30days';
type SizeFilter = 'all' | 'small' | 'medium' | 'large';

export default function AnalysisHistory({ onLoadSession, onClose }: AnalysisHistoryProps) {
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<SessionWithDetails[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<{ id: string; name: string } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Sorting and filtering states
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [sizeFilter, setSizeFilter] = useState<SizeFilter>('all');
  
  // Comparison states
  const [comparisonMode, setComparisonMode] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  const { user } = useAuth();

  useEffect(() => {
    loadSessions();
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [searchTerm, sessions, sortField, sortOrder, dateFilter, sizeFilter]);

  const applyFiltersAndSort = () => {
    let filtered = [...sessions];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(term) ||
          s.file_name.toLowerCase().includes(term)
      );
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const cutoffDate = new Date();
      if (dateFilter === '7days') {
        cutoffDate.setDate(now.getDate() - 7);
      } else if (dateFilter === '30days') {
        cutoffDate.setDate(now.getDate() - 30);
      }
      filtered = filtered.filter((s) => new Date(s.created_at) >= cutoffDate);
    }

    // Size filter
    if (sizeFilter !== 'all') {
      const oneMB = 1024 * 1024;
      const tenMB = 10 * 1024 * 1024;
      filtered = filtered.filter((s) => {
        if (sizeFilter === 'small') return s.file_size < oneMB;
        if (sizeFilter === 'medium') return s.file_size >= oneMB && s.file_size <= tenMB;
        if (sizeFilter === 'large') return s.file_size > tenMB;
        return true;
      });
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case 'date':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.file_size - b.file_size;
          break;
        case 'packets':
          comparison = a.packet_count - b.packet_count;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredSessions(filtered);
  };

  const loadSessions = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const data = await listSessions(user.id);
      setSessions(data);
      setFilteredSessions(data);
    } catch (error) {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sessionId: string, sessionName: string) => {
    if (!user) return;

    if (!confirm(`Delete session "${sessionName}"?`)) return;

    const success = await deleteSession(sessionId, user.id);
    if (success) {
      toast.success('Session deleted');
      setSessions(sessions.filter((s) => s.id !== sessionId));
    } else {
      toast.error('Failed to delete session');
    }
  };

  const handleShareClick = (sessionId: string, sessionName: string) => {
    setSelectedSession({ id: sessionId, name: sessionName });
    setShareDialogOpen(true);
  };

  const toggleComparisonMode = () => {
    setComparisonMode(!comparisonMode);
    setSelectedForComparison([]);
  };

  const handleSelectForComparison = (sessionId: string) => {
    if (selectedForComparison.includes(sessionId)) {
      setSelectedForComparison(selectedForComparison.filter((id) => id !== sessionId));
    } else if (selectedForComparison.length < 2) {
      setSelectedForComparison([...selectedForComparison, sessionId]);
    } else {
      toast.error('You can only compare 2 sessions at a time');
    }
  };

  const handleCompare = () => {
    if (selectedForComparison.length !== 2) {
      toast.error('Please select exactly 2 sessions to compare');
      return;
    }
    setShowComparison(true);
  };

  const handleExportPDF = async (sessionId: string, sessionName: string) => {
    if (!user) return;

    toast.success('Generating PDF...');
    try {
      const sessionData = await loadSession(sessionId);
      if (!sessionData) {
        toast.error('Failed to load session data');
        return;
      }

      const pdfBlob = await generatePDF({
        session: sessionData.session,
        statistics: sessionData.statistics as any,
        insights: sessionData.insights,
      });

      const filename = `${sessionName.replace(/[^a-zA-Z0-9]/g, '_')}_Analysis_Report.pdf`;
      downloadPDF(pdfBlob, filename);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to generate PDF');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Analysis History</h2>
              <p className="text-sm text-gray-500 mt-1">
                {sessions.length} session{sessions.length !== 1 ? 's' : ''} saved
              </p>
            </div>
            <div className="flex items-center gap-3">
              {comparisonMode && (
                <button
                  onClick={handleCompare}
                  disabled={selectedForComparison.length !== 2}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    selectedForComparison.length === 2
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Compare ({selectedForComparison.length}/2)
                </button>
              )}
              <button
                onClick={toggleComparisonMode}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  comparisonMode
                    ? 'bg-red-50 border-2 border-red-500 text-red-700'
                    : 'bg-gray-100 border-2 border-gray-300 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <ArrowLeftRight className="w-4 h-4" />
                {comparisonMode ? 'Cancel' : 'Compare'}
              </button>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="p-4 border-b space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search sessions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
                  showFilters ? 'bg-blue-50 border-blue-500 text-blue-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>

            {showFilters && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Sort Field */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sort By</label>
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value as SortField)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="date">Date</option>
                      <option value="name">Name</option>
                      <option value="size">Size</option>
                      <option value="packets">Packets</option>
                    </select>
                  </div>

                  {/* Sort Order */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Order</label>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-white transition-colors flex items-center justify-center gap-2"
                    >
                      {sortOrder === 'asc' ? (
                        <>
                          <SortAsc className="w-4 h-4" />
                          Ascending
                        </>
                      ) : (
                        <>
                          <SortDesc className="w-4 h-4" />
                          Descending
                        </>
                      )}
                    </button>
                  </div>

                  {/* Date Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date Range</label>
                    <select
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Time</option>
                      <option value="7days">Last 7 Days</option>
                      <option value="30days">Last 30 Days</option>
                    </select>
                  </div>

                  {/* Size Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">File Size</label>
                    <select
                      value={sizeFilter}
                      onChange={(e) => setSizeFilter(e.target.value as SizeFilter)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">All Sizes</option>
                      <option value="small">Small (&lt;1MB)</option>
                      <option value="medium">Medium (1-10MB)</option>
                      <option value="large">Large (&gt;10MB)</option>
                    </select>
                  </div>
                </div>

                {/* Clear Filters */}
                {(sortField !== 'date' || sortOrder !== 'desc' || dateFilter !== 'all' || sizeFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSortField('date');
                      setSortOrder('desc');
                      setDateFilter('all');
                      setSizeFilter('all');
                    }}
                    className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">
                  {searchTerm ? 'No sessions found' : 'No saved sessions yet'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredSessions.map((session) => {
                  const isSelected = selectedForComparison.includes(session.id);
                  return (
                    <div
                      key={session.id}
                      className={`border rounded-lg p-4 transition-all ${
                        comparisonMode
                          ? isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300 cursor-pointer'
                          : 'border-gray-200 hover:border-blue-300'
                      }`}
                      onClick={() => comparisonMode && handleSelectForComparison(session.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {comparisonMode && (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleSelectForComparison(session.id)}
                              className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              onClick={(e) => e.stopPropagation()}
                            />
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{session.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{session.file_name}</p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(session.created_at)}
                              </span>
                              <span>{formatFileSize(session.file_size)}</span>
                              <span>{session.packet_count.toLocaleString()} packets</span>
                            </div>
                          </div>
                        </div>
                        {!comparisonMode && (
                          <div className="flex items-center gap-2 ml-4">
                            <button
                              onClick={() => {
                                onLoadSession(session.id);
                                onClose();
                              }}
                              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleShareClick(session.id, session.name)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                              title="Share"
                            >
                              <Share2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleExportPDF(session.id, session.name)}
                              className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                              title="Export PDF"
                            >
                              <Download className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(session.id, session.name)}
                              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Dialog */}
      {selectedSession && (
        <ShareSessionDialog
          isOpen={shareDialogOpen}
          onClose={() => {
            setShareDialogOpen(false);
            setSelectedSession(null);
          }}
          sessionId={selectedSession.id}
          sessionName={selectedSession.name}
        />
      )}

      {/* Comparison Dialog */}
      {showComparison && selectedForComparison.length === 2 && (
        <SessionComparison
          session1Id={selectedForComparison[0]}
          session2Id={selectedForComparison[1]}
          onClose={() => {
            setShowComparison(false);
            setComparisonMode(false);
            setSelectedForComparison([]);
          }}
        />
      )}
    </>
  );
}
