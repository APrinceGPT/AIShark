import { NextRequest, NextResponse } from 'next/server';
import { Packet } from '@/types/packet';
import { getCompletion } from '@/lib/ai/client';

export async function POST(request: NextRequest) {
  try {
    const { query, packets } = await request.json();

    if (!query || !packets || !Array.isArray(packets)) {
      return NextResponse.json(
        { error: 'Query and packets array are required' },
        { status: 400 }
      );
    }

    if (packets.length === 0) {
      return NextResponse.json({ matchingPacketIds: [], explanation: 'No packets to search' });
    }

    // Build search context with packet summaries
    const context = buildSearchContext(packets, query);
    
    const systemPrompt = `You are a network traffic analysis expert helping users find specific packets in a capture.

Your task: Analyze the user's natural language query and identify which packet IDs match their criteria.

CRITICAL: Respond ONLY with valid JSON. Do not include any explanatory text before or after the JSON.

Guidelines:
- Return packet IDs (numbers) that match the query
- Consider protocol types, IP addresses, ports, flags, errors, and content
- Be precise - only return packets that clearly match
- If the query is ambiguous, interpret it reasonably
- Return empty array if no packets match

Examples of queries:
- "find all HTTP errors" → packets with HTTP 4xx/5xx status codes
- "show DNS failures" → packets with DNS errors or timeouts
- "large file transfers" → packets with high data volume
- "retransmissions" → packets with TCP retransmission flag
- "connections to port 443" → packets with dest/source port 443
- "failed handshakes" → packets with RST or failed TLS handshake`;

    const userPrompt = `User query: "${query}"

Packet data summary:
${context}

IMPORTANT: Respond with ONLY the JSON object below. No explanatory text before or after.

Analyze the packets and return this exact JSON structure:
{
  "matchingPacketIds": [array of packet IDs that match],
  "explanation": "brief explanation of what you searched for and why these packets match",
  "count": number of matching packets
}

Be specific and accurate. Only include packets that clearly match the query.`;

    const response = await getCompletion(systemPrompt, userPrompt);
    
    // Parse JSON response - extract JSON from response
    let result;
    try {
      let cleanResponse = response.trim();
      
      // Try to extract JSON from markdown code block first
      const jsonBlockMatch = cleanResponse.match(/```json\s*\n?([\s\S]*?)\n?```/);
      if (jsonBlockMatch) {
        cleanResponse = jsonBlockMatch[1].trim();
      } else {
        // Try generic code block
        const codeBlockMatch = cleanResponse.match(/```\s*\n?([\s\S]*?)\n?```/);
        if (codeBlockMatch) {
          cleanResponse = codeBlockMatch[1].trim();
        }
      }
      
      // If still has explanatory text, try to find JSON object
      if (!cleanResponse.startsWith('{')) {
        const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanResponse = jsonMatch[0];
        }
      }
      
      result = JSON.parse(cleanResponse);
    } catch (parseError) {
      console.error('Failed to parse AI response:', response);
      return NextResponse.json(
        { error: 'Failed to parse AI search results' },
        { status: 500 }
      );
    }

    // Validate response
    if (!Array.isArray(result.matchingPacketIds)) {
      result.matchingPacketIds = [];
    }

    // Ensure all IDs are valid packet IDs
    const validPacketIds = new Set(packets.map(p => p.id));
    result.matchingPacketIds = result.matchingPacketIds.filter((id: number) => 
      validPacketIds.has(id)
    );

    result.count = result.matchingPacketIds.length;

    return NextResponse.json(result);

  } catch (error) {
    console.error('Semantic search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform semantic search' },
      { status: 500 }
    );
  }
}

function buildSearchContext(packets: Packet[], query: string): string {
  // For large captures, sample intelligently based on query
  const maxPackets = 200;
  let sampled: Packet[];

  if (packets.length <= maxPackets) {
    sampled = packets;
  } else {
    // Intelligent sampling based on query keywords
    const queryLower = query.toLowerCase();
    const keywords = ['error', 'fail', 'retrans', 'timeout', 'reset', 'rst', 'syn'];
    const shouldPrioritizeErrors = keywords.some(kw => queryLower.includes(kw));

    if (shouldPrioritizeErrors) {
      // Prioritize packets with errors/warnings
      const errorPackets = packets.filter(p => 
        p.flags?.hasError || 
        p.flags?.isRetransmission || 
        p.flags?.hasWarning
      );
      const normalPackets = packets.filter(p => !errorPackets.includes(p));
      
      // Mix error packets with normal ones
      const errorSample = errorPackets.slice(0, Math.min(100, errorPackets.length));
      const normalSample = sampleEvenly(normalPackets, maxPackets - errorSample.length);
      sampled = [...errorSample, ...normalSample].sort((a, b) => a.id - b.id);
    } else {
      // Even sampling across entire capture
      sampled = sampleEvenly(packets, maxPackets);
    }
  }

  // Build concise context
  const lines: string[] = [];
  lines.push(`Total packets: ${packets.length}`);
  lines.push(`Sampled packets: ${sampled.length}`);
  lines.push('');
  lines.push('Packet summaries:');

  for (const p of sampled) {
    const flags: string[] = [];
    if (p.flags?.hasError) flags.push('ERROR');
    if (p.flags?.isRetransmission) flags.push('RETRANS');
    if (p.flags?.hasWarning) flags.push('WARN');

    const srcPort = p.layers.tcp?.sourcePort || p.layers.udp?.sourcePort || '';
    const dstPort = p.layers.tcp?.destinationPort || p.layers.udp?.destinationPort || '';
    const ports = srcPort && dstPort ? `:${srcPort}→:${dstPort}` : '';

    let details = '';
    if (p.layers.http) {
      if (p.layers.http.isRequest) {
        details = ` | ${p.layers.http.method} ${p.layers.http.uri}`;
      } else {
        details = ` | HTTP ${p.layers.http.statusCode}`;
      }
    } else if (p.layers.dns) {
      const queries = p.layers.dns.queries.slice(0, 1).map(q => q.name).join(',');
      details = ` | DNS ${p.layers.dns.isQuery ? 'Q' : 'R'}: ${queries}`;
    } else if (p.layers.tcp) {
      const tcpFlags: string[] = [];
      if (p.layers.tcp.flags.syn) tcpFlags.push('SYN');
      if (p.layers.tcp.flags.ack) tcpFlags.push('ACK');
      if (p.layers.tcp.flags.fin) tcpFlags.push('FIN');
      if (p.layers.tcp.flags.rst) tcpFlags.push('RST');
      if (tcpFlags.length > 0) details = ` | ${tcpFlags.join(',')}`;
    }

    const flagStr = flags.length > 0 ? ` [${flags.join(',')}]` : '';
    lines.push(`#${p.id} ${p.protocol}${ports}${details}${flagStr} | ${p.length}b`);
  }

  return lines.join('\n');
}

function sampleEvenly(packets: Packet[], count: number): Packet[] {
  if (packets.length <= count) return packets;
  
  const step = packets.length / count;
  const sampled: Packet[] = [];
  
  for (let i = 0; i < count; i++) {
    const index = Math.floor(i * step);
    sampled.push(packets[index]);
  }
  
  return sampled;
}
