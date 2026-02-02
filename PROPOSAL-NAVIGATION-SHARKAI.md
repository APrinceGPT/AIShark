# Proposal: Enhanced Navigation & SharkAI Floating Assistant

**Date:** February 3, 2026  
**Author:** GitHub Copilot  
**Status:** Pending Review  

---

## Executive Summary

This proposal outlines the implementation of enhanced packet navigation controls and a floating AI assistant called **SharkAI**. The goal is to improve user experience when working with large packet captures by providing intuitive navigation tools and allowing users to interact with AI while viewing packet data.

---

## Phase 1: Floating Navigation Toolbar

### Overview
A floating toolbar that provides quick navigation controls for large packet lists. The toolbar will be positioned at the bottom-right of the packet list area and will be non-intrusive.

---

### Task 1.1: Navigation Toolbar Component

**File:** `components/PacketNavigationToolbar.tsx` (NEW)

**Description:** Create a floating toolbar with the following controls:

**UI Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│  ⬆ Top  │  ⬇ Bottom  │  ◀ Prev  │  Page 1/264  │  ▶ Next  │    │
├─────────────────────────────────────────────────────────────────┤
│  Show: [100 ▼ | 500 | 1000 | 10000]  │  Go to: [____] [Go]    │
├─────────────────────────────────────────────────────────────────┤
│  ◀ Prev Error  │  3 errors found  │  Next Error ▶             │
└─────────────────────────────────────────────────────────────────┘
```

**Features:**
- Jump to Top / Jump to Bottom buttons
- Previous / Next page navigation
- Current page indicator (e.g., "Page 1 of 264")
- Page size selector: 100, 500, 1000 (default), 10000
- "Go to packet #" input field
- Previous/Next Error buttons with error count badge
- Collapsible/minimizable for less screen clutter

**Props:**
```typescript
interface PacketNavigationToolbarProps {
  totalPackets: number;
  currentPage: number;
  pageSize: number;
  errorCount: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onJumpToPacket: (packetNumber: number) => void;
  onJumpToTop: () => void;
  onJumpToBottom: () => void;
  onNextError: () => void;
  onPrevError: () => void;
}
```

**Estimated Time:** 1.5 hours

---

### Task 1.2: Integrate Navigation with PacketList

**File:** `components/PacketList.tsx` (MODIFY)

**Description:** Update PacketList to work with the new navigation toolbar:

- Add `pageSize` state with default value of 1000
- Calculate `currentPage` and `totalPages` based on scroll position
- Implement `scrollToPacket(packetNumber)` function
- Implement `scrollToPage(pageNumber)` function
- Pass error packet count to toolbar

**Changes:**
```typescript
// New state
const [pageSize, setPageSize] = useState(1000);

// Computed values
const currentPage = Math.floor(visibleRange.start / pageSize) + 1;
const totalPages = Math.ceil(packets.length / pageSize);

// New functions
const scrollToPacket = (packetNumber: number) => { ... };
const scrollToPage = (pageNumber: number) => { ... };
```

**Estimated Time:** 45 minutes

---

### Task 1.3: Keyboard Navigation Enhancement

**File:** `lib/use-keyboard-shortcuts.ts` (MODIFY)

**Description:** Add new keyboard shortcuts for navigation:

| Key | Action |
|-----|--------|
| `Page Up` | Go to previous page |
| `Page Down` | Go to next page |
| `Home` | Jump to first packet |
| `End` | Jump to last packet |
| `↑` Arrow Up | Select previous packet |
| `↓` Arrow Down | Select next packet |
| `N` | Next error (existing) |
| `P` | Previous error (existing) |

**Estimated Time:** 30 minutes

---

### Task 1.4: Update Keyboard Shortcuts Modal

**File:** `components/KeyboardShortcutsModal.tsx` (MODIFY)

**Description:** Add new navigation shortcuts to the help modal.

**Estimated Time:** 15 minutes

---

## Phase 2: SharkAI Floating Assistant

### Overview
Transform the existing "Ask AI" chat interface into a floating, draggable assistant named **SharkAI**. This allows users to:
- View packets while chatting with AI
- See AI Insights and correlate with packet details
- Maintain context across different views

---

### Task 2.1: SharkAI Floating Container Component

**File:** `components/SharkAIAssistant.tsx` (NEW)

**Description:** Create a floating, resizable chat container for SharkAI.

**UI Layout:**
```
┌─────────────────────────────────────────────┐
│ 🦈 SharkAI                      [_] [□] [×] │
├─────────────────────────────────────────────┤
│                                             │
│  Chat messages area                         │
│  (scrollable)                               │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ AI response with formatted text     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ User message                        │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│ [Type your question...]            [Send]  │
└─────────────────────────────────────────────┘
```

**Features:**
- Floating window (default: bottom-right, above navigation toolbar)
- Draggable header (user can reposition)
- Resizable (minimum 320px width, 400px height)
- Minimize button (collapse to icon only)
- Maximize button (expand to larger view)
- Close button (hide assistant)
- Persist position during session (not in localStorage)
- SharkAI branding with shark icon 🦈

**Props:**
```typescript
interface SharkAIAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  packets: Packet[];
  selectedPacket: Packet | null;
  statistics: PacketStatistics | null;
  analysis: AnalysisResult | null;
}
```

**Estimated Time:** 2 hours

---

### Task 2.2: Migrate Chat Logic to SharkAI

**File:** `components/SharkAIAssistant.tsx` (CONTINUE)

**Description:** Move existing chat functionality from ChatInterface to SharkAI:

- Message history state
- Send message to `/api/analyze/query`
- Streaming response handling
- Message formatting with `FormattedAIResponse`
- Context awareness (selected packet, statistics, analysis)

**Reuse from:** `components/ChatInterface.tsx`

**Estimated Time:** 1 hour

---

### Task 2.3: SharkAI Toggle Button

**File:** `app/page.tsx` (MODIFY)

**Description:** Add a floating button to toggle SharkAI visibility.

**UI:**
```
┌─────────────┐
│ 🦈 SharkAI  │  (floating button, bottom-right)
└─────────────┘
```

**Behavior:**
- Click to open SharkAI floating assistant
- Badge showing unread AI insights (optional)
- Keyboard shortcut: `A` (existing) now opens SharkAI instead of switching view

**Estimated Time:** 30 minutes

---

### Task 2.4: Update Page Layout

**File:** `app/page.tsx` (MODIFY)

**Description:** Integrate SharkAI with the main page:

- Add `showSharkAI` state
- Remove "Ask AI" from view tabs (or keep as fallback)
- SharkAI appears as floating overlay, not replacing content
- Ensure z-index layering is correct:
  - Base content: z-0
  - Navigation toolbar: z-40
  - SharkAI: z-50
  - Modals: z-60

**Estimated Time:** 45 minutes

---

### Task 2.5: Context-Aware Responses

**File:** `components/SharkAIAssistant.tsx` (CONTINUE)

**Description:** Enhance SharkAI with context awareness:

- When a packet is selected, SharkAI can reference it
- "Ask about this packet" quick action button
- Show selected packet summary in SharkAI header
- Suggested questions based on current view:
  - "What's wrong with this packet?"
  - "Explain this protocol"
  - "Find similar packets"

**Estimated Time:** 1 hour

---

## Phase 3: Documentation & Polish

### Task 3.1: Update README

**File:** `README.md` (MODIFY)

**Description:** Document new features:
- Navigation toolbar usage
- SharkAI assistant features
- New keyboard shortcuts
- Add to "What's New" section

**Also add to README - Future Updates section:**
- Mini-map/Overview scrollbar (Option 4 from earlier discussion)

**Estimated Time:** 30 minutes

---

### Task 3.2: Update Keyboard Shortcuts Documentation

**File:** `KEYBOARD_SHORTCUTS.md` (MODIFY)

**Description:** Add new navigation shortcuts to documentation.

**Estimated Time:** 15 minutes

---

## Implementation Timeline

| Phase | Task | Estimated Time |
|-------|------|----------------|
| **Phase 1** | Navigation Toolbar | **3 hours** |
| 1.1 | Navigation Toolbar Component | 1.5 hours |
| 1.2 | Integrate with PacketList | 45 minutes |
| 1.3 | Keyboard Navigation | 30 minutes |
| 1.4 | Update Shortcuts Modal | 15 minutes |
| **Phase 2** | SharkAI Assistant | **5.25 hours** |
| 2.1 | Floating Container Component | 2 hours |
| 2.2 | Migrate Chat Logic | 1 hour |
| 2.3 | Toggle Button | 30 minutes |
| 2.4 | Update Page Layout | 45 minutes |
| 2.5 | Context-Aware Responses | 1 hour |
| **Phase 3** | Documentation | **45 minutes** |
| 3.1 | Update README | 30 minutes |
| 3.2 | Update Keyboard Shortcuts | 15 minutes |
| | **Total** | **~9 hours** |

---

## Files to Create

1. `components/PacketNavigationToolbar.tsx` - Navigation controls
2. `components/SharkAIAssistant.tsx` - Floating AI chat

## Files to Modify

1. `components/PacketList.tsx` - Integration with navigation
2. `lib/use-keyboard-shortcuts.ts` - New shortcuts
3. `components/KeyboardShortcutsModal.tsx` - Help updates
4. `app/page.tsx` - SharkAI integration
5. `README.md` - Documentation
6. `KEYBOARD_SHORTCUTS.md` - Shortcut docs

---

## Design Decisions

### Navigation Toolbar
- **Position:** Fixed bottom-right, above SharkAI button
- **Style:** Semi-transparent background, blur effect
- **Collapsible:** Yes, to minimize icon when not needed

### SharkAI Assistant
- **Name:** SharkAI (combining Shark + AI theme)
- **Icon:** 🦈 shark emoji or custom SVG
- **Default Size:** 400px × 500px
- **Min Size:** 320px × 400px
- **Position:** Bottom-right corner
- **Draggable:** Yes
- **Resizable:** Yes

### Page Size Options
- 100 packets (for slow connections/devices)
- 500 packets
- **1000 packets (default)**
- 10000 packets (for power users)

---

## Questions for Reviewer

1. Should SharkAI remember conversation history when closed and reopened?
2. Should the navigation toolbar auto-hide after inactivity?
3. Should we add sound/haptic feedback for navigation actions?
4. Preferred shark icon style: emoji 🦈 or custom SVG?

---

## Approval

- [x] Phase 1 approved ✅ IMPLEMENTED
- [x] Phase 2 approved ✅ IMPLEMENTED
- [x] Phase 3 approved ✅ IMPLEMENTED

**Implementation Complete: February 3, 2026**

---

*All phases have been successfully implemented and tested.*
