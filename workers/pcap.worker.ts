import { PCAPParser } from '../lib/pcap-parser';
import { Packet } from '../types/packet';

let parser: PCAPParser | null = null;

self.addEventListener('message', async (event: MessageEvent) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'parse':
        console.log('Worker: Received parse request');
        console.log('Worker: Data size:', data.byteLength, 'bytes');
        
        if (!parser) {
          parser = new PCAPParser();
          console.log('Worker: Parser created');
        }
        
        console.log('Worker: Starting parse...');
        const packets = await parser.parse(data);
        console.log('Worker: Parse returned', packets.length, 'packets');
        
        // Send packets in chunks to avoid blocking
        const chunkSize = 1000;
        for (let i = 0; i < packets.length; i += chunkSize) {
          const chunk = packets.slice(i, i + chunkSize);
          self.postMessage({
            type: 'progress',
            packets: chunk,
            total: packets.length,
            current: i + chunk.length,
          });
        }
        
        self.postMessage({
          type: 'complete',
          totalPackets: packets.length,
        });
        break;

      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`,
        });
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export {};
