/**
 * Make packet references clickable in AI responses
 * Converts text like "packet #1234" or "packet 1234" into clickable links
 */

interface PacketLinkProps {
  text: string;
  onPacketClick: (packetId: number) => void;
}

export default function FormattedAIResponse({ text, onPacketClick }: PacketLinkProps) {
  // Regular expression to match packet references
  // Matches: "packet #123", "packet 123", "Packet #123", "#123" (if preceded by "packet")
  const packetRegex = /(\bpacket\s*#?(\d+)|#(\d+)(?=\s|,|\.|\)|$))/gi;

  const parts = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = packetRegex.exec(text)) !== null) {
    // Add text before the match
    if (match.index > lastIndex) {
      parts.push(
        <span key={`text-${key++}`}>
          {text.substring(lastIndex, match.index)}
        </span>
      );
    }

    // Extract packet ID
    const packetId = parseInt(match[2] || match[3]);

    // Add clickable packet link
    parts.push(
      <button
        key={`packet-${key++}`}
        onClick={() => onPacketClick(packetId)}
        className="packet-link inline-flex items-center gap-1"
        title={`Jump to packet #${packetId}`}
      >
        {match[0]}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    );

    lastIndex = packetRegex.lastIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(
      <span key={`text-${key++}`}>
        {text.substring(lastIndex)}
      </span>
    );
  }

  return <div className="whitespace-pre-wrap">{parts}</div>;
}
