import { NextRequest, NextResponse } from 'next/server';
import { Packet } from '@/types/packet';
import { getCompletion } from '@/lib/ai/client';

export async function POST(request: NextRequest) {
  try {
    const { packet } = await request.json();

    if (!packet) {
      return NextResponse.json(
        { error: 'Packet data is required' },
        { status: 400 }
      );
    }

    // Build a concise packet context for annotation suggestion
    const context = buildAnnotationContext(packet);
    
    const systemPrompt = `You are a network security expert analyzing packet captures. Your task is to suggest a concise annotation for the given packet.

Guidelines:
- Annotation must be ONE sentence (max 150 characters)
- Focus on what makes this packet interesting or notable
- Identify security concerns, anomalies, or significant protocol events
- Use technical but clear language
- Suggest severity: info, warning, or critical
- DO NOT include explanations, just the annotation text

Examples of good annotations:
- "HTTPS session established with TLS 1.3 to cloud service"
- "DNS query timeout - possible connectivity issue"
- "TCP retransmission detected - network congestion"
- "Potential port scan - SYN to closed port"
- "Large HTTP response (5MB) from external server"`;

    const userPrompt = `Analyze this packet and suggest an annotation:

${context}

Respond in this exact JSON format:
{
  "annotation": "your annotation text here",
  "severity": "info|warning|critical",
  "reason": "brief explanation why this packet is notable"
}`;

    const response = await getCompletion(systemPrompt, userPrompt);
    
    // Parse the JSON response
    let suggestion;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanResponse = response.trim();
      if (cleanResponse.startsWith('```json')) {
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      } else if (cleanResponse.startsWith('```')) {
        cleanResponse = cleanResponse.replace(/```\n?/g, '');
      }
      
      suggestion = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      return NextResponse.json(
        { error: 'Failed to parse AI suggestion' },
        { status: 500 }
      );
    }

    // Validate the suggestion
    if (!suggestion.annotation || !suggestion.severity) {
      return NextResponse.json(
        { error: 'Invalid suggestion format' },
        { status: 500 }
      );
    }

    // Ensure severity is valid
    if (!['info', 'warning', 'critical'].includes(suggestion.severity)) {
      suggestion.severity = 'info';
    }

    // Truncate annotation if too long
    if (suggestion.annotation.length > 150) {
      suggestion.annotation = suggestion.annotation.substring(0, 147) + '...';
    }

    return NextResponse.json(suggestion);

  } catch (error) {
    console.error('Annotation suggestion error:', error);
    return NextResponse.json(
      { error: 'Failed to generate annotation suggestion' },
      { status: 500 }
    );
  }
}

function buildAnnotationContext(packet: Packet): string {
  const context: string[] = [];

  // Basic info
  context.push(`Packet #${packet.id + 1} - ${packet.protocol}`);
  
  // Build connection string with ports from TCP/UDP layers
  const srcPort = packet.layers.tcp?.sourcePort || packet.layers.udp?.sourcePort || 'N/A';
  const dstPort = packet.layers.tcp?.destinationPort || packet.layers.udp?.destinationPort || 'N/A';
  context.push(`${packet.source}:${srcPort} → ${packet.destination}:${dstPort}`);
  
  context.push(`Length: ${packet.length} bytes`);
  context.push(`Timestamp: ${new Date(packet.timestamp * 1000).toLocaleString()}`);

  // Flags and status
  if (packet.flags) {
    const flagDetails: string[] = [];
    if (packet.flags.hasError) flagDetails.push('ERROR');
    if (packet.flags.isRetransmission) flagDetails.push('RETRANSMIT');
    if (packet.flags.isDuplicateAck) flagDetails.push('DUP-ACK');
    if (packet.flags.hasWarning) flagDetails.push('WARNING');
    if (flagDetails.length > 0) {
      context.push(`Flags: ${flagDetails.join(', ')}`);
    }
  }

  // Layer details
  const { tcp, udp, http, dns, tls } = packet.layers;

  if (tcp) {
    const tcpFlags: string[] = [];
    if (tcp.flags.syn) tcpFlags.push('SYN');
    if (tcp.flags.ack) tcpFlags.push('ACK');
    if (tcp.flags.fin) tcpFlags.push('FIN');
    if (tcp.flags.rst) tcpFlags.push('RST');
    if (tcp.flags.psh) tcpFlags.push('PSH');
    context.push(`TCP Flags: ${tcpFlags.join(', ')}`);
    if (tcp.windowSize !== undefined) context.push(`Window: ${tcp.windowSize}`);
  }

  if (udp) {
    context.push(`UDP Length: ${udp.length}`);
  }

  if (http) {
    if (http.isRequest) {
      context.push(`HTTP Request: ${http.method} ${http.uri}`);
      if (http.headers?.['user-agent']) {
        context.push(`User-Agent: ${http.headers['user-agent'].substring(0, 50)}`);
      }
    } else {
      context.push(`HTTP Response: ${http.statusCode} ${http.statusText}`);
      if (http.headers?.['content-type']) {
        context.push(`Content-Type: ${http.headers['content-type']}`);
      }
    }
  }

  if (dns) {
    if (dns.isQuery) {
      const queries = dns.queries.slice(0, 2).map(q => q.name).join(', ');
      context.push(`DNS Query: ${queries}`);
    } else {
      context.push(`DNS Response: ${dns.answers.length} answers`);
    }
  }

  if (tls) {
    context.push(`TLS ${tls.version}`);
    if (tls.handshakeType) context.push(`Handshake: ${tls.handshakeType}`);
    if (tls.serverName) context.push(`SNI: ${tls.serverName}`);
  }

  return context.join('\n');
}
