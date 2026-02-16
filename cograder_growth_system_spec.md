# CoGrader Growth Sprint System — Full Specification

## Context for the AI Agent

You are building a web application for a 2-3 person Growth team at CoGrader, an EdTech company that sells AI-powered essay grading tools to American teachers and schools. The Growth team's core problem is that they operate in reactive, fragmented mode — too many concurrent workstreams, no calendar anchoring their work to the school year, and no completion tracking. This system fixes that.

The users are Daniel (Growth lead) and Gabriel (COO). They are technical enough to use developer tools but this app should feel polished and professional, not like a dev tool.

### What CoGrader Does
- AI-powered essay grading for teachers (K-12, primarily ELA/writing)
- Serves American public schools — the business is deeply tied to the US school calendar
- Top 3 states by user base: Texas, California, Florida
- Growth team handles SEO, paid ads (Meta, Google, YouTube), social media, content creators, referral/MGM programs

### Why This System Exists
The Growth team needs a centralized system that:
1. Anchors all planning to the American school calendar (state tests, grading crunches, breaks, back-to-school)
2. Enforces focused 2-week sprints with max 3-4 projects (no "hugging the world")
3. Auto-generates sprint plans from weekly meeting transcripts
4. Tracks quarterly goals (NCTs) and connects sprints to those goals
5. Maintains a prioritized backlog using a Calendar-ICE scoring system
6. Keeps a performance log of completed sprints for retrospective

---

## Tech Stack Decision

Choose the best stack for a small, self-hosted web app with these requirements:
- Full-stack TypeScript is strongly preferred
- Needs a backend that can call the Anthropic API (Claude) for transcript processing
- Needs a database for persistent storage (sprints, calendar events, NCTs, backlog, sprint history)
- Should be deployable to Vercel, Railway, or similar
- UI should be clean, modern, minimal — no unnecessary chrome

Suggested (but you decide the best approach):
- **Frontend**: Next.js (App Router) with React + Tailwind CSS
- **Backend**: Next.js API routes or server actions
- **Database**: SQLite via Prisma (simple, file-based, easy to deploy) or PostgreSQL if you prefer
- **AI**: Anthropic Claude API (claude-sonnet-4-5-20250929) for transcript parsing
- **Calendar data**: A combination of static school calendar data + a mechanism to update it (see Calendar section)

---

## Application Architecture

### Tabs / Pages

The app has 5 main tabs in a top navigation:

1. **Overview** — Dashboard home. Shows: current sprint items with progress, upcoming school calendar alerts (next 30 days), NCT progress bars, and the prioritized backlog top 5.

2. **Weekly Kickoff** — Every Monday, the user pastes or uploads a meeting transcript. An AI agent processes it and generates proposed sprint items. The user reviews, edits, and confirms. This becomes the sprint plan for the week/sprint.

3. **School Calendar** — A full calendar view (month grid format showing days) with school events, state tests, breaks, holidays, and marketing-relevant events. Also has a list/timeline view (similar to the prototype). Events trigger alerts when their prep window opens.

4. **Sprints** — The sprint board. Shows current sprint (active items), completed sprints (history/archive), and performance log. Max 3-4 items per sprint.

5. **Settings** — Upload NCTs for the quarter (CSV/spreadsheet format or manual entry). Configure states to track. Manage team members. API key configuration for Anthropic.

---

## Detailed Feature Specifications

### 1. Overview Tab

**Purpose**: At-a-glance view of everything that matters today.

**Layout**: Two-column on desktop, single column on mobile.

**Left column (wider, ~65%)**:
- **Current Sprint** — Card for each active sprint item showing: name, scope tag, owner, status (Not Started / In Progress / Review / Done), task checklist with completion count (e.g., 2/4), deadline, and ICE score badge. Cards are expandable to show definition of done and tasks.
- If no active sprint exists, show a prompt: "No active sprint. Go to Weekly Kickoff to start one."

**Right column (~35%)**:
- **Calendar Alerts** — Events whose prep window is open or event is within 30 days. Each alert shows: event name, state badge, days until event, days until prep starts (or "Prep NOW"), and a one-line relevance note explaining why it matters for CoGrader.
- **NCT Progress** — For each quarterly goal: name, progress bar, current vs. target numbers, quarter label.
- **Up Next from Backlog** — Top 3-5 items from the prioritized backlog with their ICE scores.

**Design notes**:
- No motivational text, no rules display, no "deep work blocks" reminders. Clean data, nothing else.
- Use subtle color coding: blue for in-progress, green for done, amber for alerts, red for urgent/overdue.
- All badges (scope, state, ICE score, status) should be small, clean pill-shaped elements.

---

### 2. Weekly Kickoff Tab

**Purpose**: Every Monday (or whenever a meeting happens), the user pastes a meeting transcript and the AI generates sprint items from it.

**Flow**:

**Step 1 — Input**:
- Large text area where the user pastes the full meeting transcript (plain text, like the Fathom transcript format they use)
- Optional: file upload for .txt files
- A "Process Transcript" button
- While processing, show a loading state with a message like "Analyzing transcript..."

**Step 2 — AI Processing** (backend):
The system sends the transcript to Claude with a carefully crafted prompt (see AI Prompts section below). Claude extracts:
- Proposed sprint items (name, scope, definition of done, suggested tasks, owner, why-now rationale, calendar urgency score, impact score)
- Any mentioned quarterly goals or metric updates
- Any new backlog items that were discussed but not prioritized for this sprint
- Any calendar-relevant mentions (upcoming events, deadlines)

**Step 3 — Review & Edit**:
The AI's output is displayed as editable sprint cards. For each proposed sprint item:
- Editable name field
- Editable scope (dropdown: SEO, Ads, Social, Product Growth, Content, Email, Partnerships, Other)
- Editable owner (dropdown of team members)
- Editable definition of done (text area)
- Editable task list (add/remove/reorder tasks)
- Calendar Urgency score (1-3, editable with explanation tooltip)
- Impact score (1-3, editable)
- Auto-calculated ICE score (urgency × impact)
- Link to NCT (dropdown of active NCTs)
- Deadline date picker
- A toggle: "Add to Sprint" vs. "Send to Backlog"

The user can:
- Edit any field
- Remove proposed items
- Add new items manually
- Move items between "Sprint" and "Backlog"
- Reorder sprint items

**Step 4 — Confirm**:
- "Start Sprint" button that activates the sprint
- If there's an existing active sprint, prompt: "You have an active sprint with X items. Archive it and start a new one?"
- Maximum of 4 items can be marked as sprint items. If the user tries to add more, show a warning: "Max 4 sprint items. Move something to backlog to add this."

**Sprint duration**: Sprints are 2 weeks by default. The start date is auto-set to the confirmation date. End date is 14 days later. Both are editable.

---

### 3. School Calendar Tab

**Purpose**: Master reference of all school-year events relevant to CoGrader's Growth team.

**Two views** (toggle between them):

#### Calendar Grid View (default)
- Standard month calendar grid (Mon-Sun columns, week rows)
- Navigate between months with arrow buttons
- Current day highlighted
- Events shown as colored bars/pills on their dates:
  - **Red** — State tests (STAAR, CAASPP, FAST, AP)
  - **Amber** — Prep windows (the period before a test when teachers are prepping students)
  - **Blue** — School milestones (back-to-school, end of year, summer PD)
  - **Gray** — Breaks (spring break, winter break, summer)
  - **Purple** — Marketing events (Valentine's Day, Teacher Appreciation Week, etc.)
- Multi-day events span across days visually
- Click on an event to see full details in a side panel or modal: event name, date range, state(s), type, prep window dates, relevance note for CoGrader

#### List View
- Chronological list of all events (similar to the prototype's calendar tab)
- Each row: date range, event name, state badge, type badge, days until start, prep status
- Filterable by state (TX, CA, FL, ALL) and type (test, break, milestone, marketing)

#### Calendar Data

The calendar should be pre-populated with the following categories of events for the 2025-2026 school year. Store these in the database so they can be edited.

**State Tests (these are the most important)**:

TEXAS (STAAR):
- STAAR Writing: Grades 4 and 7, typically April 7-10, 2026 (verify exact dates)
- STAAR ELA: All tested grades, April 7-24, 2026
- STAAR Retests: Late June 2026
- Prep windows: 6 weeks before each test date

CALIFORNIA (CAASPP / Smarter Balanced):
- CAASPP ELA Performance Task (includes essay): Grades 3-8 and 11
- Testing window: Schools choose within approximately March 16 - June 12, 2026
- Most schools test in April-May
- Prep window: Starts February, peaks March-April

FLORIDA (FAST - Florida Assessment of Student Thinking):
- FAST PM1 (Fall): September 8 - October 3, 2025
- FAST PM2 (Winter): January 12 - February 6, 2026
- FAST PM3 (Spring): April 14 - May 15, 2026
- ELA includes writing components
- Prep windows: 4 weeks before each window

OTHER NATIONAL:
- AP Exams: May 4-15, 2026 (AP English Language & Literature are essay-heavy)
- SAT School Day: Often in March or April (varies by state/district)
- ACT: Multiple dates throughout the year

**School Milestones**:
- Back to School: Late July - August (varies by state; TX starts mid-August, CA/FL start early-mid August)
- End of Year / Final Grading Crunch: Late May - mid June
- Summer Professional Development: June 15 - July 31
- First Day of School (by state): Track for TX, CA, FL
- Last Day of School (by state): Track for TX, CA, FL
- Report Card periods: Typically end of each grading period (quarterly or by semester)

**School Breaks**:
- Winter Break: Approximately December 20 - January 3
- Spring Break TX: Typically mid-March (varies by district)
- Spring Break CA: Typically late March / early April
- Spring Break FL: Typically mid-March
- Summer Break: Approximately June through mid-August

**Federal & Marketing-Relevant Holidays**:
- Martin Luther King Jr. Day: January 19, 2026 (schools closed)
- Presidents' Day: February 16, 2026 (schools closed)
- Valentine's Day: February 14 (marketing opportunity, low relevance)
- Teacher Appreciation Week: First full week of May (HIGH relevance — marketing + retention)
- Memorial Day: May 25, 2026 (schools closed)
- Independence Day: July 4, 2026 (summer, schools closed)
- Labor Day: September 7, 2026 (schools closed)
- Columbus Day / Indigenous Peoples' Day: October 12, 2026
- Veterans Day: November 11, 2026
- Thanksgiving Break: November 23-27, 2026
- Black Friday / Cyber Monday: Late November (potential promo window)

**Calendar Update Mechanism**:
- Admin can manually add, edit, or delete events through the UI
- Each event has fields: name, type (test/break/milestone/marketing), state(s), start date, end date, prep window start date (optional), relevance note (text), is_recurring (boolean), recurrence_rule (optional, for annual events)
- For future enhancement: the system could scrape or consume state DOE calendar feeds, but for MVP, manual management is fine
- Events marked as recurring should auto-populate for the next school year with a "Review & Confirm" step

---

### 4. Sprints Tab

**Purpose**: Detailed view of current sprint execution and sprint history.

**Two sections**:

#### Current Sprint
- Sprint header: name/title (auto-generated from kickoff or editable), date range, days remaining
- Sprint items displayed as cards (same format as Overview but always expanded):
  - Name, scope badge, owner, ICE score
  - Status selector: Not Started → In Progress → Review → Done
  - Definition of done (displayed, not hidden)
  - Task checklist with checkboxes (interactive — clicking marks tasks done)
  - "Why Now" rationale (collapsible)
  - Linked NCT (shown as small reference)
  - Deadline
- Drag-and-drop reordering of sprint items (optional, nice-to-have)
- "Add Item" button (pulls up a form to add manually or pick from backlog)
- "Complete Sprint" button → archives the sprint and prompts for a performance note

#### Sprint History
- Accordion or list of past sprints, newest first
- Each archived sprint shows:
  - Sprint dates
  - Items with their final status (completed, incomplete, carried over)
  - Task completion rate (e.g., 11/14 tasks completed = 79%)
  - Performance notes (free text added at sprint completion)
  - Which NCTs they were linked to
  - Whether items were carried over to the next sprint
- This serves as the retrospective / backlog performance log

#### Sprint → Backlog Flow
- When completing a sprint, any item not marked "Done" gets a prompt: "Carry to next sprint?" or "Move to backlog?"
- Items carried forward keep their history (started in Sprint X, carried to Sprint Y)

---

### 5. Settings Tab

**Purpose**: Configuration and data management.

**Sections**:

#### NCT Management (Quarterly Goals)
- View current quarter's NCTs in a table
- Each NCT: goal description, metric name, target value, current value, quarter (e.g., Q1 2026)
- "Update Current Value" — inline editable number field for each NCT
- "Add NCT" — manual form
- "Import NCTs" — Upload a CSV file with columns: goal, metric, target, current, quarter
  - CSV format example: `"Reach 2000 sign-ups","Sign-ups",2000,940,"Q1 2026"`
- "Archive Quarter" — Archives current NCTs and starts a new quarter
- NCT history is viewable (collapsed by default)

#### Team Members
- Simple list of team members (name, role)
- Used for the "Owner" dropdown in sprint items
- Add/remove members

#### States to Track
- Checkboxes for which states' school calendars to display
- Default: TX, CA, FL checked
- Can add other states if CoGrader expands

#### Anthropic API Key
- Masked input field for the API key
- "Test Connection" button
- Store securely (environment variable preferred, but allow UI override for ease of setup)

---

## AI Agent: Transcript Processing

This is the core intelligence of the system. When a user submits a meeting transcript in the Weekly Kickoff tab, the backend processes it through Claude.

### API Call Specification

**Model**: `claude-sonnet-4-5-20250929` (Sonnet for speed and cost; these transcripts are processed weekly)

**System Prompt**:
```
You are a Growth Sprint Planner for CoGrader, an EdTech company that sells AI essay grading tools to American teachers.

Your job is to analyze a weekly Growth team meeting transcript and extract actionable sprint items, backlog items, and any updates to quarterly goals.

Context about CoGrader:
- Serves American K-12 teachers, primarily ELA/writing
- Top states: Texas, California, Florida
- Growth channels: SEO, Meta Ads, Google Ads, YouTube Ads, Social Media (TikTok, Instagram), Content Creators/UGC, Email Marketing, Referral/MGM programs
- Business is seasonal, tied to the American school calendar (state testing, grading crunches, back-to-school)

You will be given:
1. The meeting transcript
2. The current active NCTs (quarterly goals) for context
3. The current school calendar events in the next 60 days for context

Your output must be valid JSON with this exact structure:
{
  "sprint_items": [
    {
      "name": "Short descriptive name",
      "scope": "SEO|Ads|Social|Product Growth|Content|Email|Partnerships|Other",
      "owner": "Name of person responsible (extract from transcript)",
      "definition_of_done": "Specific, measurable completion criteria. NOT vague like 'work on X'. Must be concrete like 'Publish 3 pages with differentiated keyword targeting'",
      "tasks": ["Task 1", "Task 2", "Task 3"],
      "why_now": "One sentence explaining why this matters RIGHT NOW, ideally tied to a school calendar event or NCT deadline",
      "calendar_urgency": 1-3,
      "impact": 1-3,
      "suggested_nct_link": "NCT goal text if applicable, or null",
      "suggested_deadline": "YYYY-MM-DD or null"
    }
  ],
  "backlog_items": [
    {
      "name": "Short descriptive name",
      "scope": "SEO|Ads|Social|Product Growth|Content|Email|Partnerships|Other",
      "description": "One sentence description",
      "calendar_urgency": 1-3,
      "impact": 1-3,
      "suggested_nct_link": "NCT goal text if applicable, or null"
    }
  ],
  "nct_updates": [
    {
      "nct_goal": "The NCT goal text to match against",
      "new_current_value": number,
      "note": "Why this changed"
    }
  ],
  "calendar_mentions": [
    {
      "event": "Event name mentioned",
      "context": "How it was discussed / why it matters"
    }
  ]
}

Rules:
- Extract ONLY items that were explicitly discussed or decided in the meeting. Do not invent items.
- Sprint items are things they committed to doing in the next 1-2 weeks.
- Backlog items are things they discussed but deferred or said "later."
- Maximum 4 sprint items. If more were discussed, pick the highest-priority ones based on calendar urgency and impact, and move the rest to backlog.
- definition_of_done must be specific and measurable. Convert vague statements into concrete deliverables.
- Calendar urgency scoring: 3 = school calendar event within 4 weeks, 2 = event in 4-8 weeks, 1 = no time pressure.
- Impact scoring: 3 = directly moves primary metric, 2 = indirect support, 1 = research/infrastructure.
- Owner should be extracted from the transcript. If unclear, put "Unassigned".
- Do NOT include personal/HR topics, career discussions, or performance management items.
- Do NOT include items about internal tools, payment processing, or administrative tasks unless they directly affect Growth output.
```

**User Message Format**:
```
## Meeting Transcript
{transcript_text}

## Current NCTs
{list of current NCTs with their targets and current values}

## Upcoming School Calendar Events (next 60 days)
{list of events with dates and prep windows}

Please analyze this transcript and extract sprint items, backlog items, and any relevant updates.
```

**Response Handling**:
- Parse the JSON response
- Validate the structure matches expected schema
- If parsing fails, retry once with a note asking Claude to fix the JSON
- Present the parsed items in the Step 3 (Review & Edit) UI

---

## Database Schema

Design the database with these entities. Use whatever ORM/approach fits the chosen stack (Prisma suggested).

### Tables

**team_members**
- id (primary key)
- name (string)
- role (string, optional)
- created_at, updated_at

**ncts** (quarterly goals)
- id (primary key)
- goal (string — the goal description)
- metric (string — what's being measured)
- target (float)
- current (float)
- quarter (string — e.g., "Q1 2026")
- is_active (boolean)
- created_at, updated_at

**calendar_events**
- id (primary key)
- name (string)
- type (enum: test, break, milestone, marketing)
- states (string array or comma-separated — e.g., "TX,CA" or "ALL")
- start_date (date)
- end_date (date)
- prep_start_date (date, nullable)
- relevance_note (text, nullable — why this matters for CoGrader)
- is_recurring (boolean, default true)
- created_at, updated_at

**sprints**
- id (primary key)
- name (string, nullable — auto-generated or user-set)
- start_date (date)
- end_date (date)
- status (enum: active, completed, archived)
- performance_notes (text, nullable — added at sprint completion)
- transcript_text (text, nullable — the original meeting transcript)
- created_at, updated_at

**sprint_items**
- id (primary key)
- sprint_id (foreign key → sprints)
- name (string)
- scope (string — SEO, Ads, Social, etc.)
- owner_id (foreign key → team_members, nullable)
- status (enum: not_started, in_progress, review, done)
- definition_of_done (text)
- why_now (text, nullable)
- calendar_urgency (integer, 1-3)
- impact (integer, 1-3)
- ice_score (integer, computed: calendar_urgency × impact)
- nct_id (foreign key → ncts, nullable)
- deadline (date, nullable)
- sort_order (integer — for manual reordering)
- carried_from_sprint_id (foreign key → sprints, nullable — if carried from previous sprint)
- created_at, updated_at

**sprint_tasks**
- id (primary key)
- sprint_item_id (foreign key → sprint_items)
- text (string)
- is_done (boolean, default false)
- sort_order (integer)
- created_at, updated_at

**backlog_items**
- id (primary key)
- name (string)
- scope (string)
- description (text)
- calendar_urgency (integer, 1-3)
- impact (integer, 1-3)
- ice_score (integer, computed)
- nct_id (foreign key → ncts, nullable)
- status (enum: pending, promoted_to_sprint, archived)
- promoted_to_sprint_id (foreign key → sprints, nullable)
- created_at, updated_at

**app_settings**
- id (primary key)
- key (string, unique)
- value (text)
- For storing: anthropic_api_key, tracked_states, etc.

---

## UI/UX Guidelines

### Overall Aesthetic
- **Clean, minimal, professional.** Think Linear or Notion, not Jira.
- White/light gray backgrounds. Subtle borders. No heavy shadows.
- Font: System font stack or Inter if importing Google Fonts.
- No unnecessary decorative elements. Every pixel serves a purpose.
- Responsive: works on laptop and tablet. Mobile is nice-to-have but not critical.

### Color System
- **Base**: White backgrounds, zinc-50 for subtle sections, zinc-900 for text
- **Blue** (primary): In-progress states, primary actions, links
- **Emerald/Green**: Completed states, positive progress
- **Amber**: Warnings, prep windows, medium priority
- **Red**: Tests, urgent items, high ICE scores (7+), overdue
- **Purple**: Marketing events, milestones
- **Gray**: Breaks, inactive items, secondary text

### Component Patterns
- **Badges/Pills**: Small, rounded-full, colored background with darker text. Used for: scope, state, ICE score, event type, status.
- **Cards**: Rounded-lg, subtle border, white bg. Used for sprint items, calendar alerts.
- **Progress bars**: Thin (h-2), rounded, colored by progress percentage.
- **Expandable sections**: Click to expand, smooth transition. Used for sprint item details.
- **Forms**: Clean inputs with labels above. No inline validation unless critical.
- **Empty states**: Simple text prompt pointing to the action (e.g., "No active sprint. Start one in Weekly Kickoff.")

### Navigation
- Horizontal tab bar at the top (not sidebar)
- Tabs: Overview, Weekly Kickoff, School Calendar, Sprints, Settings
- Active tab has a visual indicator (bottom border or background change)
- App title "CoGrader Growth System" in the top-left

### Things to Avoid
- No motivational quotes or productivity tips
- No "rules" displayed in the UI (the constraints are enforced programmatically, not shown)
- No onboarding tours or tooltips
- No dark mode (unless trivial to add)
- No animations except subtle transitions on expand/collapse and hover states
- No chat interfaces or AI conversation views — the AI is backend-only, its output is presented as editable forms

---

## Seed Data

Pre-populate the database with the school calendar events listed in the Calendar section above. Also seed with:

**Team members**:
- Daniel Medeiros (Growth Lead)
- Gabriel Adamante (COO)

**Sample NCTs for Q1 2026**:
- "Reach 2,000 new teacher sign-ups this quarter" — metric: Sign-ups, target: 2000, current: 940
- "Reduce CAC to $2.50 through organic + referral channels" — metric: CAC ($), target: 2.50, current: 3.10
- "Launch in-product MGM mechanism" — metric: Shipped (0 or 1), target: 1, current: 0

---

## API Routes / Endpoints

Design RESTful API routes (or server actions if using Next.js App Router). Key endpoints:

**Sprints**:
- GET /api/sprints — list all sprints (with items and tasks)
- GET /api/sprints/active — get the current active sprint
- POST /api/sprints — create a new sprint
- PATCH /api/sprints/:id — update sprint (status, notes, dates)
- POST /api/sprints/:id/complete — complete a sprint (archive it, handle carryover)

**Sprint Items**:
- POST /api/sprint-items — create a sprint item
- PATCH /api/sprint-items/:id — update a sprint item
- DELETE /api/sprint-items/:id — remove a sprint item

**Sprint Tasks**:
- PATCH /api/sprint-tasks/:id — toggle task done/undone
- POST /api/sprint-tasks — add a task
- DELETE /api/sprint-tasks/:id — remove a task

**Backlog**:
- GET /api/backlog — list all pending backlog items, sorted by ICE score desc
- POST /api/backlog — add a backlog item
- PATCH /api/backlog/:id — update a backlog item
- POST /api/backlog/:id/promote — move to active sprint

**Calendar**:
- GET /api/calendar — list all events (with optional filters: state, type, date range)
- POST /api/calendar — add an event
- PATCH /api/calendar/:id — update an event
- DELETE /api/calendar/:id — remove an event
- GET /api/calendar/alerts — get events with prep windows opening in the next 30 days

**NCTs**:
- GET /api/ncts — list active NCTs
- POST /api/ncts — create an NCT
- PATCH /api/ncts/:id — update an NCT (including current value)
- POST /api/ncts/import — import from CSV
- POST /api/ncts/archive-quarter — archive current quarter's NCTs

**AI Processing**:
- POST /api/ai/process-transcript — send transcript for processing, return structured sprint/backlog items

**Settings**:
- GET /api/settings — get all settings
- PATCH /api/settings — update settings

---

## Implementation Priority

Build in this order:

1. **Database + seed data** — Schema, migrations, seed script with calendar events and sample data
2. **Settings tab** — Team members, NCTs (manual CRUD), API key config
3. **School Calendar tab** — Both views (grid + list), with the seeded data, add/edit/delete events
4. **Sprints tab** — Sprint CRUD, sprint items with tasks, status updates, checklist interaction, sprint completion flow
5. **Overview tab** — Dashboard pulling from sprints, calendar alerts, NCTs, backlog
6. **Weekly Kickoff tab** — Transcript input, AI processing, review/edit UI, sprint creation flow
7. **Backlog** — CRUD, ICE scoring, promotion to sprint

The AI-powered Weekly Kickoff is last because it depends on all other features existing (sprints, calendar, NCTs) to provide context to the AI.

---

## File Structure (Suggested)

```
/
├── prisma/
│   ├── schema.prisma
│   └── seed.ts           # Calendar events, team members, sample NCTs
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx       # Redirects to /overview
│   │   ├── overview/
│   │   ├── kickoff/
│   │   ├── calendar/
│   │   ├── sprints/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/            # Shared components (Badge, ProgressBar, Card, etc.)
│   │   ├── calendar/      # Calendar grid, list view, event modal
│   │   ├── sprints/       # Sprint card, task checklist, sprint history
│   │   ├── kickoff/       # Transcript input, AI review cards
│   │   └── layout/        # Nav, tab bar
│   ├── lib/
│   │   ├── db.ts          # Database client
│   │   ├── ai.ts          # Anthropic API integration
│   │   └── utils.ts       # Helpers (date formatting, ICE calculation, etc.)
│   └── api/               # If using route handlers
├── public/
├── package.json
├── tailwind.config.ts
└── README.md
```

---

## Edge Cases to Handle

- **No active sprint**: Overview and Sprints tabs should handle this gracefully with an empty state pointing to Weekly Kickoff.
- **Sprint with > 4 items**: Prevent at the UI level. Show a clear message.
- **Transcript processing fails**: Show an error message with the option to retry or enter sprint items manually.
- **NCT quarter transition**: When archiving a quarter, prompt to create new NCTs. Old NCTs remain viewable in history.
- **Calendar events spanning months**: Must render correctly in the calendar grid view.
- **Carried-over sprint items**: Should show a visual indicator that they were carried from a previous sprint.
- **Empty backlog**: Show a message like "Backlog is empty. Items will appear here from Weekly Kickoff or manual entry."
- **Multiple sprints**: Only one sprint can be active at a time. Starting a new sprint requires completing or archiving the current one.

---

## What NOT to Build

- No user authentication (this is an internal tool for 2-3 people; add auth later if needed)
- No real-time collaboration (no WebSockets, no live cursors)
- No email notifications
- No integrations with external tools (Slack, HubSpot, etc.) — those come later
- No complex permissions system
- No dark mode (unless it's trivial)
- No mobile app — responsive web is sufficient
