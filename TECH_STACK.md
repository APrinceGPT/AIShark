# AIShark Technology Stack

Complete inventory of tools, libraries, frameworks, and dependencies used in the AIShark PCAP Analyzer project.

---

## 🏗️ Architecture Overview

| Layer | Technology | Version |
|-------|------------|---------|
| **Frontend** | Next.js (React) | 16.1.5 |
| **Language** | TypeScript | 5.x |
| **Styling** | Tailwind CSS | 4.1.18 |
| **Database** | Supabase (PostgreSQL) | 2.90.1 |
| **AI Engine** | Claude 4 Sonnet | via OpenAI-compatible API |
| **Monitoring** | Sentry | 10.36.0 |
| **Testing** | Vitest + Playwright | 4.0.17 / 1.57.0 |

---

## 🖥️ Frontend (Next.js)

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | ^16.1.5 | React framework with App Router |
| **React** | ^19.2.4 | UI library |
| **React DOM** | ^19.2.4 | React rendering for web |
| **TypeScript** | ^5.x | Type-safe JavaScript |

### UI Components & Styling
| Library | Version | Purpose |
|---------|---------|---------|
| **Tailwind CSS** | ^4.1.18 | Utility-first CSS framework |
| **@tailwindcss/postcss** | ^4.1.18 | PostCSS integration for Tailwind v4 |
| **PostCSS** | ^8.4.0 | CSS transformer |
| **Autoprefixer** | ^10.4.0 | Auto-add vendor prefixes |

### Icons & UI
| Library | Version | Purpose |
|---------|---------|---------|
| **lucide-react** | ^0.562.0 | Icon library (500+ icons) |

### Markdown & Content
| Library | Version | Purpose |
|---------|---------|---------|
| **react-markdown** | ^10.1.0 | Render Markdown in React |
| **remark-gfm** | ^4.0.1 | GitHub Flavored Markdown support |

### PDF Generation
| Library | Version | Purpose |
|---------|---------|---------|
| **jspdf** | ^4.0.0 | PDF document generation |
| **jspdf-autotable** | ^5.0.7 | Table generation for PDFs |

### Utilities
| Library | Version | Purpose |
|---------|---------|---------|
| **date-fns** | ^4.1.0 | Date manipulation library |
| **nanoid** | ^5.1.6 | Unique ID generation |

### User Experience
| Library | Version | Purpose |
|---------|---------|---------|
| **react-joyride** | ^3.0.0-7 | Interactive onboarding tours |

---

## 🗄️ Database & Authentication

### Supabase
| Technology | Version | Purpose |
|------------|---------|---------|
| **@supabase/supabase-js** | ^2.90.1 | Supabase client (Auth, Database, Storage) |

**Features Used:**
- PostgreSQL database for session storage
- Row-Level Security (RLS) for data protection
- OAuth authentication (Google, GitHub)
- Real-time subscriptions
- Session & analysis history persistence

---

## 🤖 AI Integration

| Technology | Details |
|------------|---------|
| **SDK** | openai ^6.16.0 |
| **Model** | Claude 4 Sonnet |
| **Provider** | Trend Micro AI Endpoint (OpenAI-compatible) |
| **Protocol** | REST API with streaming support |

### AI Features
- Intelligent packet summaries
- Anomaly detection & security analysis
- Natural language queries
- Semantic search across packets
- Real-time packet explanations
- AI-assisted annotations
- Troubleshooting recommendations
- Response caching for cost optimization

---

## 📊 Monitoring & Analytics

### Error Tracking
| Library | Version | Purpose |
|---------|---------|---------|
| **@sentry/nextjs** | ^10.36.0 | Error tracking & performance monitoring |

**Sentry Configuration:**
- Server, Edge, and Client instrumentation
- Performance sampling (10%)
- Environment-aware reporting
- Custom error filtering

### Analytics
| Service | Purpose |
|---------|---------|
| **Google Analytics** | Usage tracking & insights |

---

## 🧪 Testing

### Unit Testing
| Tool | Version | Purpose |
|------|---------|---------|
| **Vitest** | ^4.0.17 | Fast unit test runner |
| **@vitest/ui** | ^4.0.17 | Visual test interface |
| **@vitejs/plugin-react** | ^5.1.2 | React plugin for Vite |
| **jsdom** | ^27.4.0 | DOM environment for tests |

### Component Testing
| Tool | Version | Purpose |
|------|---------|---------|
| **@testing-library/react** | ^16.3.2 | React component testing |
| **@testing-library/jest-dom** | ^6.9.1 | DOM matchers |
| **@testing-library/user-event** | ^14.6.1 | User interaction simulation |

### End-to-End Testing
| Tool | Version | Purpose |
|------|---------|---------|
| **@playwright/test** | ^1.57.0 | E2E browser testing |

**Test Coverage:**
- 128 Unit Tests (Vitest)
- 13 E2E Tests (Playwright)
- Coverage reporters: text, JSON, HTML

---

## 🛠️ Development Tools

### Build & Bundle
| Tool | Version | Purpose |
|------|---------|---------|
| **@next/bundle-analyzer** | ^16.1.5 | Bundle size analysis |
| **tsx** | ^4.21.0 | TypeScript execution |

### Code Quality
| Tool | Purpose |
|------|---------|
| **ESLint** | Code linting |
| **eslint-config-next** | Next.js ESLint rules |
| **TypeScript** | Static type checking |

### Type Definitions
| Package | Purpose |
|---------|---------|
| **@types/node** | Node.js types |
| **@types/react** | React types |
| **@types/react-dom** | React DOM types |

### Version Control
| Tool | Purpose |
|------|---------|
| **Git** | Source control |
| **GitHub** | Repository hosting |

### IDE
| Tool | Purpose |
|------|---------|
| **VS Code** | Primary IDE |

---

## 📁 Project Architecture

### Directory Structure
```
app/                    # Next.js App Router
├── api/               # API Routes (11 endpoints)
│   ├── analyze/       # AI analysis endpoints
│   ├── integrations/  # External integrations
│   └── share/         # Session sharing
├── auth/              # Authentication pages
└── share/             # Shared session views

components/             # React components (36 total)
├── AI*.tsx           # AI-powered components
├── *Modal.tsx        # Modal dialogs
└── *.tsx             # Feature components

lib/                    # Core libraries
├── ai/               # AI client & prompts
├── *-analyzer.ts     # Protocol analyzers
├── *-context.tsx     # React contexts
└── *.ts              # Utility modules

types/                  # TypeScript definitions
workers/               # Web Workers
tests/                 # Test suites
├── e2e/              # Playwright tests
└── unit/             # Vitest tests
```

### Key Components (36 Total)
| Category | Components |
|----------|------------|
| **AI Features** | AIInsights, AIPacketAssistant, AISemanticSearch, FormattedAIResponse, PredictiveInsights |
| **Analysis** | AnalysisHistory, AnalysisReport, CompareCaptures, PerformanceReport, Statistics |
| **Packet Views** | PacketList, PacketDetails, TimelineVisualization |
| **Session Management** | SaveSessionModal, SessionComparison, ShareSessionDialog |
| **User Interface** | FilterBar, AdvancedFilterBar, FilterPresetManager, ExportTools |
| **Authentication** | AuthModal, UserProfile |
| **Layout** | Footer, MobileNav, MobileBottomSheet, ThemeToggle |
| **Onboarding** | OnboardingTour, KeyboardShortcutsModal |
| **Utilities** | Toast, ToastContainer, ErrorBoundary |

### API Endpoints (11 Total)
| Endpoint | Purpose |
|----------|---------|
| `/api/analyze/summary` | Generate AI summary |
| `/api/analyze/anomaly` | Detect anomalies |
| `/api/analyze/query` | Natural language queries |
| `/api/analyze/semantic-search` | Semantic packet search |
| `/api/analyze/explain-packet` | Packet explanations |
| `/api/analyze/troubleshoot` | Troubleshooting guide |
| `/api/analyze/predict` | Predictive insights |
| `/api/analyze/compare` | Compare captures |
| `/api/analyze/performance` | Performance analysis |
| `/api/analyze/suggest-annotation` | AI annotations |
| `/api/share` | Session sharing |

---

## 🌐 Browser Features

### Web APIs Used
| API | Purpose |
|-----|---------|
| **Web Workers** | Background PCAP parsing |
| **File API** | File upload handling |
| **ArrayBuffer** | Binary data processing |
| **localStorage** | Theme & preference persistence |
| **Clipboard API** | Copy functionality |

### Protocol Analyzers
| Protocol | File |
|----------|------|
| **PCAP/PCAPNG** | pcap-parser.ts |
| **TCP** | tcp-analyzer.ts |
| **DNS** | dns-analyzer.ts |
| **HTTP** | http-analyzer.ts |
| **TLS/SSL** | tls-analyzer.ts |

---

## 📊 Skills Demonstrated

### Languages
- **TypeScript** - Strict mode, generics, type inference, utility types
- **CSS** - Tailwind utility classes, responsive design, dark mode

### Frontend Skills
- React 19 with hooks and context
- Next.js 16 App Router architecture
- Server/Client component patterns
- Responsive design with dark mode
- Web Workers for background processing
- Custom hooks for state management
- Virtual scrolling for large datasets

### Backend Skills
- RESTful API design with Next.js API routes
- Streaming responses for AI
- File upload & binary parsing
- Session management
- Error handling patterns

### AI/ML Skills
- LLM API integration (OpenAI SDK)
- Prompt engineering for packet analysis
- Context building & token optimization
- Response caching strategies
- Streaming completions

### Database Skills
- PostgreSQL with Supabase
- Row-Level Security policies
- Real-time subscriptions
- OAuth integration

### Testing Skills
- Unit testing with Vitest
- Component testing with Testing Library
- E2E testing with Playwright
- Coverage reporting

### DevOps Skills
- Environment configuration
- Error tracking with Sentry
- Bundle optimization
- Performance monitoring

---

## 📦 Dependency Summary

| Category | Count |
|----------|-------|
| **Production Dependencies** | 16 |
| **Development Dependencies** | 16 |
| **React Components** | 36 |
| **API Endpoints** | 11 |
| **Unit Tests** | 128 |
| **E2E Tests** | 13 |
| **Total Packages** | 32 |

---

## 🏷️ Portfolio Tags

```
React 19, Next.js 16, TypeScript, Tailwind CSS 4, Supabase,
PostgreSQL, Claude AI, OpenAI SDK, Sentry, Vitest, Playwright,
Web Workers, REST API, OAuth, Dark Mode, Responsive Design
```

### Skill Categories
- **Frontend Development** - React 19, Next.js 16, TypeScript, Tailwind CSS 4
- **Backend Development** - Next.js API Routes, REST API, Streaming
- **Database** - Supabase, PostgreSQL, Row-Level Security
- **AI/ML Integration** - LLM APIs, Prompt Engineering, Token Optimization
- **Testing** - Vitest, Playwright, Testing Library, 140+ tests
- **Monitoring** - Sentry, Google Analytics
- **DevOps** - Git, Environment Config, Bundle Analysis
