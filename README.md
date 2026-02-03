# AIShark - AI-Powered Network Packet Analyzer 🦈

A powerful, AI-enhanced PCAP/PCAPNG packet analyzer built with Next.js 16. Analyze network captures with intelligent insights powered by Claude AI, featuring automated issue detection, natural language queries, and collaborative session management.

[![Next.js](https://img.shields.io/badge/Next.js-16.1-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.1-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green?logo=supabase)](https://supabase.com/)
[![Vitest](https://img.shields.io/badge/Vitest-128%20Tests-green?logo=vitest)](https://vitest.dev/)
[![Playwright](https://img.shields.io/badge/Playwright-13%20E2E-blue?logo=playwright)](https://playwright.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🚀 What's New (February 2026)

### 🤖 SharkAI Help Mode
- **Project Help** - Ask SharkAI about features, how to use the app, FAQ without loading a file
- **Smart Detection** - Automatically detects help vs. packet analysis questions
- **Quick Questions** - Shows help-related questions when no file is loaded

### ☁️ Large File Support
- **11,000+ Packet Files** - Full AI analysis for large captures (bypasses Vercel 4.5MB limit)
- **Chunked Upload** - Automatic splitting into 2000-packet chunks with progress indicator
- **Session-Based AI** - All AI features (Query, Performance, Predict) work with large files
- **Auto-Cleanup** - Sessions deleted on tab close, manual clear, or 1-hour timeout

### 🦈 SharkAI Floating Assistant
- **Floating Chat Window** - Draggable AI assistant visible while browsing packets
- **Context-Aware** - Includes selected packet context in questions
- **Keyboard Shortcut** - Press `A` to toggle visibility

### 🧭 Enhanced Navigation
- **Floating Toolbar** - Page navigation, configurable page size (100-10000)
- **Go to Packet** - Jump directly to any packet by number
- **Error Navigation** - Previous/Next error buttons with count badge

### 📥 Sample PCAP Downloads
- **Demo-ready samples** - 4 sample files available directly from homepage
- **Protocol variety** - DNS, HTTP, and SMTP traffic samples

### 🎨 UI/UX Improvements
- **Simplified Theme Toggle** - Direct light/dark toggle button
- **Enhanced Dark Mode** - Consistent backgrounds across all components
- **Onboarding Tour** - Interactive walkthrough with sample downloads step

---

## ✨ Features

### 🤖 AI-Powered Analysis
- **SharkAI Help Mode** - Ask about app features without loading a file
- **Large File Support** - AI analysis for 11,000+ packet captures
- **Intelligent Summaries** - Claude AI generates comprehensive capture analysis
- **Anomaly Detection** - Automatically identifies suspicious network patterns
- **Natural Language Queries** - Ask questions in plain English
- **Semantic Search** - Find packets using natural language (e.g., "find HTTP errors")
- **Real-Time Packet Assistant** - Floating AI panel for instant insights
- **AI-Assisted Annotations** - Get AI-suggested annotations with severity levels
- **Troubleshooting Assistant** - Get AI recommendations for network issues
- **Smart Caching** - AI responses cached for 80% cost reduction

### 📦 Packet Analysis
- **Protocol Support**: HTTP/HTTPS, DNS, TCP, TLS/SSL, UDP
- **Layer-by-layer inspection** with color coding
- **Connection tracking** with state management
- **Cipher suite analysis** for TLS handshakes

### 🔍 Advanced Filtering & Search
- **Advanced Filtering Engine** - Regex patterns with ReDoS protection
- **Filter Presets** - Save/load up to 50 custom filters with import/export
- **Port Range Filtering** - Filter by specific port ranges
- **Built-in Filter Library** - 6 common presets (HTTP errors, DNS failures, etc.)
- **AI Semantic Search** - Natural language packet queries
- **Quick Protocol Filters** - One-click filtering by protocol
- **Real-time Filtering** - Instant results as you type

### 📊 Advanced Network Analysis
- **Predictive Analysis** - ML-based pattern recognition and issue prediction
- **Performance Profiling** - RTT calculation, HTTP response times, DNS latency
- **Bottleneck Detection** - 6 types (High RTT, Packet Loss, Slow DNS, etc.)
- **Automated Remediation** - AI-generated fix procedures with checklists
- **Monitoring Integrations** - Prometheus export, Webhook integration

### 💾 Session Management
- **Save Sessions** - Persist analysis sessions to Supabase
- **Session History** - Sort by date/name/size, filter by date range
- **Session Comparison** - Compare two sessions side-by-side
- **Public Sharing** - Generate shareable links with expiration
- **PDF Export** - Professional analysis reports
- **Packet Annotations** - Add notes and bookmarks

### 🚀 Performance & UX
- **Web Worker Processing** - Non-blocking file parsing (7-10x faster)
- **Virtual Scrolling** - Handle 100K+ packets efficiently
- **Keyboard Shortcuts** - Full keyboard navigation
- **Dark Mode** - Full dark theme with system preference detection
- **Onboarding Tour** - Interactive walkthrough for new users
- **Error Boundaries** - Graceful error handling

### ⌨️ Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus search bar |
| `Ctrl+S` | Save current session |
| `Ctrl+H` | Open session history |
| `A` | Toggle SharkAI assistant |
| `N` / `P` | Navigate to next/previous error |
| `Shift+?` | Show keyboard shortcuts help |
| `1-6` | Switch between views |
| `Esc` | Close any modal |

[View All Shortcuts](KEYBOARD_SHORTCUTS.md)

---

## 🛠️ Technology Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | Next.js 16.1, React 19.2, TypeScript 5, Tailwind CSS 4.1 |
| **Backend** | Supabase (Auth, Database, Storage) |
| **AI** | Claude AI (Anthropic) via Trend Micro API |
| **Monitoring** | Sentry 10.x, Google Analytics |
| **Testing** | Vitest (128 tests), Playwright (13 E2E tests) |

---

## ⚡ Performance

### Processing Speed
- **7-10x faster** packet processing with Web Workers
- Handles 26,335 packets in ~2-3 seconds
- Smooth virtual scrolling with 100K+ packets
- Files up to 100+ MB supported

### AI Efficiency
- **Token optimization** - 30-50% cost reduction through smart context
- **Response caching** - 80% cost savings
- **1-second debounce** on real-time AI assistant
- **Adaptive sampling** - 10-30 packets based on capture size

### Benchmarks
| Capture Size | Processing Time |
|--------------|-----------------|
| < 1K packets | < 1 second |
| 1K-10K packets | 2-3 seconds |
| 10K-50K packets | 5-10 seconds |
| 50K-100K packets | 15-30 seconds |

---

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account (free tier works)
- Claude AI API key

### Quick Start

```bash
# Clone the repository
git clone <your-repo-url>
cd AIShark

# Install dependencies
npm install

# Create .env.local file with:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
# OPENAI_BASE_URL=https://api.rdsec.trendmicro.com/v1
# OPENAI_API_KEY=your_api_key

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Supabase Setup
1. Run `supabase-schema.sql` in Supabase SQL editor
2. Run `supabase-predictive-migration.sql` for predictive analysis
3. Create a storage bucket named `pcap-files` (Private)
4. Apply RLS policies from schema files

### Run Tests
```bash
npm test              # Unit tests
npm run test:ui       # Unit tests with UI
npm run test:e2e      # E2E tests
```

---

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. Push to GitHub
2. Import repository in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy

### Alternative Options
- **Docker**: Build with provided Dockerfile
- **Self-Hosted**: `npm run build && pm2 start npm --name "aishark" -- start`

---

## 💡 Usage

### 1. Upload & Analyze
- Sign in (optional, required for saving)
- Upload a PCAP file via drag-and-drop
- View processed packets automatically

### 2. Navigate & Filter
- Use quick protocol filters (HTTP, DNS, TCP, etc.)
- Press `Ctrl+F` for search
- Filter by IP address or port range

### 3. AI Analysis
- **AI Insights Tab**: Automatic summary and anomaly detection
- **Semantic Search**: "find all HTTP errors", "show retransmissions"
- **AI Chat** (`A`): Ask questions about your capture
- **AI Annotations**: Get intelligent annotation suggestions

### 4. Save & Share
- Save sessions with `Ctrl+S`
- Generate shareable links with expiration
- Compare sessions side-by-side
- Export PDF reports

---

## 🔒 Security & Privacy

- **Client-Side Parsing**: Files parsed in browser, not uploaded during analysis
- **Encrypted Storage**: Supabase encryption at rest
- **Row Level Security**: Users only access their own data
- **API Key Protection**: Keys stored server-side only
- **Opt-in Saving**: Files stay in memory unless explicitly saved

---

## 📚 Documentation

- [Keyboard Shortcuts](KEYBOARD_SHORTCUTS.md)
- [API Documentation](docs/API.md)
- [Contributing Guide](CONTRIBUTING.md)
- [Deployment Guide](DEPLOYMENT.md)
- [Improvement Plan](IMPROVEMENT_PLAN.md)

---

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [Claude AI](https://www.anthropic.com/) - AI analysis
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

Inspired by Wireshark and network engineers worldwide.

---

⭐ **Star this repo if you find it helpful!**
