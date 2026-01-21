/**
 * Advanced Filter Engine
 * Provides regex support, compound logic, and optimized filtering
 */

import { Packet, PacketFilter } from '@/types/packet';

/**
 * Extended filter with advanced options
 */
export interface AdvancedFilter extends PacketFilter {
  // Regex support
  regexPattern?: string;
  regexField?: 'source' | 'destination' | 'info' | 'protocol' | 'payload';
  regexFlags?: string; // 'i', 'g', 'ig', etc.
  
  // Port filtering
  sourcePortRange?: { min: number; max: number };
  destinationPortRange?: { min: number; max: number };
  
  // Advanced options
  hasErrors?: boolean; // Only show packets with errors
  tcpFlags?: string[]; // SYN, ACK, FIN, RST, PSH, URG
  
  // Compound logic
  logicMode?: 'AND' | 'OR'; // How to combine multiple filters
}

/**
 * Validates regex pattern to prevent ReDoS attacks
 */
export function validateRegexPattern(pattern: string): { valid: boolean; error?: string } {
  try {
    // Check for dangerous patterns
    const dangerousPatterns = [
      /(\*|\+|\{)\1+/, // Catastrophic backtracking: (a+)+
      /(\(.*\)\*){3,}/, // Nested quantifiers
      /(\.\*){5,}/, // Too many wildcards
    ];

    for (const dangerous of dangerousPatterns) {
      if (dangerous.test(pattern)) {
        return { 
          valid: false, 
          error: 'Pattern may cause performance issues. Please simplify.' 
        };
      }
    }

    // Test pattern compilation
    new RegExp(pattern);
    
    // Check length
    if (pattern.length > 500) {
      return { 
        valid: false, 
        error: 'Pattern too long. Maximum 500 characters.' 
      };
    }

    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : 'Invalid regex pattern' 
    };
  }
}

/**
 * Apply regex filter to packet
 */
function matchesRegex(packet: Packet, pattern: string, field: string, flags: string): boolean {
  try {
    const regex = new RegExp(pattern, flags);
    
    switch (field) {
      case 'source':
        return regex.test(packet.source);
      case 'destination':
        return regex.test(packet.destination);
      case 'info':
        return regex.test(packet.info);
      case 'protocol':
        return regex.test(packet.protocol);
      case 'payload':
        // Search in HTTP body or raw payload
        if (packet.layers.http?.body) {
          return regex.test(packet.layers.http.body);
        }
        if (packet.raw) {
          const text = new TextDecoder('utf-8', { fatal: false }).decode(packet.raw);
          return regex.test(text);
        }
        return false;
      default:
        return false;
    }
  } catch (error) {
    console.warn('Regex match error:', error);
    return false;
  }
}

/**
 * Check if packet has TCP errors
 */
function hasErrors(packet: Packet): boolean {
  if (packet.flags?.isRetransmission) return true;
  if (packet.flags?.isDuplicateAck) return true;
  if (packet.layers.tcp?.flags.rst) return true;
  if (packet.layers.http?.statusCode && packet.layers.http.statusCode >= 400) return true;
  if (packet.layers.dns && !packet.layers.dns.isQuery && packet.layers.dns.answers.length === 0) return true;
  return false;
}

/**
 * Check if packet matches TCP flags filter
 */
function matchesTcpFlags(packet: Packet, flags: string[]): boolean {
  if (!packet.layers.tcp) return false;
  
  const tcpFlags = packet.layers.tcp.flags;
  for (const flag of flags) {
    switch (flag.toUpperCase()) {
      case 'SYN':
        if (tcpFlags.syn) return true;
        break;
      case 'ACK':
        if (tcpFlags.ack) return true;
        break;
      case 'FIN':
        if (tcpFlags.fin) return true;
        break;
      case 'RST':
        if (tcpFlags.rst) return true;
        break;
      case 'PSH':
        if (tcpFlags.psh) return true;
        break;
      case 'URG':
        if (tcpFlags.urg) return true;
        break;
    }
  }
  return false;
}

/**
 * Apply advanced filter to packets
 */
export function applyAdvancedFilter(
  packets: Packet[], 
  filter: AdvancedFilter
): Packet[] {
  let filtered = [...packets];

  // Track each filter step for debugging
  const stats = {
    initial: filtered.length,
    afterProtocol: 0,
    afterIP: 0,
    afterPort: 0,
    afterSearch: 0,
    afterRegex: 0,
    afterErrors: 0,
    afterTcpFlags: 0,
    final: 0,
  };

  // Protocol filter
  if (filter.protocols && filter.protocols.length > 0) {
    filtered = filtered.filter(p => filter.protocols.includes(p.protocol));
    stats.afterProtocol = filtered.length;
  }

  // IP filters
  if (filter.sourceIP) {
    filtered = filtered.filter(p => 
      p.source.toLowerCase().includes(filter.sourceIP!.toLowerCase())
    );
  }
  if (filter.destinationIP) {
    filtered = filtered.filter(p => 
      p.destination.toLowerCase().includes(filter.destinationIP!.toLowerCase())
    );
  }
  stats.afterIP = filtered.length;

  // Port filters
  if (filter.sourcePort) {
    filtered = filtered.filter(p => {
      const port = p.layers.tcp?.sourcePort || p.layers.udp?.sourcePort;
      return port === filter.sourcePort;
    });
  }
  if (filter.destinationPort) {
    filtered = filtered.filter(p => {
      const port = p.layers.tcp?.destinationPort || p.layers.udp?.destinationPort;
      return port === filter.destinationPort;
    });
  }

  // Port range filters
  if (filter.sourcePortRange) {
    filtered = filtered.filter(p => {
      const port = p.layers.tcp?.sourcePort || p.layers.udp?.sourcePort;
      if (!port) return false;
      return port >= filter.sourcePortRange!.min && port <= filter.sourcePortRange!.max;
    });
  }
  if (filter.destinationPortRange) {
    filtered = filtered.filter(p => {
      const port = p.layers.tcp?.destinationPort || p.layers.udp?.destinationPort;
      if (!port) return false;
      return port >= filter.destinationPortRange!.min && port <= filter.destinationPortRange!.max;
    });
  }
  stats.afterPort = filtered.length;

  // Search term filter
  if (filter.searchTerm) {
    const term = filter.searchTerm.toLowerCase();
    filtered = filtered.filter(p => 
      p.source.toLowerCase().includes(term) ||
      p.destination.toLowerCase().includes(term) ||
      p.info.toLowerCase().includes(term) ||
      p.protocol.toLowerCase().includes(term)
    );
    stats.afterSearch = filtered.length;
  }

  // Regex filter
  if (filter.regexPattern && filter.regexField) {
    const validation = validateRegexPattern(filter.regexPattern);
    if (validation.valid) {
      const flags = filter.regexFlags || 'i';
      filtered = filtered.filter(p => 
        matchesRegex(p, filter.regexPattern!, filter.regexField!, flags)
      );
      stats.afterRegex = filtered.length;
    } else {
      console.warn('Invalid regex pattern:', validation.error);
    }
  }

  // Error packets filter
  if (filter.hasErrors) {
    filtered = filtered.filter(p => hasErrors(p));
    stats.afterErrors = filtered.length;
  }

  // TCP flags filter
  if (filter.tcpFlags && filter.tcpFlags.length > 0) {
    filtered = filtered.filter(p => matchesTcpFlags(p, filter.tcpFlags!));
    stats.afterTcpFlags = filtered.length;
  }

  // Time range filter
  if (filter.timeRange) {
    filtered = filtered.filter(p => 
      p.timestamp >= filter.timeRange!.start && 
      p.timestamp <= filter.timeRange!.end
    );
  }

  stats.final = filtered.length;

  // Log filter performance in dev mode
  if (process.env.NODE_ENV === 'development' && stats.initial !== stats.final) {
    console.log('Filter stats:', stats);
  }

  return filtered;
}

/**
 * Get filter summary for display
 */
export function getFilterSummary(filter: AdvancedFilter): string {
  const parts: string[] = [];

  if (filter.protocols?.length) {
    parts.push(`Protocols: ${filter.protocols.join(', ')}`);
  }
  if (filter.sourceIP) {
    parts.push(`Source: ${filter.sourceIP}`);
  }
  if (filter.destinationIP) {
    parts.push(`Dest: ${filter.destinationIP}`);
  }
  if (filter.searchTerm) {
    parts.push(`Search: "${filter.searchTerm}"`);
  }
  if (filter.regexPattern) {
    parts.push(`Regex: /${filter.regexPattern}/${filter.regexFlags || ''}`);
  }
  if (filter.hasErrors) {
    parts.push('Errors only');
  }
  if (filter.tcpFlags?.length) {
    parts.push(`TCP: ${filter.tcpFlags.join(', ')}`);
  }

  return parts.length > 0 ? parts.join(' | ') : 'No filters';
}

/**
 * Check if filter is empty
 */
export function isFilterEmpty(filter: AdvancedFilter): boolean {
  return (
    (!filter.protocols || filter.protocols.length === 0) &&
    !filter.sourceIP &&
    !filter.destinationIP &&
    !filter.sourcePort &&
    !filter.destinationPort &&
    !filter.searchTerm &&
    !filter.regexPattern &&
    !filter.hasErrors &&
    (!filter.tcpFlags || filter.tcpFlags.length === 0) &&
    !filter.timeRange
  );
}
