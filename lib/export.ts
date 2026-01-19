import { Packet, ExportOptions } from '@/types/packet';

export function exportPackets(packets: Packet[], options: ExportOptions): string {
  switch (options.format) {
    case 'json':
      return exportJSON(packets);
    case 'csv':
      return exportCSV(packets);
    case 'txt':
      return exportText(packets);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

function exportJSON(packets: Packet[]): string {
  return JSON.stringify(packets, null, 2);
}

function exportCSV(packets: Packet[]): string {
  const headers = ['ID', 'Timestamp', 'Source', 'Destination', 'Protocol', 'Length', 'Info'];
  const rows = packets.map(p => [
    p.id,
    p.timeString,
    p.source,
    p.destination,
    p.protocol,
    p.length,
    p.info.replace(/,/g, ';'), // Escape commas
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

function exportText(packets: Packet[]): string {
  return packets.map((p, i) => {
    let text = `\n${'='.repeat(80)}\n`;
    text += `Packet ${p.id + 1}\n`;
    text += `${'='.repeat(80)}\n`;
    text += `Time: ${p.timeString}\n`;
    text += `Source: ${p.source}\n`;
    text += `Destination: ${p.destination}\n`;
    text += `Protocol: ${p.protocol}\n`;
    text += `Length: ${p.length} bytes\n`;
    text += `Info: ${p.info}\n`;
    
    if (p.layers.http) {
      text += `\nHTTP Details:\n`;
      if (p.layers.http.isRequest) {
        text += `  Method: ${p.layers.http.method}\n`;
        text += `  URI: ${p.layers.http.uri}\n`;
      } else {
        text += `  Status: ${p.layers.http.statusCode} ${p.layers.http.statusText}\n`;
      }
      text += `  Headers:\n`;
      for (const [key, value] of Object.entries(p.layers.http.headers)) {
        text += `    ${key}: ${value}\n`;
      }
    }
    
    if (p.layers.dns) {
      text += `\nDNS Details:\n`;
      text += `  Type: ${p.layers.dns.isQuery ? 'Query' : 'Response'}\n`;
      text += `  Transaction ID: ${p.layers.dns.transactionId}\n`;
      if (p.layers.dns.queries.length > 0) {
        text += `  Queries:\n`;
        p.layers.dns.queries.forEach(q => {
          text += `    ${q.name} (${q.type})\n`;
        });
      }
      if (p.layers.dns.answers.length > 0) {
        text += `  Answers:\n`;
        p.layers.dns.answers.forEach(a => {
          text += `    ${a.name} → ${a.data} (TTL: ${a.ttl})\n`;
        });
      }
    }
    
    return text;
  }).join('\n');
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function generateShareableLink(packetIds: number[]): string {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  params.set('packets', packetIds.join(','));
  return `${base}?${params.toString()}`;
}
