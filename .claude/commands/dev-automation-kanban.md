---
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Task, TodoWrite, WebFetch
description: Build an AI-powered Kanban board for automated software development workflow management with Next.js 15
argument-hint: [project-name]
model: sonnet
---

# Automated Software Development Kanban Board

Create a Next.js 15 application with an intelligent Kanban/Jira-style board that automates software development workflows. The system includes AI-powered task automation, CI/CD integration, real-time collaboration, and analytics.

## Variables

### Dynamic Variables
- `$1`: Project name (default: "dev-automation-board")

### Static Variables
- **Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, ShadCN UI components
- **Drag & Drop**: @dnd-kit (modern, actively maintained)
- **State Management**: Zustand for client state
- **Data Persistence**: IndexedDB (via Dexie.js)
- **AI Integration**: Claude API for task automation
- **Real-time**: WebSocket with built-in Next.js support or local pub/sub
- **Charts**: Recharts for analytics dashboard

## Instructions

### Core Requirements

1. **Build Quality**
   - Run `pnpm build` (or `npm run build`) at completion - build MUST succeed
   - Resolve ALL TypeScript errors (0 errors required)
   - Ensure all ESLint errors are fixed
   - All features must be functional in production build

2. **Code Standards**
   - Use TypeScript strict mode
   - Implement proper error boundaries
   - Add loading states for all async operations
   - Follow Next.js 15 App Router conventions
   - Use React Server Components where appropriate

3. **Security**
   - Sanitize all user inputs
   - Implement proper API route protection
   - Store sensitive data (API keys) in environment variables
   - Use HTTPS in production

## Codebase Structure

```
<project-name>/
├── app/
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Main Kanban board view
│   ├── board/
│   │   ├── [id]/
│   │   │   └── page.tsx        # Individual board view
│   │   └── components/
│   │       ├── KanbanBoard.tsx      # Main board component
│   │       ├── KanbanColumn.tsx     # Lane/column component
│   │       ├── TaskCard.tsx         # Individual task card
│   │       ├── TaskModal.tsx        # Task creation/edit modal
│   │       └── DragOverlay.tsx      # Custom drag overlay
│   ├── analytics/
│   │   └── page.tsx            # Analytics dashboard
│   ├── settings/
│   │   └── page.tsx            # Configuration & integrations
│   └── api/
│       ├── tasks/
│       │   ├── route.ts        # CRUD operations
│       │   └── [id]/route.ts   # Single task operations
│       ├── ai/
│       │   ├── automate/route.ts    # AI task automation
│       │   ├── analyze/route.ts     # Task analysis
│       │   └── suggest/route.ts     # Smart suggestions
│       ├── integrations/
│       │   ├── github/route.ts      # GitHub webhook handler
│       │   ├── gitlab/route.ts      # GitLab webhook handler
│       │   └── jenkins/route.ts     # Jenkins integration
│       └── websocket/route.ts       # Real-time updates
├── components/
│   ├── ui/                     # ShadCN UI components
│   ├── providers/
│   │   ├── ThemeProvider.tsx
│   │   └── StoreProvider.tsx
│   ├── charts/
│   │   ├── BurndownChart.tsx
│   │   ├── VelocityChart.tsx
│   │   └── BottleneckAnalysis.tsx
│   └── integrations/
│       ├── GitHubConnect.tsx
│       └── CIPipelineStatus.tsx
├── lib/
│   ├── db/
│   │   ├── schema.ts           # IndexedDB schema
│   │   ├── client.ts           # Dexie.js client
│   │   └── migrations.ts       # Database migrations
│   ├── store/
│   │   ├── boardStore.ts       # Board state (Zustand)
│   │   ├── taskStore.ts        # Task state
│   │   └── settingsStore.ts    # User settings
│   ├── ai/
│   │   ├── taskAutomation.ts   # AI automation logic
│   │   ├── testGenerator.ts    # Auto-generate test cases
│   │   └── codeReviewSummary.ts # Code review insights
│   ├── integrations/
│   │   ├── github.ts           # GitHub API client
│   │   ├── gitlab.ts           # GitLab API client
│   │   └── cicd.ts             # CI/CD pipeline integration
│   ├── analytics/
│   │   ├── metrics.ts          # Calculate metrics
│   │   └── reports.ts          # Generate reports
│   └── utils/
│       ├── cn.ts               # Class name utility
│       ├── dates.ts            # Date formatting
│       └── validators.ts       # Input validation
├── types/
│   ├── board.ts                # Board type definitions
│   ├── task.ts                 # Task type definitions
│   └── integration.ts          # Integration types
├── hooks/
│   ├── useBoard.ts             # Board operations
│   ├── useTasks.ts             # Task CRUD
│   ├── useAI.ts                # AI automation hooks
│   └── useRealtime.ts          # Real-time updates
├── public/
│   └── icons/                  # Custom icons
├── .env.local.example          # Environment variables template
├── next.config.mjs             # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies
```

## Workflow

### Phase 1: Project Initialization

**Dependencies:** None
**Execution Mode:** Sequential
**Subprocess Strategy:** Execute setup commands directly

#### Step-by-Step

1. Create Next.js 15 project with TypeScript and Tailwind CSS
   ```bash
   pnpx create-next-app@latest $1 --typescript --tailwind --app --no-src-dir --import-alias "@/*"
   cd $1
   ```

2. Install core dependencies
   ```bash
   pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities zustand dexie dexie-react-hooks @anthropic-ai/sdk recharts date-fns lucide-react
   ```

3. Install ShadCN UI and initialize
   ```bash
   pnpm add -D @shadcn/ui
   pnpx shadcn@latest init -d
   ```

4. Install ShadCN components (parallel installation possible)
   ```bash
   pnpx shadcn@latest add button card dialog input label select textarea badge avatar dropdown-menu popover separator tabs toast
   ```

5. Create directory structure
   ```bash
   mkdir -p app/board/{components,[id]} app/analytics app/settings app/api/{tasks/{[id]},ai,integrations,websocket} components/{ui,providers,charts,integrations} lib/{db,store,ai,integrations,analytics,utils} types hooks public/icons
   ```

**Parallel Execution:** Steps 2-4 can run in parallel after step 1

---

### Phase 2: Core Infrastructure Setup

**Dependencies:** Phase 1
**Execution Mode:** Parallel (3 independent subagents)
**Subprocess Strategy:** Use Task tool to parallelize database, state management, and type definitions

#### Task 2.1: Database Schema & Client (Subagent 1)

Create IndexedDB schema and Dexie.js client:

- `lib/db/schema.ts` - Define Board, Task, Label, Comment tables
- `lib/db/client.ts` - Initialize Dexie database
- `lib/db/migrations.ts` - Version management

**Key Features:**
- Offline-first architecture
- Automatic sync when online
- Indexed fields for fast queries

#### Task 2.2: Zustand State Stores (Subagent 2)

Create centralized state management:

- `lib/store/boardStore.ts` - Board CRUD, active board
- `lib/store/taskStore.ts` - Task CRUD, drag state, filters
- `lib/store/settingsStore.ts` - User preferences, theme, integrations

**Key Features:**
- Persist to IndexedDB via middleware
- Optimistic updates
- Undo/redo support

#### Task 2.3: TypeScript Type Definitions (Subagent 3)

Define all types:

- `types/board.ts` - Board, Column/Lane, BoardSettings
- `types/task.ts` - Task, TaskStatus, Priority, Label, Comment
- `types/integration.ts` - GitHubConfig, GitLabConfig, CIPipeline

**Key Features:**
- Strict typing for all entities
- Discriminated unions for task states
- Branded types for IDs

**Parallel Execution:** All 3 tasks run simultaneously via Task tool

---

### Phase 3: UI Components Development

**Dependencies:** Phase 2 (types and stores must exist)
**Execution Mode:** Parallel (4 independent subagents)
**Subprocess Strategy:** Use Task tool for component development

#### Task 3.1: Drag & Drop Components (Subagent 1)

Build with @dnd-kit:

- `app/board/components/KanbanBoard.tsx` - Board container with DndContext
- `app/board/components/KanbanColumn.tsx` - Droppable column with SortableContext
- `app/board/components/TaskCard.tsx` - Draggable task card
- `app/board/components/DragOverlay.tsx` - Custom drag preview

**Features:**
- Smooth animations
- Keyboard navigation (accessibility)
- Touch support for mobile
- Auto-scroll when dragging near edges

#### Task 3.2: Task Management UI (Subagent 2)

- `app/board/components/TaskModal.tsx` - Create/edit tasks
- `components/TaskDetails.tsx` - Detailed task view with comments
- `components/TaskFilters.tsx` - Filter by assignee, label, priority

**Features:**
- Rich text editor for descriptions
- Attachment support
- @mentions for collaboration
- Due date picker with calendar

#### Task 3.3: Analytics Components (Subagent 3)

- `components/charts/BurndownChart.tsx` - Track progress over time
- `components/charts/VelocityChart.tsx` - Team velocity metrics
- `components/charts/BottleneckAnalysis.tsx` - Identify slow lanes
- `app/analytics/page.tsx` - Analytics dashboard layout

**Features:**
- Interactive Recharts visualizations
- Export to CSV/PNG
- Date range filters
- Customizable metrics

#### Task 3.4: Integration Components (Subagent 4)

- `components/integrations/GitHubConnect.tsx` - Connect GitHub repos
- `components/integrations/CIPipelineStatus.tsx` - CI/CD status badges
- `app/settings/page.tsx` - Configuration UI

**Features:**
- OAuth flow for GitHub/GitLab
- Webhook setup instructions
- Test connection button
- Linked PR/issue display on tasks

**Parallel Execution:** All 4 UI development tasks run simultaneously

---

### Phase 4: AI Automation System

**Dependencies:** Phase 2 (stores), Phase 3.1 (board components)
**Execution Mode:** Parallel (3 independent subagents)
**Subprocess Strategy:** Use Task tool for AI feature development

#### Task 4.1: AI Task Automation (Subagent 1)

- `lib/ai/taskAutomation.ts` - Rule-based task movement logic
- `app/api/ai/automate/route.ts` - API endpoint for automation

**Features:**
- Auto-move tasks based on:
  - CI/CD pipeline status (tests pass → "Running Tests" to "Code Review")
  - PR merge → "Code Review" to "Release"
  - GitHub issue closed → "In Progress" to "Finish"
- Configurable automation rules
- Manual override capability

#### Task 4.2: Test Case Generator (Subagent 2)

- `lib/ai/testGenerator.ts` - Claude API integration for test generation
- `app/api/ai/analyze/route.ts` - Analyze task and generate tests

**Features:**
- Read task description and code context
- Generate unit, integration, and E2E test templates
- Support multiple testing frameworks (Jest, Vitest, Playwright)
- Add tests as task checklist items

#### Task 4.3: Code Review Summary (Subagent 3)

- `lib/ai/codeReviewSummary.ts` - Summarize PR reviews with Claude
- `app/api/ai/suggest/route.ts` - Smart suggestions

**Features:**
- Fetch PR comments from GitHub/GitLab
- Summarize review feedback
- Highlight blockers vs. nitpicks
- Suggest next actions
- Display summary in task card

**Parallel Execution:** All 3 AI features run simultaneously

---

### Phase 5: CI/CD Integration

**Dependencies:** Phase 2 (stores), Phase 4.1 (task automation)
**Execution Mode:** Parallel (3 integration subagents)
**Subprocess Strategy:** Use Task tool for each integration type

#### Task 5.1: GitHub Integration (Subagent 1)

- `lib/integrations/github.ts` - Octokit client wrapper
- `app/api/integrations/github/route.ts` - Webhook receiver

**Webhook Events:**
- `push` - Update task with latest commit
- `pull_request` (opened, merged, closed) - Move task, add PR link
- `check_suite` (completed) - Update test status
- `issue_comment` - Add to task comments

#### Task 5.2: GitLab Integration (Subagent 2)

- `lib/integrations/gitlab.ts` - GitLab API client
- `app/api/integrations/gitlab/route.ts` - Webhook receiver

**Webhook Events:**
- Pipeline events - Update CI/CD status
- Merge request events - Auto-move tasks
- Issue events - Sync with tasks

#### Task 5.3: Generic CI/CD Integration (Subagent 3)

- `lib/integrations/cicd.ts` - Support Jenkins, CircleCI, GitLab CI
- `app/api/integrations/jenkins/route.ts` - Generic webhook handler

**Features:**
- Parse common CI/CD webhook formats
- Extract build status, test results, logs
- Display pipeline status on task cards
- Trigger builds via API (optional)

**Parallel Execution:** All 3 integrations run simultaneously

---

### Phase 6: Real-time Collaboration

**Dependencies:** Phase 2 (stores), Phase 3 (UI components)
**Execution Mode:** Sequential
**Subprocess Strategy:** Execute in main context (requires coordination)

#### Step-by-Step

1. Set up WebSocket server (Next.js API route or separate service)
   - `app/api/websocket/route.ts`

2. Implement presence system
   - Track active users on board
   - Show user avatars with cursor position
   - Typing indicators

3. Build real-time sync
   - Broadcast task updates (create, update, delete, move)
   - Optimistic UI updates with conflict resolution
   - Last-write-wins with timestamps

4. Add collaborative features
   - Live cursor positions
   - @mention notifications
   - Activity feed

5. Create custom hook
   - `hooks/useRealtime.ts` - Subscribe to board updates

**Sequential Execution:** Real-time features require careful ordering

---

### Phase 7: Analytics & Reporting

**Dependencies:** Phase 2 (stores), Phase 3.3 (chart components)
**Execution Mode:** Parallel (2 subagents)
**Subprocess Strategy:** Use Task tool for metrics and UI

#### Task 7.1: Metrics Calculation (Subagent 1)

- `lib/analytics/metrics.ts` - Calculate all metrics

**Metrics:**
- **Burndown**: Tasks completed over time vs. ideal line
- **Velocity**: Average tasks completed per sprint/week
- **Cycle Time**: Average time in each lane
- **Throughput**: Tasks completed per time period
- **Bottlenecks**: Lanes with longest average time
- **Work In Progress (WIP)**: Current task count per lane

#### Task 7.2: Analytics Dashboard UI (Subagent 2)

- `app/analytics/page.tsx` - Complete dashboard with all charts
- Date range selector
- Metric cards (velocity, cycle time, WIP limit violations)
- Export functionality

**Parallel Execution:** Metrics logic and UI run simultaneously

---

### Phase 8: Default Lane Configuration

**Dependencies:** Phase 2 (database)
**Execution Mode:** Sequential
**Subprocess Strategy:** Execute in main context

#### Step-by-Step

Create default board with these lanes (columns) as specified:

1. **Todo** - Backlog of tasks to be started
2. **Verifying Details** - Awaiting clarification/requirements
3. **In Progress** - Active development
4. **Writing Tests** - Creating test cases
5. **Running Tests** - Tests executing in CI/CD
6. **Code Review** - Awaiting peer review
7. **Release** - Preparing for deployment
8. **Publish Changelog** - Documenting changes
9. **Finish** - Completed tasks

Implement in:
- `lib/db/schema.ts` - Define default columns
- `lib/db/migrations.ts` - Seed database with default board
- `lib/store/boardStore.ts` - Initialize default board on first load

**Sequential Execution:** Must complete before testing

---

### Phase 9: Polish & Production Readiness

**Dependencies:** All previous phases
**Execution Mode:** Sequential
**Subprocess Strategy:** Execute in main context

#### Step-by-Step

1. **Error Boundaries**
   - Wrap board in error boundary
   - Graceful fallback UI
   - Error reporting to console

2. **Loading States**
   - Skeleton loaders for board
   - Suspense boundaries for async components
   - Loading indicators for AI operations

3. **Responsive Design**
   - Mobile-friendly task cards
   - Collapsible sidebar on small screens
   - Touch-optimized drag & drop

4. **Accessibility**
   - ARIA labels for drag & drop
   - Keyboard shortcuts (j/k navigation, n for new task)
   - Screen reader support
   - Focus management

5. **Performance Optimization**
   - Virtual scrolling for large boards
   - Lazy load analytics charts
   - Debounce search/filter inputs
   - Memoize expensive computations

6. **Documentation**
   - `README.md` - Setup instructions, architecture overview
   - `.env.local.example` - Environment variable template
   - Inline JSDoc comments for complex functions

**Sequential Execution:** Polish tasks must run in order

---

### Phase 10: Testing & Validation

**Dependencies:** All previous phases
**Execution Mode:** Sequential
**Subprocess Strategy:** Execute in main context

#### Step-by-Step

1. **Build Validation**
   ```bash
   pnpm build
   ```
   - MUST succeed with 0 errors
   - Fix all TypeScript errors
   - Fix all ESLint errors

2. **Manual Testing Checklist**
   - [ ] Create a new board
   - [ ] Add tasks to different lanes
   - [ ] Drag tasks between lanes
   - [ ] Edit task details
   - [ ] Test AI automation (if API key provided)
   - [ ] Configure GitHub integration (if repo connected)
   - [ ] View analytics dashboard
   - [ ] Test real-time collaboration (open in 2 tabs)
   - [ ] Test mobile responsiveness
   - [ ] Test keyboard navigation

3. **Performance Audit**
   ```bash
   pnpm build && pnpm start
   ```
   - Lighthouse score > 90
   - First Contentful Paint < 1.5s
   - Time to Interactive < 3s

4. **Browser Compatibility**
   - Test in Chrome, Firefox, Safari
   - Verify IndexedDB works in all browsers

**Sequential Execution:** Must test systematically

---

## Test Suite Generation

### Unit Tests

**Target Files:**
- `lib/db/client.ts` - Database operations
- `lib/store/*.ts` - Zustand stores
- `lib/ai/*.ts` - AI automation logic
- `lib/integrations/*.ts` - API clients
- `lib/analytics/metrics.ts` - Metric calculations

**Test Framework:** Vitest + React Testing Library

**Example Test Structure:**
```typescript
// lib/db/client.test.ts
import { describe, it, expect, beforeEach } from 'vitest'
import { db } from './client'

describe('Database Client', () => {
  beforeEach(async () => {
    await db.tasks.clear()
  })

  it('should create a new task', async () => {
    const task = await db.tasks.add({
      title: 'Test Task',
      status: 'todo',
      createdAt: new Date()
    })
    expect(task).toBeDefined()
  })

  it('should move task between columns', async () => {
    // Test logic
  })
})
```

**Parallel Execution:** All unit tests run simultaneously

---

### Integration Tests

**Target Flows:**
- Task creation → IndexedDB → Zustand → UI update
- Drag & drop → State update → Database persist → Real-time broadcast
- CI/CD webhook → Task update → Lane transition → AI automation
- Analytics calculation → Data aggregation → Chart rendering

**Test Framework:** Vitest + MSW (Mock Service Worker)

**Example:**
```typescript
// app/board/components/KanbanBoard.integration.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { KanbanBoard } from './KanbanBoard'

describe('Kanban Board Integration', () => {
  it('should move task between lanes and persist', async () => {
    render(<KanbanBoard />)

    const task = screen.getByText('Test Task')
    const targetLane = screen.getByTestId('lane-in-progress')

    fireEvent.dragStart(task)
    fireEvent.drop(targetLane)

    // Verify database updated
    const updatedTask = await db.tasks.get(taskId)
    expect(updatedTask.status).toBe('in-progress')
  })
})
```

**Parallel Execution:** Tests with different data can run in parallel

---

### End-to-End Tests

**Test Scenarios:**
1. **Complete Task Lifecycle**
   - Create task → Move through all lanes → Mark as finished
   - Verify each transition
   - Check analytics updated

2. **AI Automation Flow**
   - Create task with code context
   - Trigger test generation
   - Verify test cases added to task

3. **CI/CD Integration**
   - Simulate GitHub webhook (push, PR, check_suite)
   - Verify task auto-moves
   - Check status badges update

4. **Collaboration**
   - Open board in 2 browser contexts
   - Move task in context 1
   - Verify real-time update in context 2

**Test Framework:** Playwright

**Example:**
```typescript
// e2e/task-lifecycle.spec.ts
import { test, expect } from '@playwright/test'

test('complete task lifecycle', async ({ page }) => {
  await page.goto('/')

  // Create task
  await page.click('[data-testid="new-task-button"]')
  await page.fill('input[name="title"]', 'E2E Test Task')
  await page.click('button[type="submit"]')

  // Verify in Todo lane
  const todoLane = page.locator('[data-testid="lane-todo"]')
  await expect(todoLane.locator('text=E2E Test Task')).toBeVisible()

  // Drag to In Progress
  await page.dragAndDrop(
    'text=E2E Test Task',
    '[data-testid="lane-in-progress"]'
  )

  // Continue through all lanes...
})
```

**Sequential Execution:** E2E tests often have dependencies

---

### Edge Cases

1. **Empty Board**
   - Verify empty state message
   - "Create your first task" CTA

2. **Offline Mode**
   - Disable network
   - Perform CRUD operations
   - Re-enable network
   - Verify sync

3. **Large Data Sets**
   - Create 1000+ tasks
   - Test virtual scrolling performance
   - Verify no memory leaks

4. **Concurrent Updates**
   - Two users move same task simultaneously
   - Test conflict resolution (last-write-wins)

5. **API Failures**
   - Mock failed AI requests
   - Verify graceful degradation
   - Show user-friendly error messages

6. **Invalid Webhook Payloads**
   - Send malformed JSON
   - Missing required fields
   - Verify error handling

---

### Validation Commands

#### Flutter Projects (N/A for this project)
```bash
# Not applicable - this is a Next.js project
```

#### React/Next.js Projects
```bash
# Required validations
pnpm build                # MUST succeed with 0 errors
pnpm lint                 # Should pass or only minor warnings
pnpm type-check           # 0 TypeScript errors

# Optional but recommended
pnpm test                 # Run all unit/integration tests
pnpm test:e2e             # Run Playwright E2E tests
pnpm analyze              # Bundle size analysis
```

#### Project-Specific Commands
```bash
# Development
pnpm dev                  # Start dev server on http://localhost:3000

# Production
pnpm build && pnpm start  # Test production build locally

# Testing
pnpm test                 # Run Vitest tests
pnpm test:ui              # Vitest UI mode
pnpm test:coverage        # Coverage report
pnpm test:e2e             # Playwright E2E tests

# Code Quality
pnpm lint                 # ESLint
pnpm lint:fix             # Auto-fix linting issues
pnpm format               # Prettier formatting
pnpm type-check           # TypeScript compiler check

# Database
pnpm db:reset             # Clear IndexedDB (in browser console)
```

---

### Final Quality Assurance

#### Completion Criteria

**React/Next.js Project:**
- [x] `pnpm build` succeeds with 0 errors
- [x] All TypeScript errors resolved
- [x] ESLint errors fixed (warnings acceptable if minor)
- [x] All unit tests pass
- [x] All integration tests pass
- [x] All E2E tests pass
- [x] Manual testing checklist completed

**Common Validation Checklist:**
- [x] All files in correct locations per structure diagram
- [x] Dependencies properly installed (package.json)
- [x] Environment variables documented (.env.local.example)
- [x] README.md with setup instructions
- [x] .gitignore configured
- [x] No console errors in production build
- [x] No memory leaks (Chrome DevTools profiling)
- [x] Lighthouse score > 90
- [x] Mobile responsive (tested on 320px to 1920px widths)
- [x] Keyboard navigation works
- [x] Screen reader compatible (basic ARIA labels)

**Feature Validation:**
- [x] All 9 default lanes created
- [x] Tasks can be created, edited, deleted
- [x] Drag & drop works smoothly
- [x] AI automation triggers correctly
- [x] CI/CD webhooks processed
- [x] Real-time updates work across tabs
- [x] Analytics charts render correctly
- [x] Data persists in IndexedDB
- [x] Offline mode works

---

## Final Deliverables

### 1. Functional Application

A fully working Next.js 15 application with:
- Interactive Kanban board with 9 customizable lanes
- Drag & drop task management
- AI-powered automation (task movement, test generation, code review summaries)
- CI/CD integration (GitHub, GitLab, Jenkins webhooks)
- Real-time collaboration across browser tabs
- Analytics dashboard (burndown, velocity, cycle time, bottlenecks)
- Offline-first with IndexedDB
- Responsive design (mobile, tablet, desktop)

### 2. Documentation

- `README.md` - Setup, architecture, features, deployment guide
- `.env.local.example` - Environment variables with descriptions
- Inline code comments for complex logic
- API endpoint documentation (request/response schemas)

### 3. Configuration Files

- `package.json` - All dependencies and scripts
- `next.config.mjs` - Next.js configuration
- `tsconfig.json` - TypeScript strict mode
- `tailwind.config.ts` - Custom theme
- `.eslintrc.json` - Linting rules
- `.prettierrc` - Code formatting

### 4. Production Build

- Successfully built with `pnpm build`
- No TypeScript errors
- No ESLint errors
- Optimized bundle size
- Ready for deployment to Vercel/Netlify

---

## Final Report

After completing all phases, provide the user with:

### Summary

**Project**: [Project Name]
**Framework**: Next.js 15 + React 19 + TypeScript
**Key Features**: AI Automation, CI/CD Integration, Real-time Collaboration, Analytics
**Build Status**: ✅ Success (0 errors)
**Test Status**: ✅ All tests passing

### Quick Start

```bash
cd [project-name]
pnpm install
cp .env.local.example .env.local
# Add your Anthropic API key to .env.local
pnpm dev
```

Open http://localhost:3000 to see your Kanban board.

### Default Lanes

The board comes pre-configured with these 9 lanes:
1. Todo
2. Verifying Details
3. In Progress
4. Writing Tests
5. Running Tests
6. Code Review
7. Release
8. Publish Changelog
9. Finish

You can customize these in the board settings.

### AI Features

To enable AI automation:
1. Add `ANTHROPIC_API_KEY` to `.env.local`
2. Go to Settings → AI Automation
3. Enable desired automation rules:
   - Auto-move tasks based on CI/CD status
   - Generate test cases for new tasks
   - Summarize code review feedback

### CI/CD Integration

To connect GitHub:
1. Go to Settings → Integrations
2. Click "Connect GitHub"
3. Authorize the app
4. Select repositories to track
5. Configure webhook in GitHub repo settings:
   - Payload URL: `https://your-domain.com/api/integrations/github`
   - Events: Push, Pull Request, Check Suite

### Analytics

Access the analytics dashboard at `/analytics` to view:
- Burndown chart - Track sprint progress
- Velocity chart - Team throughput over time
- Cycle time - Average time in each lane
- Bottleneck analysis - Identify slow lanes

### Real-time Collaboration

- Open the board in multiple browser tabs or share with team members
- See live cursor positions and task updates
- Use @mentions in comments to notify team members

### Next Steps

1. **Customize Lanes**: Modify default lanes to match your workflow
2. **Configure Integrations**: Connect your GitHub/GitLab repos
3. **Set Up Webhooks**: Enable CI/CD automation
4. **Invite Team**: Share the board URL with your team
5. **Deploy**: Push to Vercel or your preferred hosting platform

### Deployment

Deploy to Vercel (recommended):
```bash
pnpm build  # Verify build succeeds
vercel --prod
```

Set environment variables in Vercel dashboard:
- `ANTHROPIC_API_KEY` - Your Claude API key
- `NEXT_PUBLIC_APP_URL` - Your app URL (for webhooks)

### Support

- Check `README.md` for detailed documentation
- Review inline code comments for technical details
- All API routes include request/response examples

---

**Build Validation**: ✅ Production build successful
**Type Safety**: ✅ 0 TypeScript errors
**Code Quality**: ✅ ESLint passed
**Test Coverage**: ✅ All tests passing

Your automated software development Kanban board is ready to use! 🎉
