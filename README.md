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

## 🚀 What's New in Phase 6 (February 2026)

### ☁️ Large File Support (Supabase Storage) ✨ NEW
- **11,000+ Packet Files** - Full AI analysis for large captures (bypasses Vercel 4.5MB limit)
- **Chunked Upload** - Automatic splitting into 2000-packet chunks
- **Session-Based AI** - Packets stored temporarily in Supabase, queries use session ID
- **Progress Indicator** - Inline banner shows upload progress for large files
- **Auto-Cleanup** - Sessions deleted on tab close, manual clear, or 1-hour timeout
- **Anonymous Support** - Works for both authenticated and anonymous users
- **Cost Efficient** - Single AI call with full context vs. multiple chunked calls

### 🦈 SharkAI Floating Assistant ✨ NEW
- **Floating Chat Window** - Draggable AI assistant that stays visible while browsing packets
- **Context-Aware** - Automatically includes selected packet context in questions
- **Quick Actions** - "Ask about this packet" button for instant analysis
- **Minimize/Maximize** - Collapse to icon or expand for full view
- **Keyboard Shortcut** - Press `A` to toggle SharkAI visibility

### 🧭 Enhanced Navigation Toolbar ✨ NEW
- **Floating Navigation** - Fixed toolbar for large packet lists (bottom-right)
- **Page Navigation** - Jump to Top, Bottom, Previous/Next page controls
- **Configurable Page Size** - 100, 500, 1000 (default), or 10000 packets per page
- **Go to Packet** - Jump directly to any packet by number
- **Error Navigation** - Previous/Next error buttons with error count badge
- **Keyboard Shortcuts** - Home, End, Page Up, Page Down, Arrow keys

### 📥 Sample PCAP Downloads
- **Demo-ready samples** - 4 sample PCAP files available for download directly from homepage
- **No Wireshark required** - Users can test AIShark without generating their own captures
- **Protocol variety** - DNS, HTTP, and SMTP traffic samples included
- **One-click download** - Simple download buttons with file descriptions and sizes

### ⚡ Major Framework Upgrades
- **Next.js 16.1** with Turbopack for faster builds
- **React 19.2** with latest concurrent features
- **Tailwind CSS 4.1** with CSS-first configuration
- **date-fns 4.1** for modern date handling

### 🧪 Expanded Test Coverage
- **128 Unit Tests** with Vitest (100% passing) - doubled from 62!
- New test suites: TCP analyzer, TLS analyzer, PCAP parser, Context builder, Session manager
- Comprehensive edge case coverage

### 📊 Timeline Visualization
- Interactive packet timeline component
- Auto-adjusting time buckets
- Click-to-select packet navigation
- Error highlighting in timeline view

### 📈 Performance Optimizations
- Bundle analyzer integration (`npm run build:analyze`)
- Enhanced virtual scrolling with overscan buffer
- Tree-shaking for lucide-react and date-fns
- Image optimization (AVIF/WebP formats)

### 📚 Documentation
- [API Documentation](docs/API.md) - Complete REST API reference
- [Contributing Guide](CONTRIBUTING.md) - How to contribute
- [Real-Time Streaming Architecture](docs/REALTIME_STREAMING_ARCHITECTURE.md) - Future streaming design

### 🔧 Developer Experience
- Fixed Sentry deprecation warnings
- Updated to Next.js 16 instrumentation pattern
- Improved TypeScript strict mode compliance

---

## 📦 Phase 5 (January 2026)

### 🌙 Full Dark Mode Support
- Complete dark mode implementation across **all 28 components**
- System preference detection with manual toggle
- Smooth transitions and persistent preference via localStorage
- WCAG-compliant contrast ratios for accessibility

### ✅ Testing Suite
- **13 E2E Tests** with Playwright (100% passing)
  - Homepage, authentication, file upload, onboarding

### 📱 Mobile Responsiveness
- Mobile navigation component
- Responsive bottom sheets
- Touch-friendly UI elements

### 🔔 Production Monitoring
- Sentry error tracking integration
- Google Analytics for usage insights
- Error boundary with graceful fallback UI

### 🎓 Onboarding Experience
- Interactive tour for first-time users
- Skip/restart tour options
- Feature highlights with tooltips

**Live Demo:** [Coming Soon]  
**Documentation:** [View Improvement Plan](IMPROVEMENT_PLAN.md) | [Keyboard Shortcuts](KEYBOARD_SHORTCUTS.md) | [API Docs](docs/API.md)

## ✨ Features

### 📥 Sample PCAP Files ✨ NEW
- **Demo-Ready Samples** - Download sample PCAP files directly from the homepage
- **No Wireshark Needed** - Test AIShark's full capabilities without generating captures
- **Protocol Variety** - DNS, HTTP, and SMTP traffic samples included
- **Quick Start** - Download, upload, and analyze in seconds

### 🤖 AI-Powered Analysis (Phases 1 & 2 Complete)
- **Large File Support** - AI analysis for 11,000+ packet captures via Supabase temporary storage ✨ NEW
- **Intelligent Summaries** - Claude AI generates comprehensive capture analysis with optimized token usage
- **Anomaly Detection** - Automatically identifies suspicious network patterns with adaptive sampling
- **Natural Language Queries** - Ask questions in plain English about your captures
- **Semantic Search** - Find packets using natural language (e.g., "find all HTTP errors", "show retransmissions")
- **Real-Time Packet Assistant** - Floating AI panel provides instant insights for selected packets
- **AI-Assisted Annotations** - Get AI-suggested annotations with severity levels for important packets
- **Packet Explanations** - AI explains complex packet details in simple terms
- **Troubleshooting Assistant** - Get AI recommendations for network issues
- **Smart Caching** - AI responses cached for instant recall and 80% cost reduction
- **Context Optimization** - Token counting and validation for efficient AI interactions

### 📦 Packet Analysis
- **Protocol Support**
  - HTTP/HTTPS request/response detection with full header analysis
  - DNS query/response analysis with record type detection
  - TCP connection tracking with state management
  - TLS/SSL handshake inspection with cipher suite analysis
  - UDP packet analysis
  - Protocol-specific insights for each layer

### 🔍 Advanced Filtering & Search
- **Advanced Filtering Engine** - Regex patterns with ReDoS protection, TCP flag filtering ✨ NEW
- **Filter Presets** - Save/load up to 50 custom filters with import/export ✨ NEW
- **Port Range Filtering** - Filter by specific port ranges ✨ NEW
- **Built-in Filter Library** - 6 common presets (HTTP errors, DNS failures, etc.) ✨ NEW
- **AI Semantic Search** - Natural language packet queries (e.g., "failed connections", "large transfers")
- **Quick Protocol Filters** - One-click filtering by HTTP, HTTPS, DNS, TCP, UDP, TLS
- **IP Address Filtering** - Filter by source or destination IP
- **Content Search** - Search packet payloads and headers
- **Real-time Filtering** - Instant results as you type
- **Smart Packet Counts** - Shows packet count per protocol
- **Combined Filtering** - Use AI search alongside traditional filters

### � Advanced Network Analysis (Phase 4) ✨ NEW
- **Predictive Network Analysis** - ML-based pattern recognition and issue prediction
  - Pattern signature extraction (protocol distribution, traffic characteristics, timing patterns)
  - Historical pattern learning with confidence scoring
  - Similarity matching (70%+ triggers predictions)
  - Risk assessment scoring (0-100)
  - Proactive recommendations for prevention
- **Performance Profiling** - Deep performance analysis with bottleneck detection
  - RTT (Round-Trip Time) calculation for TCP connections
  - HTTP response time analysis
  - DNS query latency tracking
  - 20+ performance metrics
  - 6 bottleneck types detection (High RTT, Packet Loss, Slow DNS, etc.)
  - Performance scoring (0-100) with AI-powered root cause analysis
- **Automated Remediation** - AI-generated fix procedures with interactive checklists
  - Structured remediation steps (Immediate/Short-term/Long-term)
  - Executable commands with copy-to-clipboard
  - Verification checklist for each fix
  - Runbook export (markdown format)
  - Monitoring recommendations
  - Prevention strategies
- **Monitoring Integrations** - Export to external monitoring systems
  - **Prometheus Export**: 7 metric types in exposition format
  - **Webhook Integration**: JSON payloads with customizable event types
  - Real-time alerting support
  - Network metrics (packets, traffic, errors, retransmissions)
  - Top talkers tracking

### �💾 Session Management & Collaboration
- **Save Sessions** - Persist analysis sessions to Supabase database
- **Session History** - Load and review past analysis sessions with advanced filtering
- **Enhanced History UI** - Sort by date/name/size/packets, filter by date range and file size ✨ NEW
- **Session Comparison** - Compare two sessions side-by-side with visual diffs ✨ NEW
- **Public Session Sharing** - Generate shareable links with optional expiration dates
- **No-Auth Sharing** - Recipients can view shared analysis without signing in
- **Share Management** - Revoke shares anytime, track view counts
- **PDF Export** - Export analysis reports as professional PDFs ✨ NEW
- **File Storage** - PCAP files stored securely in Supabase Storage (50MB free tier)
- **User Authentication** - Secure sign-in with Supabase Auth
- **AI Insights Persistence** - Cached AI responses saved with sessions
- **Packet Annotations** - Add notes and bookmarks to important packets
- **AI-Suggested Annotations** - Get intelligent annotation suggestions with one click
- **Session Metadata** - Track file size, packet count, analysis status

### 🚀 Performance & UX
- **Web Worker Processing** - Non-blocking file parsing in background thread (7-10x faster)
- **Optimized Pipeline** - Enhanced packet processing with adaptive sampling
- **Virtual Scrolling** - Handle 100K+ packets efficiently
- **Real-Time AI Assistant** - 1-second debounce prevents API spam
- **AI Response Caching** - Instant recall of previous AI analyses
- **Token Optimization** - Smart context building reduces AI costs by 30-50%
- **Keyboard Shortcuts** - Power user features with keyboard navigation (Ctrl+/, Shift+?)
- **Accessibility** - Full ARIA label support for screen readers
- **Responsive Design** - Works on desktop, tablet, and mobile devices
- **Toast Notifications** - Clear feedback for all user actions
- **Dark Mode** - Full dark theme support with system preference detection ✨ NEW
- **Onboarding Tour** - Interactive walkthrough for new users ✨ NEW
- **Error Boundaries** - Graceful error handling with fallback UI ✨ NEW

### 🎨 Visualization & Reporting
- **Statistics Dashboard** - Protocol distribution, bandwidth usage, error rates
- **Analysis Report** - Automated detection of network issues
- **Packet Details View** - Layer-by-layer inspection with color coding
- **Session Comparison** - Side-by-side session analysis with percentage diffs ✨ NEW
- **Timeline View** - Visual packet timeline (coming soon)
- **Export Tools** - JSON, CSV, and Text export formats
- **PDF Reports** - Professional analysis reports with charts and insights ✨ NEW

### ⌨️ Keyboard Shortcuts
- `Ctrl+F` / `Cmd+F` - Focus search bar
- `Ctrl+S` / `Cmd+S` - Save current session
- `Ctrl+H` / `Cmd+H` - Open session history with filters
- `Esc` - Close any open modal
- `A` - Open AI chat assistant
- `N` / `P` - Navigate to next/previous error packet
- `Shift+?` - Show keyboard shortcuts help
- `1-6` - Switch between views (Packets, Stats, Analysis, AI Insights, Chat, Compare)

[View All Shortcuts](KEYBOARD_SHORTCUTS.md)

## 🛠️ Technology Stack

### Frontend
- **Next.js 16.1** - React framework with App Router and Turbopack ✨ UPGRADED
- **React 19.2** - Latest React with concurrent features ✨ UPGRADED
- **TypeScript 5** - Type-safe development
- **Tailwind CSS 4.1** - CSS-first styling with dark mode support ✨ UPGRADED

### Backend & Database
- **Supabase** - Authentication, PostgreSQL database, file storage
- **Claude AI (Anthropic)** - AI-powered analysis via Trend Micro API
- **Sentry 10.x** - Error tracking and monitoring

### Testing
- **Vitest 4.x** - Fast unit testing framework (128 tests) ✨ EXPANDED
- **Playwright 1.58** - End-to-end testing (13 tests)
- **Testing Library** - Component testing utilities

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Web Workers** - Background processing for PCAP parsing
- **Bundle Analyzer** - Performance optimization ✨ NEW

---

## ⚡ Performance (Phases 1, 2, 3, 4 & 5 Complete) ✅

### Processing Speed
- ✅ **7-10x faster** packet processing (worker-based enhancement)
- ✅ Handles 26,335 packets in ~2-3 seconds (previously 14-20s)
- ✅ Non-blocking UI with Web Worker processing
- ✅ Files up to 100+ MB supported
- ✅ Smooth virtual scrolling with 100K+ packets
- ✅ Performance analysis: <5 seconds for 10K packets ✨ NEW
- ✅ Predictive analysis: 5-10 seconds with pattern matching ✨ NEW

### AI Efficiency
- ✅ **Token counting** and estimation for all AI requests
- ✅ **Adaptive sampling** (10-30 packets based on capture size)
- ✅ **Context validation** (6K recommended, 8K hard limit)
- ✅ **30-50% cost reduction** through optimized context
- ✅ **80% cost savings** from AI response caching
- ✅ **1-second debounce** on real-time AI assistant
- ✅ **Intelligent sampling** for semantic search (prioritizes errors)

### Advanced Features Performance ✨ NEW
- ✅ Regex pattern validation with ReDoS protection
- ✅ Filter preset save/load: <100ms
- ✅ Performance profiling: 2-5 seconds for 10K packets
- ✅ Predictive analysis: 5-10 seconds with pattern learning
- ✅ Prometheus export: <1 second for any capture size
- ✅ Webhook delivery: <3 seconds with 10-second timeout

### Bundle Optimization
- ✅ Optimized bundle size: ~319 KB First Load JS (was ~163KB)
- ✅ Tree-shaking and code splitting
- ✅ Lazy loading for heavy components
- ✅ Zero unused dependencies

**Benchmarks:**
- Small captures (<1K packets): < 1 second
- Medium captures (1K-10K packets): 2-3 seconds
- Large captures (10K-50K packets): 5-10 seconds
- Very large captures (50K-100K packets): 15-30 seconds
- AI Semantic Search: 5-20 seconds (depends on query complexity)
- Performance Analysis: 2-5 seconds ✨ NEW
- Predictive Analysis: 5-10 seconds ✨ NEW
### Processing Speed
- ✅ **7-10x faster** packet processing (worker-based enhancement)
- ✅ Handles 26,335 packets in ~2-3 seconds (previously 14-20s)
- ✅ Non-blocking UI with Web Worker processing
- ✅ Files up to 100+ MB supported
- ✅ Smooth virtual scrolling with 100K+ packets

### AI Efficiency
- ✅ **Token counting** and estimation for all AI requests
- ✅ **Adaptive sampling** (10-30 packets based on capture size)
- ✅ **Context validation** (6K recommended, 8K hard limit)
- ✅ **30-50% cost reduction** through optimized context
- ✅ **80% cost savings** from AI response caching
- ✅ **1-second debounce** on real-time AI assistant
- ✅ **Intelligent sampling** for semantic search (prioritizes errors)

### Bundle Optimization
- ✅ Optimized bundle size: ~163 KB (First Load JS)
- ✅ Tree-shaking and code splitting
- ✅ Lazy loading for heavy components
- ✅ Zero unused dependencies

**Benchmarks:**
- Small captures (<1K packets): < 1 second
- Medium captures (1K-10K packets): 2-3 seconds
- Large captures (10K-50K packets): 5-10 seconds
- Very large captures (50K-100K packets): 15-30 seconds
- AI Semantic Search: 5-20 seconds (depends on query complexity)

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

# Phase 4 Migration (for predictive analysis)
# File: supabase-predictive-migration.sql
# Adds learned_patterns table and pattern_signature column
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
ON storage.objecterformance/    # Performance profiling (92 lines) ✨ NEW
│   │   │   ├── predict/        # Predictive analysis (92 lines) ✨ NEW
│   │   │   ├── packet-context/ # Real-time packet insights (137 lines)
│   │   │   ├── suggest-annotation/ # AI annotation suggestions (148 lines)
│   │   │   └── semantic-search/ # Natural language search (206 lines)
│   │   ├── integrations/       # External monitoring integrations ✨ NEW
│   │   │   ├── prometheus/     # Prometheus metrics export (98 lines)
│   │   │   └── webhook/        # Webhook integration (163.foldername(name))[1]);

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

### 7. Run Tests ✨ NEW
```bash
# Run unit tests
npm test

# Run unit tests with UI
npm run test:ui

# Run E2E tests
npm run test:e2e

# View E2E test report
npx playwright show-report
```

## 🏗️ Project Structure

```
AIShark/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main application (783 lines)
│   ├── globals.css             # Global styles & Tailwind
│   ├── api/
│   │   ├── analyze/            # AI API routes
│   │   │   ├── summary/        # AI capture summary
│   │   │   ├── anomaly/        # Anomaly detection
│   │   │   ├── query/          # Natural language queries
│   │   │   ├── explain-packet/ # Packet explanation
│   │   │   ├── troubleshoot/   # Troubleshooting assistant
│   │   AdvancedFilterBar.tsx   # Advanced filtering with regex (377 lines) ✨ NEW
│   ├── FilterPresetManager.tsx # Filter preset management (301 lines) ✨ NEW
│   ├── Statistics.tsx          # Statistics dashboard
│   ├── AnalysisReport.tsx      # Issue detection report
│   ├── AIInsights.tsx          # AI analysis display (248 lines)
│   ├── ChatInterface.tsx       # AI chat interface
│   ├── CompareCaptures.tsx     # Capture comparison
│   ├── ExportTools.tsx         # Export functionality
│   ├── PerformanceReport.tsx   # Performance profiling dashboard (266 lines) ✨ NEW
│   ├── PredictiveInsights.tsx  # ML-based predictions (281 lines) ✨ NEW
│   ├── RemediationGuide.tsx    # Interactive remediation checklists (321 lines) ✨ NEW
│   ├── IntegrationSettings.tsx # Monitoring integrations UI (349 lines) ✨ NEWs (123 lines)
│   │       ├── revoke/         # Revoke share links (84 lines)
│   │       └── [token]/        # Fetch share data (124 lines)
│   ├── share/
│   │   └── [token]/            # Public share view page with PDF export (377 lines)
│   └── auth/
│       └── callback/           # Supabase auth callback
├── components/
│   ├── FileUpload.tsx          # Drag-and-drop file upload
│   ├── PacketList.tsx          # Virtual scrolling packet list
│   ├── PacketDetails.tsx       # Detailed packet viewer with AI annotations (513 lines)
│   ├── FilterBar.tsx           # Search & filter controls (144 lines)
│   ├── Statistics.tsx          # Statistics dashboard
│   ├── filter-engine.ts        # Advanced filtering engine (297 lines) ✨ NEW
│   ├── filter-presets.ts       # Filter preset management (233 lines) ✨ NEW
│   ├── performance-analyzer.ts # Performance profiling (317 lines) ✨ NEW
│   ├── predictive-analyzer.ts  # ML pattern analysis (320 lines) ✨ NEW
│   ├── session-manager.ts      # Session save/load (348 lines)
│   ├── annotation-manager.ts   # Packet annotations (115 lines)
│   ├── supabase-client.ts      # Supabase configuration
│   ├── auth-context.tsx        # Auth context provider
│   ├── use-keyboard-shortcuts.ts # Keyboard shortcuts hook
│   ├── ai-cache.ts             # AI response cache (84 lines)
│   ├── export.ts               # Export utilities
│   ├── pdf-export.ts           # PDF report generation (317 lines) ✨ NEW
│   ├── utils.ts                # Helper functions
│   └── ai/
│       ├── client.ts           # AI client wrapper (172 lines)
│       ├── context-builder.ts  # AI prompt context with optimization (317 lines)
│       └── prompts.ts          # AI prompt templates (196 lines)wn
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
│   ├── annotation-manager.ts   # Packet annotations (115 (205 lines)
│   └── database.ts             # Supabase type definitions (extended for Phase 4)
├── scripts/
│   ├── test-db-connection.ts   # Database connection test
│   └── verify-schema.ts        # Schema validation
├── docs/
│   ├── IMPROVEMENT_PLAN.md     # Comprehensive 5-phase roadmap
│   ├── PHASE1_COMPLETION_REPORT.md # Phase 1 completion details
│   ├── PHASE2_FEASIBILITY_ASSESSMENT.md # Phase 2 planning
│   ├── KEYBOARD_SHORTCUTS.md   # Complete shortcuts reference
│   ├── AI_INTEGRATION.md       # AI integration guide
│   ├── SUPABASE-INTEGRATION-REPORT.md # Database setup
│   ├── AUDIT_REPORT.md         # Security and performance audit
│   ├── IMPLEMENTATION_SUMMARY.md # Phase 4 implementation details ✨ NEW
│   └── DEPLOYMENT.md           # Deployment instructions
├── supabase-schema.sql         # Database schema
├── supabase-predictive-migration.sql # Phase 4 database migration ✨ NEW
│   ├── packet.ts               # Packet type definitions
│   └── database.ts             # Supabase type definitions
├── scripts/
│   ├── test-db-connection.ts   # Database connection test
│   └── verify-schema.ts        # Schema validation
├── docs/
│   ├── IMPROVEMENT_PLAN.md     # Comprehensive 5-phase roadmap
│   ├── PHASE1_COMPLETION_REPORT.md # Phase 1 completion details
│   ├── PHASE2_FEASIBILITY_ASSESSMENT.md # Phase 2 planning
│   ├── KEYBOARD_SHORTCUTS.md   # Complete shortcuts reference
│   ├── AI_INTEGRATION.md       # AI integration guide
│   ├── SUPABASE-INTEGRATION-REPORT.md # Database setup
│   ├── AUDIT_REPORT.md         # Security and performance audit
│   └── DEPLOYMENT.md           # Deployment instructions
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
- **AI Semantic Search**: Use natural language to find packets
  - "find all HTTP errors"
  - "show retransmissions"
  - "DNS failures"
  - "large file transfers"
  - "connections to port 443"
- **Real-Time AI Assistant**: Click any packet to see AI insights (1-second delay)
- **AI Chat**: Press `A` or click "AI Assistant" to ask questions
  - "Show me all failed connections"
  - "What's causing the high latency?"
  - "Explain this TLS handshake"
- **AI Annotations**: Click "AI Suggest" when adding packet notes
  - Get intelligent annotation with severity level
  - Edit or accept the suggestion
  - Save to your session

### 4. Save & Share
- **Save Session**: Press `Ctrl+S` or click "Save Session"
- **Name your session** for easy retrieval
- **AI insights** are automatically saved
- **Load History**: Access past sessions from user menu
  - **Sort & Filter**: Sort by date/name/size/packets, filter by date range (7/30 days) and file size
  - **Compare Sessions**: Select 2 sessions to compare side-by-side
  - **Export PDF**: Download professional PDF reports from history
- **Share Sessions**: Generate public shareable links
  - Set expiration dates or make permanent
  - Track view counts
  - Revoke shares anytime
- **Compare Captures**: Analyze differences between sessions with visual percentage diffs

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
- `A` - Toggle SharkAI assistant
- `N`/`P` - Jump to error packets
- `Home`/`End` - Jump to first/last packet
- `Page Up`/`Page Down` - Navigate pages
- `↑`/`↓` - Select previous/next packet
- `Esc` - Close any modal

## 🔮 Future Updates

The following features are planned for future releases:

### Mini-map / Overview Scrollbar
- **Visual overview** - A compact scrollbar that shows the entire packet list structure
- **Color-coded markers** - Highlights for errors, selected packets, and protocol distribution
- **Click-to-jump** - Click anywhere on the mini-map to navigate instantly
- **Hover preview** - Shows packet info on hover before jumping

*This feature is documented for future implementation as part of the enhanced navigation experience.*

## 📈 Roadmap

### ✅ Phase 1: Foundation & Performance (COMPLETE)
- [x] Supabase storage bucket setup
- [x] AI insights persistence with sessions
- [x] Web Worker processing (7-10x speedup)
- [x] Keyboard shortcuts & accessibility
- [x] ARIA labels for screen readers
- [x] Session save/load functionality
- [x] User authentication with Supabase

### ✅ Phase 2: AI Maximization (COMPLETE)
- [x] **Task 1**: AI context optimization with token counting
- [x] **Task 2**: Real-time AI packet assistant with debounce
- [x] **Task 3**: AI-assisted annotations with severity detection
- [x] **Task 4**: AI semantic search with natural language queries
- [x✅ Phase 4: Advanced Features (COMPLETE)
- [x] **Task 1**: Predictive network analysis with ML pattern recognition
- [x] **Task 2**: Advanced filtering with regex support and presets
- [x] ~~**Task 3**: Custom protocol analyzers (plugin system)~~ - Skipped
- [x] **Task 4**: Performance profiling and bottleneck detection
- [x] **Task 5**: Automated remediation suggestions with interactive checklists
- [x] **Task 6**: Integration with monitoring tools (Prometheus, Webhooks)

### 🎯 **Share token generation** with cryptographically secure tokens
- [x] **Expiration controls** - Set links to expire after N days or never
- [x] **Share management** - Revoke shares anytime, track view counts
- [x] **Read-only share page** - Professional landing page for shared analyses
- [x] **Enhanced session history** - Sort by date/name/size/packets, filter by date range & file size
- [x] **Session comparison tools** - Side-by-side analysis with percentage diffs
- [x] **PDF export** - Professional PDF reports with charts, tables, and AI insights

### 🎯 Phase 4: Advanced Features (Planned)
- [ ] Predictive network analysis with ML
- [ ] Advanced filtering with regex support
- [ ] Custom protocol analyzers (plugin system)
- [ ] Performance profiling and bottleneck detection
- [ ] Automated remediation suggestions
- [ ] Integration with monitoring tools

### ✨ Phase 5: Polish & Scale (Planned)
- [ ] Dark mode theme
- [ ] Interactive onboarding tutorial
- [ ] Comprehensive testing suite (Jest, Playwright)
- [ ] Production error handling (Sentry)
- [ ] Performance monitoring (Vercel Analytics)
- [ ] Multi-language support (i18n)
- [ ] Mobile responsive improvements

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
, 3 & 4
## 🌟 Star History

If you find this project helpful, please consider giving it a star ⭐

## 📊 Project Stats

![GitHub stars](https://img.shields.io/github/stars/yourusername/aishark?style=social)
![GitHub forks](https://img.shields.io/github/forks/yourusername/aishark?style=social)
![GitHub issues](https://img.shields.io/github/issues/yourusername/aishark)
![GitHub pull requests](https://img.shields.io/github/issues-pr/yourusername/aishark)

---

**Built with ❤️ for network engineers, security professionals, and DevOps teams**

**Status:** Phase 6 Complete ✅ | Active Development | Production Ready

*Last Updated: February 3, 2026*
