// Core packet structure
export interface Packet {
  id: number;
  timestamp: number;
  timeString: string;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  raw: Uint8Array;
  layers: PacketLayers;
  flags?: PacketFlags;
}

export interface PacketLayers {
  ethernet?: EthernetLayer;
  ip?: IPLayer;
  tcp?: TCPLayer;
  udp?: UDPLayer;
  http?: HTTPLayer;
  dns?: DNSLayer;
  tls?: TLSLayer;
}

export interface EthernetLayer {
  source: string;
  destination: string;
  type: number;
}

export interface IPLayer {
  version: number;
  source: string;
  destination: string;
  protocol: number;
  ttl: number;
  length: number;
}

export interface TCPLayer {
  sourcePort: number;
  destinationPort: number;
  sequenceNumber: number;
  acknowledgmentNumber: number;
  flags: {
    syn: boolean;
    ack: boolean;
    fin: boolean;
    rst: boolean;
    psh: boolean;
    urg: boolean;
  };
  windowSize: number;
  payload?: Uint8Array;
}

export interface UDPLayer {
  sourcePort: number;
  destinationPort: number;
  length: number;
  payload?: Uint8Array;
}

export interface HTTPLayer {
  method?: string;
  uri?: string;
  version?: string;
  statusCode?: number;
  statusText?: string;
  headers: Record<string, string>;
  body?: string;
  isRequest: boolean;
}

export interface DNSLayer {
  transactionId: number;
  isQuery: boolean;
  queries: DNSQuery[];
  answers: DNSAnswer[];
}

export interface DNSQuery {
  name: string;
  type: string;
  class: string;
}

export interface DNSAnswer {
  name: string;
  type: string;
  class: string;
  ttl: number;
  data: string;
}

export interface TLSLayer {
  version: string;
  contentType: string;
  handshakeType?: string;
  cipherSuites?: string[];
  serverName?: string;
}

export interface PacketFlags {
  hasError: boolean;
  isRetransmission: boolean;
  isDuplicateAck: boolean;
  hasWarning: boolean;
}

// Filter and search types
export interface PacketFilter {
  protocols: string[];
  sourceIP?: string;
  destinationIP?: string;
  sourcePort?: number;
  destinationPort?: number;
  searchTerm?: string;
  timeRange?: {
    start: number;
    end: number;
  };
}

// Statistics types
export interface PacketStatistics {
  totalPackets: number;
  protocolDistribution: Record<string, number>;
  topTalkers: {
    source: string;
    destination: string;
    packets: number;
    bytes: number;
  }[];
  errors: {
    retransmissions: number;
    duplicateAcks: number;
    resets: number;
  };
  bandwidth: {
    total: number;
    perSecond: number;
  };
}

// TCP stream types
export interface TCPStream {
  id: string;
  source: string;
  destination: string;
  sourcePort: number;
  destinationPort: number;
  packets: Packet[];
  data: {
    client: Uint8Array[];
    server: Uint8Array[];
  };
}

// HTTP conversation types
export interface HTTPConversation {
  id: string;
  request: Packet;
  response?: Packet;
  latency?: number;
  method: string;
  uri: string;
  statusCode?: number;
}

// Analysis results
export interface AnalysisResult {
  latencyIssues: LatencyIssue[];
  packetLoss: PacketLossEvent[];
  errors: PacketError[];
  insights: string[];
}

export interface LatencyIssue {
  timestamp: number;
  source: string;
  destination: string;
  latency: number;
  packetId: number;
}

export interface PacketLossEvent {
  timestamp: number;
  stream: string;
  lostPackets: number;
  packetIds: number[];
}

export interface PacketError {
  packetId: number;
  timestamp: number;
  type: 'malformed' | 'reset' | 'timeout' | 'checksum';
  description: string;
}

// File upload types
export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  data: ArrayBuffer;
}

// Export types
export interface ExportOptions {
  format: 'json' | 'csv' | 'txt';
  includeFilters: boolean;
  packets?: number[];
}

// Annotation types
export interface PacketAnnotation {
  packetId: number;
  text: string;
  timestamp: number;
  color?: string;
}
