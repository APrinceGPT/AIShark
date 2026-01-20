'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import FileUpload from '@/components/FileUpload';
import FilterBar from '@/components/FilterBar';
import PacketList from '@/components/PacketList';
import PacketDetails from '@/components/PacketDetails';
import Statistics from '@/components/Statistics';
import AnalysisReport from '@/components/AnalysisReport';
import ExportTools from '@/components/ExportTools';
import AIInsights from '@/components/AIInsights';
import ChatInterface from '@/components/ChatInterface';
import CompareCaptures from '@/components/CompareCaptures';
import AuthModal from '@/components/AuthModal';
import UserProfile from '@/components/UserProfile';
import SaveSessionModal from '@/components/SaveSessionModal';
import AnalysisHistory from '@/components/AnalysisHistory';
import { toast } from '@/components/ToastContainer';
import { Packet, PacketFilter, PacketStatistics, AnalysisResult } from '@/types/packet';
import { enhancePackets, calculateStatistics, performAnalysis } from '@/lib/analyzer';
import { useAuth } from '@/lib/auth-context';
import { loadSession } from '@/lib/session-manager';
import { Save, History, LogIn } from 'lucide-react';

interface SessionData {
  sessionId?: string;
  isFromDatabase: boolean;
}

export default function Home() {
  const [allPackets, setAllPackets] = useState<Packet[]>([]);
  const [filteredPackets, setFilteredPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [statistics, setStatistics] = useState<PacketStatistics | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'packets' | 'statistics' | 'analysis' | 'ai-insights' | 'ai-chat' | 'compare'>('packets');
  const [protocolCounts, setProtocolCounts] = useState<Record<string, number>>({});
  
  // Auth and session management state
  const { user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [currentSession, setCurrentSession] = useState<SessionData>({ isFromDatabase: false });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  // Multi-capture state for comparison
  const [captures, setCaptures] = useState<Array<{
    name: string;
    packets: Packet[];
    statistics: PacketStatistics;
    analysis: AnalysisResult;
    timestamp: number;
  }>>([]);
  
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup worker on unmount
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    setUploadedFile(file);
    if (process.env.NODE_ENV === 'development') {
      console.group('AIShark PCAP File Upload');
      console.log('File Details:', {
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        type: file.type,
        lastModified: new Date(file.lastModified).toISOString(),
      });
    }

    setIsProcessing(true);
    setAllPackets([]);
    setFilteredPackets([]);
    setStatistics(null);
    setAnalysis(null);

    try {
      const startRead = performance.now();
      const arrayBuffer = await file.arrayBuffer();
      const readTime = performance.now() - startRead;
      
      if (process.env.NODE_ENV === 'development') {
        console.log('Reading file as ArrayBuffer...');
        console.log(`File read complete in ${readTime.toFixed(2)}ms`);
        console.log(`Buffer size: ${arrayBuffer.byteLength} bytes`);
        console.log('Creating Web Worker for parsing...');
      }
      workerRef.current = new Worker(
        new URL('../workers/pcap.worker.ts', import.meta.url),
        { type: 'module' }
      );

      const packets: Packet[] = [];
      const parseStartTime = performance.now();

      workerRef.current.onmessage = async (event) => {
        const { type, packets: chunk, total, current } = event.data;

        if (type === 'progress') {
          packets.push(...chunk);
          
          // Update UI periodically
          if (packets.length % 1000 === 0 || packets.length === total) {
            const enhanceStart = performance.now();
            const enhanced = enhancePackets([...packets]);
            const enhanceTime = performance.now() - enhanceStart;
            
            if (process.env.NODE_ENV === 'development') {
              console.log(`Progress: ${current}/${total} packets (${((current/total)*100).toFixed(1)}%)`);
              console.log('Enhancing packets with protocol analysis...');
              console.log(`Enhanced ${enhanced.length} packets in ${enhanceTime.toFixed(2)}ms`);
            }
            
            setAllPackets(enhanced);
            setFilteredPackets(enhanced);
            
            // Calculate protocol counts
            const counts: Record<string, number> = {};
            enhanced.forEach(p => {
              counts[p.protocol] = (counts[p.protocol] || 0) + 1;
            });
            setProtocolCounts(counts);
          }
        } else if (type === 'complete') {
          const parseTime = performance.now() - parseStartTime;
          
          if (process.env.NODE_ENV === 'development') {
            console.log(`Parsing complete in ${parseTime.toFixed(2)}ms`);
            console.log(`Total packets parsed: ${packets.length}`);
            console.log('Final enhancement pass...');
          }
          const enhanced = enhancePackets(packets);
          setAllPackets(enhanced);
          setFilteredPackets(enhanced);
          
          // Calculate statistics and perform analysis
          const statsStart = performance.now();
          const stats = calculateStatistics(enhanced);
          const statsTime = performance.now() - statsStart;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Calculating statistics...');
            console.log(`Statistics calculated in ${statsTime.toFixed(2)}ms`);
            console.log('Statistics:', {
              totalPackets: stats.totalPackets,
              protocols: Object.keys(stats.protocolDistribution).length,
              errors: stats.errors,
              bandwidth: `${(stats.bandwidth.total / 1024 / 1024).toFixed(2)} MB`,
            });
          }
          setStatistics(stats);
          
          const analysisStart = performance.now();
          const analysisResult = performAnalysis(enhanced);
          const analysisTime = performance.now() - analysisStart;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('Performing analysis...');
            console.log(`Analysis complete in ${analysisTime.toFixed(2)}ms`);
            console.log('Analysis Results:', {
              insights: analysisResult.insights.length,
              latencyIssues: analysisResult.latencyIssues.length,
              errors: analysisResult.errors.length,
            });
            if (analysisResult.insights.length > 0) {
              console.warn('Issues Found:', analysisResult.insights);
            }
          }
          setAnalysis(analysisResult);

          setIsProcessing(false);
          
          // Calculate protocol counts
          const counts: Record<string, number> = {};
          enhanced.forEach(p => {
            counts[p.protocol] = (counts[p.protocol] || 0) + 1;
          });
          setProtocolCounts(counts);

          // Save to captures history for comparison
          if (stats && analysisResult) {
            setCaptures(prev => [...prev, {
              name: file.name,
              packets: enhanced,
              statistics: stats,
              analysis: analysisResult,
              timestamp: Date.now(),
            }]);
          }

          const totalTime = performance.now() - parseStartTime;
          if (process.env.NODE_ENV === 'development') {
            console.log(`Total processing time: ${(totalTime / 1000).toFixed(2)}s`);
            console.groupEnd();
          }

          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        } else if (type === 'error') {
          if (process.env.NODE_ENV === 'development') {
            console.error('Worker error:', event.data.error);
            console.groupEnd();
          }
          toast.error(`Error parsing file: ${event.data.error}`);
          setIsProcessing(false);
          
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }
      };

      console.log('Sending data to worker for parsing...');
      workerRef.current.postMessage({ type: 'parse', data: arrayBuffer });
    } catch (error) {
      console.error('Error processing file:', error);
      console.groupEnd();
      toast.error('Error processing file. Please ensure it is a valid PCAP/PCAPNG file.');
      setIsProcessing(false);
    }
  }, []);

  const handleNewUpload = useCallback(() => {
    // Reset to upload screen
    setAllPackets([]);
    setFilteredPackets([]);
    setSelectedPacket(null);
    setStatistics(null);
    setAnalysis(null);
    setProtocolCounts({});
    setCurrentView('packets');
    setUploadedFile(null);
    setCurrentSession({ isFromDatabase: false });
  }, []);

  const handleLoadSession = useCallback(async (sessionId: string) => {
    setIsProcessing(true);
    try {
      const sessionData = await loadSession(sessionId);
      if (sessionData) {
        // Set statistics
        setStatistics(sessionData.statistics);
        
        // Clear packets since we don't store them (would need PCAP file to reparse)
        setAllPackets([]);
        setFilteredPackets([]);
        
        // Extract analysis data - need to fetch from session_statistics separately
        // For now, create empty analysis since anomaly_data structure may vary
        setAnalysis({
          insights: [],
          errors: [],
          latencyIssues: [],
          packetLoss: []
        });
        
        setCurrentSession({ sessionId, isFromDatabase: true });
        setCurrentView('statistics');
        toast.success('Session loaded successfully! Note: Packet data not available.');
      } else {
        toast.error('Failed to load session');
      }
    } catch (error) {
      console.error('Load session error:', error);
      toast.error('Error loading session');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleSaveSession = useCallback(() => {
    if (!user) {
      toast.error('Please sign in to save sessions');
      setShowAuthModal(true);
      return;
    }
    
    if (!uploadedFile || !allPackets.length || !statistics || !analysis) {
      toast.error('No analysis data to save');
      return;
    }

    setShowSaveModal(true);
  }, [user, uploadedFile, allPackets, statistics, analysis]);

  const handleFilterChange = useCallback((filter: PacketFilter) => {
    console.group('Filter Applied');
    console.log('Filter settings:', filter);
    
    let filtered = [...allPackets];
    const originalCount = filtered.length;

    // Filter by protocols
    if (filter.protocols && filter.protocols.length > 0) {
      filtered = filtered.filter(p => filter.protocols.includes(p.protocol));
      console.log(`Protocol filter: ${filter.protocols.join(', ')} - ${filtered.length} packets match`);
    }

    // Filter by source IP
    if (filter.sourceIP) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(p => 
        p.source.toLowerCase().includes(filter.sourceIP!.toLowerCase())
      );
      console.log(`Source IP filter: "${filter.sourceIP}" - ${filtered.length}/${beforeCount} packets match`);
    }

    // Filter by destination IP
    if (filter.destinationIP) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(p => 
        p.destination.toLowerCase().includes(filter.destinationIP!.toLowerCase())
      );
      console.log(`Destination IP filter: "${filter.destinationIP}" - ${filtered.length}/${beforeCount} packets match`);
    }

    // Filter by search term
    if (filter.searchTerm) {
      const beforeCount = filtered.length;
      const term = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.source.toLowerCase().includes(term) ||
        p.destination.toLowerCase().includes(term) ||
        p.info.toLowerCase().includes(term) ||
        p.protocol.toLowerCase().includes(term)
      );
      console.log(`Search filter: "${filter.searchTerm}" - ${filtered.length}/${beforeCount} packets match`);
    }

    console.log(`Filter result: ${filtered.length}/${originalCount} packets (${((filtered.length/originalCount)*100).toFixed(1)}%)`);
    console.groupEnd();
    setFilteredPackets(filtered);
  }, [allPackets]);

  const handlePacketClick = useCallback((packetId: number) => {
    const packet = allPackets.find(p => p.id === packetId);
    if (packet) {
      console.log('Packet Selected:', {
        id: packet.id,
        timestamp: packet.timeString,
        source: packet.source,
        destination: packet.destination,
        protocol: packet.protocol,
        length: packet.length,
        info: packet.info,
      });
      setSelectedPacket(packet);
      setCurrentView('packets');
    }
  }, [allPackets]);

  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <div>
              <h1 className="text-2xl font-bold">AIShark</h1>
              <p className="text-sm text-blue-100">Network Packet Analyzer</p>
            </div>
          </div>
          
          {allPackets.length > 0 && (
            <div className="flex items-center gap-3">
              {user && !currentSession.isFromDatabase && (
                <button
                  onClick={handleSaveSession}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2 font-medium"
                >
                  <Save className="w-5 h-5" />
                  Save Session
                </button>
              )}
              <button
                onClick={handleNewUpload}
                className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload New File
              </button>
              {user ? (
                <UserProfile onHistoryClick={() => setShowHistoryModal(true)} />
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center gap-2 font-medium"
                >
                  <LogIn className="w-5 h-5" />
                  Sign In
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {allPackets.length === 0 ? (
          <div className="bg-gradient-to-br from-gray-50 to-blue-50">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 pt-16 pb-12">
              <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg mb-6">
                  <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h1 className="text-5xl font-bold text-gray-900 mb-4">
                  AI-Powered PCAP Analysis
                </h1>
                <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                  Analyze Wireshark packet captures with intelligent insights. Get instant summaries, 
                  detect anomalies, and troubleshoot network issues using AI.
                </p>
              </div>

              {/* File Upload */}
              <div className="mb-16">
                <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Analysis</h3>
                  <p className="text-gray-600">
                    AI automatically identifies network issues, performance bottlenecks, and security concerns with detailed explanations.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Ask Questions</h3>
                  <p className="text-gray-600">
                    Chat with AI about your capture. Ask "Why is this connection slow?" or "Are there security threats?" in plain English.
                  </p>
                </div>

                <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Privacy First</h3>
                  <p className="text-gray-600">
                    Your packet data is processed client-side. Only anonymized summaries are sent to AI—your sensitive data stays private.
                  </p>
                </div>
              </div>

              {/* Capabilities */}
              <div className="bg-white rounded-xl shadow-md p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">What You Can Do</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Protocol Analysis</h4>
                      <p className="text-sm text-gray-600">HTTP/HTTPS, DNS, TCP, UDP, TLS/SSL with deep inspection</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Anomaly Detection</h4>
                      <p className="text-sm text-gray-600">AI identifies unusual patterns, security threats, and errors</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Root Cause Analysis</h4>
                      <p className="text-sm text-gray-600">AI troubleshoots issues with evidence and recommendations</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Compare Captures</h4>
                      <p className="text-sm text-gray-600">Before/after comparison with AI-powered insights</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Advanced Filtering</h4>
                      <p className="text-sm text-gray-600">Search by IP, protocol, or content with instant results</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mt-1">
                      <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">Export Reports</h4>
                      <p className="text-sm text-gray-600">JSON, CSV, and text format exports for further analysis</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance Stats */}
              <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-blue-600">1.4s</div>
                  <div className="text-sm text-gray-600 mt-1">Parse 26K packets</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-green-600">85%</div>
                  <div className="text-sm text-gray-600 mt-1">Cost savings</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-purple-600">2-4s</div>
                  <div className="text-sm text-gray-600 mt-1">AI response time</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4 text-center">
                  <div className="text-3xl font-bold text-orange-600">100%</div>
                  <div className="text-sm text-gray-600 mt-1">Privacy protected</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* View Tabs */}
            <div className="bg-white border-b border-gray-200">
              <div className="max-w-7xl mx-auto px-4">
                <div className="flex gap-6">
                  <button
                    onClick={() => setCurrentView('packets')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      currentView === 'packets'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Packets ({filteredPackets.length})
                  </button>
                  <button
                    onClick={() => setCurrentView('statistics')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      currentView === 'statistics'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Statistics
                  </button>
                  <button
                    onClick={() => setCurrentView('analysis')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                      currentView === 'analysis'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Analysis
                    {analysis && analysis.insights.length > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        {analysis.insights.length}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setCurrentView('ai-insights')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                      currentView === 'ai-insights'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    AI Insights
                  </button>
                  <button
                    onClick={() => setCurrentView('ai-chat')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                      currentView === 'ai-chat'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Ask AI
                  </button>
                  <button
                    onClick={() => setCurrentView('compare')}
                    className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                      currentView === 'compare'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Compare
                    {captures.length > 1 && (
                      <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs">
                        {captures.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Content Area */}
            {currentView === 'packets' && (
              <>
                <FilterBar 
                  onFilterChange={handleFilterChange}
                  protocolCounts={protocolCounts}
                />
                <PacketList
                  packets={filteredPackets}
                  onPacketSelect={setSelectedPacket}
                  selectedPacketId={selectedPacket?.id}
                />
              </>
            )}

            {currentView === 'statistics' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <Statistics stats={statistics} />
              </div>
            )}

            {currentView === 'analysis' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <AnalysisReport 
                  analysis={analysis}
                  onPacketClick={handlePacketClick}
                />
              </div>
            )}

            {currentView === 'ai-insights' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <AIInsights
                  packets={allPackets}
                  statistics={statistics}
                  analysis={analysis}
                  onPacketClick={handlePacketClick}
                />
              </div>
            )}

            {currentView === 'ai-chat' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <ChatInterface
                  packets={allPackets}
                  statistics={statistics}
                  analysis={analysis}
                  onPacketClick={handlePacketClick}
                />
              </div>
            )}

            {currentView === 'compare' && (
              <div className="max-w-7xl mx-auto px-4 py-6">
                <CompareCaptures captures={captures} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Packet Details Modal */}
      {selectedPacket && (
        <PacketDetails
          packet={selectedPacket}
          onClose={() => setSelectedPacket(null)}
          sessionId={currentSession.sessionId}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />

      {/* Save Session Modal */}
      {showSaveModal && uploadedFile && (
        <SaveSessionModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          data={{
            fileName: uploadedFile.name,
            fileSize: uploadedFile.size,
            packets: allPackets,
            statistics: statistics!,
            analysis: analysis!,
            pcapFile: uploadedFile,
          }}
          onSaved={(sessionId) => {
            setCurrentSession({ sessionId, isFromDatabase: true });
          }}
        />
      )}

      {/* Analysis History Modal */}
      {showHistoryModal && (
        <AnalysisHistory
          onLoadSession={handleLoadSession}
          onClose={() => setShowHistoryModal(false)}
        />
      )}
    </main>
  );
}
