# Contributing to AIShark

Thank you for your interest in contributing to AIShark! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. Please:

- Be respectful and considerate in all interactions
- Welcome newcomers and help them get started
- Focus on constructive feedback
- Accept different viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 20.x or later
- npm 10.x or later
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AIShark.git
   cd AIShark
   ```
3. Add upstream remote:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/AIShark.git
   ```

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following:
   - `OPENAI_API_KEY` - Your OpenAI API key
   - `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key

3. **Start development server:**
   ```bash
   npm run dev
   ```

4. **Open in browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
AIShark/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── share/             # Shared session pages
├── components/            # React components
├── lib/                   # Core libraries
│   ├── ai/               # AI integration
│   └── *.ts              # Utility libraries
├── types/                 # TypeScript type definitions
├── tests/                 # Test files
│   ├── unit/             # Unit tests
│   └── e2e/              # End-to-end tests
├── docs/                  # Documentation
├── public/               # Static assets
└── scripts/              # Utility scripts
```

### Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/api/analyze/` | AI analysis endpoints |
| `components/` | Reusable UI components |
| `lib/` | Core parsing and analysis logic |
| `types/` | TypeScript interfaces |

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Define explicit types; avoid `any`
- Use interfaces for object shapes
- Prefer `const` over `let`

```typescript
// Good
interface PacketFilter {
  protocols: string[];
  sourceIP?: string;
}

// Avoid
const filter: any = { ... };
```

### React Components

- Use functional components with hooks
- Follow the naming convention: `ComponentName.tsx`
- Use `'use client'` directive for client components
- Implement proper dark mode support

```tsx
'use client';

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export default function Button({ onClick, children }: ButtonProps) {
  return (
    <button 
      onClick={onClick}
      className="bg-blue-500 dark:bg-blue-600 text-white"
    >
      {children}
    </button>
  );
}
```

### Styling

- Use Tailwind CSS for styling
- Include dark mode variants: `dark:bg-gray-800`
- Follow mobile-first responsive design
- Use semantic class names

### File Naming

- Components: `PascalCase.tsx`
- Libraries: `kebab-case.ts`
- Tests: `*.test.ts` or `*.test.tsx`
- Types: `camelCase.ts`

## Testing

### Running Tests

```bash
# Unit tests
npm test

# Unit tests with UI
npm run test:ui

# Coverage report
npm run test:coverage

# E2E tests
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

### Writing Tests

1. **Unit Tests** (`tests/unit/`)
   - Test individual functions and modules
   - Use Vitest and Testing Library
   - Mock external dependencies

   ```typescript
   import { describe, it, expect } from 'vitest';
   import { parsePacket } from '@/lib/parser';

   describe('parsePacket', () => {
     it('should parse TCP packet correctly', () => {
       const result = parsePacket(mockData);
       expect(result.protocol).toBe('TCP');
     });
   });
   ```

2. **E2E Tests** (`tests/e2e/`)
   - Test user flows
   - Use Playwright
   - Test critical paths

   ```typescript
   import { test, expect } from '@playwright/test';

   test('file upload flow', async ({ page }) => {
     await page.goto('/');
     await page.setInputFiles('input[type="file"]', 'sample.pcap');
     await expect(page.locator('.packet-list')).toBeVisible();
   });
   ```

### Test Coverage Requirements

- Aim for 80%+ coverage on new code
- All exported functions should have tests
- Critical paths must have E2E tests

## Pull Request Process

### Before Submitting

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes and test:**
   ```bash
   npm test
   npm run lint
   npm run build
   ```

3. **Commit with clear messages:**
   ```bash
   git commit -m "feat: Add packet filtering by IP range"
   ```
   
   Follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` New feature
   - `fix:` Bug fix
   - `docs:` Documentation
   - `style:` Formatting
   - `refactor:` Code restructuring
   - `test:` Adding tests
   - `chore:` Maintenance

### Submitting

1. Push to your fork
2. Create Pull Request against `main` branch
3. Fill out the PR template
4. Request review

### PR Requirements

- [ ] All tests pass
- [ ] No TypeScript errors
- [ ] Follows coding standards
- [ ] Includes tests for new features
- [ ] Updates documentation if needed
- [ ] Commits are clean and descriptive

## Issue Guidelines

### Bug Reports

Include:
- Clear description
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, browser, Node version)
- Screenshots if applicable

### Feature Requests

Include:
- Problem description
- Proposed solution
- Alternatives considered
- Use cases

### Security Issues

For security vulnerabilities, please email directly rather than creating a public issue.

## Development Tips

### Debugging

1. **Browser DevTools:**
   - React Developer Tools
   - Network tab for API calls

2. **Server Logs:**
   ```bash
   npm run dev
   # Check terminal for server logs
   ```

3. **VS Code:**
   - Use the debugger with provided launch config
   - Install recommended extensions

### Performance

- Run bundle analyzer:
  ```bash
  npm run build:analyze
  ```

- Check for unnecessary re-renders
- Use virtual scrolling for large lists

### Common Issues

**Build Errors:**
```bash
rm -rf .next node_modules
npm install
npm run build
```

**Type Errors:**
```bash
npx tsc --noEmit
```

**Test Failures:**
```bash
npm test -- --run --reporter=verbose
```

## Questions?

- Check existing issues and discussions
- Join our community chat
- Read the documentation

Thank you for contributing to AIShark! 🦈
