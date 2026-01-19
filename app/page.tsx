'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import FileUpload from '@/components/FileUpload';
import FilterBar from '@/components/FilterBar';
import PacketList from '@/components/PacketList';
import PacketDetails from '@/components/PacketDetails';
import Statistics from '@/components/Statistics';
import AnalysisReport from '@/components/AnalysisReport';
import ExportTools from '@/components/ExportTools';
import { Packet, PacketFilter, PacketStatistics, AnalysisResult } from '@/types/packet';
import { enhancePackets, calculateStatistics, performAnalysis } from '@/lib/analyzer';

export default function Home() {
  const [allPackets, setAllPackets] = useState<Packet[]>([]);
  const [filteredPackets, setFilteredPackets] = useState<Packet[]>([]);
  const [selectedPacket, setSelectedPacket] = useState<Packet | null>(null);
  const [statistics, setStatistics] = useState<PacketStatistics | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentView, setCurrentView] = useState<'packets' | 'statistics' | 'analysis'>('packets');
  const [protocolCounts, setProtocolCounts] = useState<Record<string, number>>({});
  
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
    console.group('🦈 AIShark PCAP File Upload');
    console.log('📁 File Details:', {
      name: file.name,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      type: file.type,
      lastModified: new Date(file.lastModified).toISOString(),
    });

    setIsProcessing(true);
    setAllPackets([]);
    setFilteredPackets([]);
    setStatistics(null);
    setAnalysis(null);

    try {
      console.log('📖 Reading file as ArrayBuffer...');
      const startRead = performance.now();
      const arrayBuffer = await file.arrayBuffer();
      const readTime = performance.now() - startRead;
      console.log(`✅ File read complete in ${readTime.toFixed(2)}ms`);
      console.log(`📦 Buffer size: ${arrayBuffer.byteLength} bytes`);

      // Create web worker for parsing
      console.log('👷 Creating Web Worker for parsing...');
      workerRef.current = new Worker(
        new URL('../workers/pcap.worker.ts', import.meta.url),
        { type: 'module' }
      );
      console.log('✅ Worker created successfully');

      const packets: Packet[] = [];
      const parseStartTime = performance.now();

      workerRef.current.onmessage = async (event) => {
        const { type, packets: chunk, total, current } = event.data;

        if (type === 'progress') {
          packets.push(...chunk);
          console.log(`📊 Progress: ${current}/${total} packets (${((current/total)*100).toFixed(1)}%)`);
          
          // Update UI periodically
          if (packets.length % 1000 === 0 || packets.length === total) {
            console.log('🔄 Enhancing packets with protocol analysis...');
            const enhanceStart = performance.now();
            const enhanced = enhancePackets([...packets]);
            const enhanceTime = performance.now() - enhanceStart;
            console.log(`✅ Enhanced ${enhanced.length} packets in ${enhanceTime.toFixed(2)}ms`);
            
            setAllPackets(enhanced);
            setFilteredPackets(enhanced);
            
            // Calculate protocol counts
            const counts: Record<string, number> = {};
            enhanced.forEach(p => {
              counts[p.protocol] = (counts[p.protocol] || 0) + 1;
            });
            setProtocolCounts(counts);
            console.log('📈 Protocol Distribution:', counts);
          }
        } else if (type === 'complete') {
          const parseTime = performance.now() - parseStartTime;
          console.log(`✅ Parsing complete in ${parseTime.toFixed(2)}ms`);
          console.log(`📦 Total packets parsed: ${packets.length}`);
          
          console.log('🔍 Final enhancement pass...');
          const enhanced = enhancePackets(packets);
          setAllPackets(enhanced);
          setFilteredPackets(enhanced);
          
          // Calculate statistics and perform analysis
          console.log('📊 Calculating statistics...');
          const statsStart = performance.now();
          const stats = calculateStatistics(enhanced);
          const statsTime = performance.now() - statsStart;
          console.log(`✅ Statistics calculated in ${statsTime.toFixed(2)}ms`);
          console.log('📈 Statistics:', {
            totalPackets: stats.totalPackets,
            protocols: Object.keys(stats.protocolDistribution).length,
            errors: stats.errors,
            bandwidth: `${(stats.bandwidth.total / 1024 / 1024).toFixed(2)} MB`,
          });
          setStatistics(stats);
          
          console.log('🔬 Performing analysis...');
          const analysisStart = performance.now();
          const analysisResult = performAnalysis(enhanced);
          const analysisTime = performance.now() - analysisStart;
          console.log(`✅ Analysis complete in ${analysisTime.toFixed(2)}ms`);
          console.log('🔍 Analysis Results:', {
            insights: analysisResult.insights.length,
            latencyIssues: analysisResult.latencyIssues.length,
            errors: analysisResult.errors.length,
          });
          if (analysisResult.insights.length > 0) {
            console.warn('⚠️ Issues Found:', analysisResult.insights);
          }
          setAnalysis(analysisResult);

          setIsProcessing(false);
          
          // Calculate protocol counts
          const counts: Record<string, number> = {};
          enhanced.forEach(p => {
            counts[p.protocol] = (counts[p.protocol] || 0) + 1;
          });
          setProtocolCounts(counts);

          const totalTime = performance.now() - parseStartTime;
          console.log(`🎉 Total processing time: ${(totalTime / 1000).toFixed(2)}s`);
          console.groupEnd();

          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
            console.log('🛑 Worker terminated');
          }
        } else if (type === 'error') {
          console.error('❌ Worker error:', event.data.error);
          console.groupEnd();
          alert(`Error parsing file: ${event.data.error}`);
          setIsProcessing(false);
          
          if (workerRef.current) {
            workerRef.current.terminate();
            workerRef.current = null;
          }
        }
      };

      console.log('📤 Sending data to worker for parsing...');
      workerRef.current.postMessage({ type: 'parse', data: arrayBuffer });
    } catch (error) {
      console.error('❌ Error processing file:', error);
      console.groupEnd();
      alert('Error processing file. Please ensure it is a valid PCAP/PCAPNG file.');
      setIsProcessing(false);
    }
  }, []);

  const handleFilterChange = useCallback((filter: PacketFilter) => {
    console.group('🔍 Filter Applied');
    console.log('Filter settings:', filter);
    
    let filtered = [...allPackets];
    const originalCount = filtered.length;

    // Filter by protocols
    if (filter.protocols && filter.protocols.length > 0) {
      filtered = filtered.filter(p => filter.protocols.includes(p.protocol));
      console.log(`📌 Protocol filter: ${filter.protocols.join(', ')} - ${filtered.length} packets match`);
    }

    // Filter by source IP
    if (filter.sourceIP) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(p => 
        p.source.toLowerCase().includes(filter.sourceIP!.toLowerCase())
      );
      console.log(`📌 Source IP filter: "${filter.sourceIP}" - ${filtered.length}/${beforeCount} packets match`);
    }

    // Filter by destination IP
    if (filter.destinationIP) {
      const beforeCount = filtered.length;
      filtered = filtered.filter(p => 
        p.destination.toLowerCase().includes(filter.destinationIP!.toLowerCase())
      );
      console.log(`📌 Destination IP filter: "${filter.destinationIP}" - ${filtered.length}/${beforeCount} packets match`);
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
      console.log(`📌 Search filter: "${filter.searchTerm}" - ${filtered.length}/${beforeCount} packets match`);
    }

    console.log(`✅ Filter result: ${filtered.length}/${originalCount} packets (${((filtered.length/originalCount)*100).toFixed(1)}%)`);
    console.groupEnd();
    setFilteredPackets(filtered);
  }, [allPackets]);

  const handlePacketClick = useCallback((packetId: number) => {
    const packet = allPackets.find(p => p.id === packetId);
    if (packet) {
      console.log('📦 Packet Selected:', {
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
              <ExportTools 
                packets={filteredPackets} 
                selectedPacketIds={selectedPacket ? [selectedPacket.id] : []}
              />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1">
        {allPackets.length === 0 ? (
          <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <FileUpload onFileUpload={handleFileUpload} isProcessing={isProcessing} />
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
          </>
        )}
      </div>

      {/* Packet Details Modal */}
      {selectedPacket && (
        <PacketDetails
          packet={selectedPacket}
          onClose={() => setSelectedPacket(null)}
        />
      )}
    </main>
  );
}
