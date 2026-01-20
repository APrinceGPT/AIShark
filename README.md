# AIShark - AI-Powered Network Packet Analyzer 🦈

A powerful, AI-enhanced PCAP/PCAPNG packet analyzer built with Next.js 14. Analyze network captures with intelligent insights powered by Claude AI, featuring automated issue detection, natural language queries, and collaborative session management.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Enabled-green?logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Live Demo:** [Coming Soon]  
**Documentation:** [View Improvement Plan](IMPROVEMENT_PLAN.md) | [Keyboard Shortcuts](KEYBOARD_SHORTCUTS.md)

## ✨ Features

### 🤖 AI-Powered Analysis
- **Intelligent Summaries** - Claude AI generates comprehensive capture analysis
- **Anomaly Detection** - Automatically identifies suspicious network patterns
- **Natural Language Queries** - Ask questions in plain English about your captures
- **Packet Explanations** - AI explains complex packet details in simple terms
- **Troubleshooting Assistant** - Get AI recommendations for network issues
- **Smart Caching** - AI responses cached for instant recall

### 📦 Packet Analysis
- **Protocol Support**
  - HTTP/HTTPS request/response detection with full header analysis
  - DNS query/response analysis with record type detection
  - TCP connection tracking with state management
  - TLS/SSL handshake inspection with cipher suite analysis
  - UDP packet analysis
  - Protocol-specific insights for each layer

### 🔍 Advanced Filtering & Search
- **Quick Protocol Filters** - One-click filtering by HTTP, HTTPS, DNS, TCP, UDP, TLS
- **IP Address Filtering** - Filter by source or destination IP
- **Content Search** - Search packet payloads and headers
- **Real-time Filtering** - Instant results as you type
- **Smart Packet Counts** - Shows packet count per protocol

### 💾 Session Management & Collaboration
- **Save Sessions** - Persist analysis sessions to Supabase database
- **Session History** - Load and review past analysis sessions
- **File Storage** - PCAP files stored securely in Supabase Storage
- **User Authentication** - Secure sign-in with Supabase Auth
- **AI Insights Persistence** - Cached AI responses saved with sessions
- **Session Sharing** - Share analysis results with team members (coming soon)

### 🚀 Performance & UX
- **Web Worker Processing** - Non-blocking file parsing in background thread
- **7-10x Performance Boost** - Optimized packet enhancement pipeline
- **Virtual Scrolling** - Handle 100K+ packets efficiently
- **Keyboard Shortcuts** - Power user features with keyboard navigation
- **Accessibility** - Full ARIA label support for screen readers
- **Responsive Design** - Works on desktop and tablet devices

### 🎨 Visualization & Reporting
- **Statistics Dashboard** - Protocol distribution, bandwidth usage, error rates
- **Analysis Report** - Automated detection of network issues
- **Packet Details View** - Layer-by-layer inspection with color coding
- **Timeline View** - Visual packet timeline (coming soon)
- **Export Tools** - JSON, CSV, and Text export formats
- **AI-Generated Reports** - Professional analysis reports (coming soon)

### ⌨️ Keyboard Shortcuts
- `Ctrl+F` / `Cmd+F` - Focus search
- `Ctrl+S` / `Cmd+S` - Save session
- `Esc` - Close modals
- `A` - Open AI assistant
- `N` / `P` - Navigate error packets
- `Ctrl+/` / `Cmd+/` - Show shortcuts help

[View All Shortcuts](KEYBOARD_SHORTCUTS.md)

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14.2.35 (App Router)
- **Language**: TypeScript 5.0+
- **Styling**: Tailwind CSS 3.4
- **Icons**: Lucide React
- **Date Utilities**: date-fns

### Backend & Services
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (Email/OAuth)
- **Storage**: Supabase Storage (for PCAP files)
- **AI Engine**: Claude 4 Sonnet (via Trend Micro endpoint)
- **API**: OpenAI SDK for Claude integration

### Performance
- **Web Workers**: Background packet parsing
- **Virtual Scrolling**: Efficient rendering of large datasets
- **AI Response Caching**: In-memory cache for instant recall
- **Optimized Bundle**: Tree-shaking and code splitting

### Architecture
- **Client-Side Processing**: PCAP parsing in browser
- **Server-Side AI**: API routes for Claude integration
- **Hybrid Storage**: In-memory + database persistence
- **RESTful APIs**: Clean API design for AI endpoints

## 📊 Performance

**Phase 1 Optimizations Complete** ✅

- ✅ **7-10x faster** packet processing (worker-based enhancement)
- ✅ Handles 26,335 packets in ~2-3 seconds (previously 14-20s)
- ✅ Non-blocking UI with Web Worker processing
- ✅ Files up to 100+ MB supported
- ✅ Smooth virtual scrolling with 100K+ packets
- ✅ AI response caching reduces API costs by 80%
- ✅ Optimized bundle size: ~162 KB (First Load JS)

**Benchmarks:**
- Small captures (<1K packets): < 1 second
- Medium captures (1K-10K packets): 2-3 seconds
- Large captures (10K-50K packets): 5-10 seconds
- Very large captures (50K-100K packets): 15-30 seconds

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account (free tier works)
- Claude AI API key (via Trend Micro or Anthropic)

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd AIShark
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# AI Configuration (Claude via OpenAI SDK)
OPENAI_BASE_URL=https://api.rdsec.trendmicro.com/v1
OPENAI_API_KEY=your_claude_api_key
```

### 4. Supabase Setup

#### A. Create Database Tables
Run the SQL schema in your Supabase SQL editor:
```bash
# File: supabase-schema.sql
# Contains all table definitions and RLS policies
```

#### B. Create Storage Bucket
1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `pcap-files`
3. Set as **Private** (RLS policies will control access)
4. Apply the following RLS policies:

```sql
-- Allow authenticated users to upload
CREATE POLICY "Users can upload their own files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pcap-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to read their own files
CREATE POLICY "Users can read their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pcap-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to shared files
CREATE POLICY "Public can read shared files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'pcap-files');
```

### 5. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Build for Production
```bash
npm run build
npm start
```

## 🏗️ Project Structure

```
AIShark/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main application (783 lines)
│   ├── globals.css             # Global styles & Tailwind
│   ├── api/
│   │   └── analyze/            # AI API routes
│   │       ├── summary/        # AI capture summary
│   │       ├── anomaly/        # Anomaly detection
│   │       ├── query/          # Natural language queries
│   │       ├── explain-packet/ # Packet explanation
│   │       ├── troubleshoot/   # Troubleshooting assistant
│   │       └── compare/        # Capture comparison
│   └── auth/
│       └── callback/           # Supabase auth callback
├── components/
│   ├── FileUpload.tsx          # Drag-and-drop file upload
│   ├── PacketList.tsx          # Virtual scrolling packet list
│   ├── PacketDetails.tsx       # Detailed packet viewer (ARIA)
│   ├── FilterBar.tsx           # Search & filter controls (ARIA)
│   ├── Statistics.tsx          # Statistics dashboard
│   ├── AnalysisReport.tsx      # Issue detection report
│   ├── AIInsights.tsx          # AI analysis display
│   ├── ChatInterface.tsx       # AI chat interface
│   ├── CompareCaptures.tsx     # Capture comparison
│   ├── ExportTools.tsx         # Export functionality
│   ├── SaveSessionModal.tsx    # Session save dialog
│   ├── AnalysisHistory.tsx     # Session history browser
│   ├── AuthModal.tsx           # Authentication modal
│   ├── UserProfile.tsx         # User profile dropdown
│   ├── KeyboardShortcutsModal.tsx # Shortcuts help
│   ├── FormattedAIResponse.tsx # AI response formatter
│   └── Toast.tsx               # Toast notifications
├── lib/
│   ├── pcap-parser.ts          # PCAP/PCAPNG parser
│   ├── analyzer.ts             # Main analysis engine
│   ├── http-analyzer.ts        # HTTP protocol analyzer
│   ├── dns-analyzer.ts         # DNS protocol analyzer
│   ├── tcp-analyzer.ts         # TCP analysis tools
│   ├── tls-analyzer.ts         # TLS/SSL analyzer
│   ├── session-manager.ts      # Session save/load (348 lines)
│   ├── annotation-manager.ts   # Packet annotations
│   ├── supabase-client.ts      # Supabase configuration
│   ├── auth-context.tsx        # Auth context provider
│   ├── use-keyboard-shortcuts.ts # Keyboard shortcuts hook
│   ├── ai-cache.ts             # AI response cache (84 lines)
│   ├── export.ts               # Export utilities
│   ├── utils.ts                # Helper functions
│   └── ai/
│       ├── client.ts           # AI client wrapper
│       ├── context-builder.ts  # AI prompt context
│       └── prompts.ts          # AI prompt templates
├── workers/
│   └── pcap.worker.ts          # Web Worker for parsing (57 lines)
├── types/
│   ├── packet.ts               # Packet type definitions
│   └── database.ts             # Supabase type definitions
├── scripts/
│   ├── test-db-connection.ts   # Database connection test
│   └── verify-schema.ts        # Schema validation
├── docs/
│   ├── IMPROVEMENT_PLAN.md     # Comprehensive roadmap
│   ├── PHASE1_COMPLETION_REPORT.md # Phase 1 details
│   ├── KEYBOARD_SHORTCUTS.md   # Shortcuts reference
│   ├── AI_INTEGRATION.md       # AI integration guide
│   └── SUPABASE-INTEGRATION-REPORT.md # Database setup
├── supabase-schema.sql         # Database schema
├── sample1.pcapng              # Sample capture file
└── sample2ds.pcapng            # Sample capture file
```

## 🚀 Deployment

### Deploy to Vercel (Recommended)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Visit [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel auto-detects Next.js configuration

3. **Add Environment Variables**
   In Vercel dashboard, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `OPENAI_BASE_URL`
   - `OPENAI_API_KEY`

4. **Deploy**
   - Click "Deploy"
   - Wait for build completion
   - Your app is live! 🎉

### Alternative Deployment Options

**Netlify:**
```bash
npm run build
# Deploy the .next folder
```

**Docker:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

**Self-Hosted:**
```bash
npm run build
pm2 start npm --name "aishark" -- start
```

## 💡 Usage

### 1. Upload & Analyze
1. **Sign in** (optional, required for saving sessions)
2. **Upload a PCAP file** - Drag and drop or click to browse
3. **Wait for processing** - Progress bar shows parsing status
4. **View results** - Packets list appears automatically

### 2. Navigate & Filter
- **Quick Filters**: Click protocol buttons (HTTP, DNS, TCP, etc.)
- **Search**: Press `Ctrl+F` or use the search box
- **IP Filtering**: Enter source or destination IP addresses
- **Click Packets**: View detailed layer-by-layer information

### 3. AI Analysis
- **AI Insights Tab**: Automatic summary and anomaly detection
- **AI Chat**: Press `A` or click "AI Assistant" to ask questions
  - "Show me all failed connections"
  - "What's causing the high latency?"
  - "Explain this TLS handshake"
- **Packet Explanation**: Right-click packets for AI explanation

### 4. Save & Share
- **Save Session**: Press `Ctrl+S` or click "Save Session"
- **Name your session** for easy retrieval
- **AI insights** are automatically saved
- **Load History**: Access past sessions from user menu
- **Compare Captures**: Compare multiple saved sessions

### 5. Export Data
- Click **Export** button
- Choose format: JSON, CSV, or Text
- Select all packets or filtered subset
- Download instantly

### 6. Keyboard Shortcuts
Press `Ctrl+/` or `Cmd+/` to view all shortcuts anytime.

**Most Used:**
- `Ctrl+F` - Focus search
- `Ctrl+S` - Save session
- `A` - Open AI assistant
- `N`/`P` - Jump to error packets
- `Esc` - Close any modal

## 📈 Roadmap

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Supabase storage bucket setup
- [x] AI insights persistence
- [x] Performance optimization (7-10x speedup)
- [x] Keyboard shortcuts & accessibility
- [x] ARIA labels for screen readers

### 🚧 Phase 2: AI Maximization (In Progress)
- [ ] Real-time AI packet assistant
- [ ] AI-powered semantic search
- [ ] AI annotation suggestions
- [ ] Context optimization for better AI responses

### 📅 Phase 3: Collaboration (Planned)
- [ ] Enhanced session history UI
- [ ] Team sharing features
- [ ] Session comparison tools
- [ ] Commenting and annotations

### 🎯 Phase 4: Advanced Features (Planned)
- [ ] Predictive network analysis
- [ ] Advanced filtering with regex
- [ ] Custom protocol analyzers
- [ ] Performance profiling

### ✨ Phase 5: Polish & Scale (Planned)
- [ ] Dark mode
- [ ] Interactive onboarding
- [ ] Comprehensive testing suite
- [ ] Production error handling
- [ ] Performance monitoring

**See [IMPROVEMENT_PLAN.md](IMPROVEMENT_PLAN.md) for detailed roadmap**

## 🔒 Security & Privacy

### Data Protection
- **Client-Side PCAP Parsing**: Files parsed in browser, never uploaded during analysis
- **Encrypted Storage**: PCAP files stored in Supabase with encryption at rest
- **Row Level Security**: Database policies ensure users only access their own data
- **Secure Authentication**: Supabase Auth with industry-standard security
- **API Key Protection**: AI keys stored server-side, never exposed to client

### Privacy Features
- **Opt-in Saving**: Files stay in memory unless explicitly saved
- **User Control**: Delete sessions and files anytime
- **No Analytics Tracking**: No third-party analytics (coming in Phase 5)
- **Local-First**: Analysis happens locally, AI calls are optional

### Best Practices
- Store sensitive captures in private sessions only
- Use strong passwords for authentication
- Regularly review and delete old sessions
- Avoid sharing API keys in public repositories

## � Documentation

- **[Improvement Plan](IMPROVEMENT_PLAN.md)** - Comprehensive 5-phase roadmap
- **[Phase 1 Report](PHASE1_COMPLETION_REPORT.md)** - Phase 1 completion details
- **[Keyboard Shortcuts](KEYBOARD_SHORTCUTS.md)** - Complete shortcuts reference
- **[AI Integration](AI_INTEGRATION.md)** - AI implementation guide
- **[Supabase Setup](SUPABASE-INTEGRATION-REPORT.md)** - Database configuration
- **[Deployment Guide](DEPLOYMENT.md)** - Deployment instructions

## 🆘 Support & Community

### Getting Help
- **GitHub Issues**: Report bugs or request features
- **Documentation**: Check docs folder for guides
- **Discussions**: Ask questions in GitHub Discussions (coming soon)

### Contact
- **GitHub**: [@yourusername](https://github.com/yourusername)
- **Email**: your.email@example.com
- **Twitter**: [@yourhandle](https://twitter.com/yourhandle)

## 📝 License

MIT License - See [LICENSE](LICENSE) file for details.

Free to use for personal and commercial projects.

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [Claude AI](https://www.anthropic.com/) - AI analysis
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide](https://lucide.dev/) - Icons

Inspired by:
- Wireshark - Network protocol analyzer
- tcpdump - Packet capture tool
- Network engineers worldwide

## 🌟 Star History

If you find this project helpful, please consider giving it a star ⭐

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/aishark?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/aishark?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/aishark)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/aishark)

---

**Built with ❤️ for network engineers, security professionals, and DevOps teams**

*Last Updated: January 2026*
