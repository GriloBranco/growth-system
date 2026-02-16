import "dotenv/config";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const tables = [
  `CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS ncts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal TEXT NOT NULL,
    metric TEXT NOT NULL,
    target REAL NOT NULL,
    current REAL NOT NULL DEFAULT 0,
    quarter TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    states TEXT NOT NULL,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    prep_start_date DATETIME,
    relevance_note TEXT,
    is_recurring BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sprints (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    performance_notes TEXT,
    transcript_text TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS sprint_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    owner_id INTEGER,
    status TEXT NOT NULL DEFAULT 'not_started',
    definition_of_done TEXT NOT NULL,
    why_now TEXT,
    calendar_urgency INTEGER NOT NULL DEFAULT 1,
    impact INTEGER NOT NULL DEFAULT 1,
    ice_score INTEGER NOT NULL DEFAULT 1,
    nct_id INTEGER,
    deadline DATETIME,
    sort_order INTEGER NOT NULL DEFAULT 0,
    carried_from_sprint_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sprint_id) REFERENCES sprints(id),
    FOREIGN KEY (owner_id) REFERENCES team_members(id),
    FOREIGN KEY (nct_id) REFERENCES ncts(id),
    FOREIGN KEY (carried_from_sprint_id) REFERENCES sprints(id)
  )`,
  `CREATE TABLE IF NOT EXISTS sprint_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sprint_item_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    is_done BOOLEAN NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sprint_item_id) REFERENCES sprint_items(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS backlog_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    scope TEXT NOT NULL,
    description TEXT NOT NULL,
    calendar_urgency INTEGER NOT NULL DEFAULT 1,
    impact INTEGER NOT NULL DEFAULT 1,
    ice_score INTEGER NOT NULL DEFAULT 1,
    nct_id INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    promoted_to_sprint_id INTEGER,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (nct_id) REFERENCES ncts(id)
  )`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  )`,
];

async function main() {
  console.log("Creating tables on Turso...");
  for (const sql of tables) {
    await client.execute(sql);
  }
  console.log("Tables created!");

  // Seed data
  console.log("Seeding data...");

  // Team members
  await client.execute(`INSERT OR IGNORE INTO team_members (id, name, role) VALUES (1, 'Daniel Medeiros', 'Growth Lead')`);
  await client.execute(`INSERT OR IGNORE INTO team_members (id, name, role) VALUES (2, 'Gabriel Adamante', 'COO')`);

  // NCTs
  await client.execute(`INSERT OR IGNORE INTO ncts (id, goal, metric, target, current, quarter, is_active) VALUES (1, 'Reach 2,000 new teacher sign-ups this quarter', 'Sign-ups', 2000, 940, 'Q1 2026', 1)`);
  await client.execute(`INSERT OR IGNORE INTO ncts (id, goal, metric, target, current, quarter, is_active) VALUES (3, 'Launch in-product MGM mechanism', 'Shipped (0 or 1)', 1, 0, 'Q1 2026', 1)`);

  // Settings
  await client.execute(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('tracked_states', 'TX,CA,FL')`);
  await client.execute(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('google_ai_api_key', '')`);

  // Calendar events
  const events = [
    ["STAAR Writing (Grades 4 & 7)", "test", "TX", "2026-04-07T00:00:00.000Z", "2026-04-10T00:00:00.000Z", "2026-02-24T00:00:00.000Z", "Peak demand for CoGrader essay grading. Teachers prep students with practice essays."],
    ["STAAR ELA (All tested grades)", "test", "TX", "2026-04-07T00:00:00.000Z", "2026-04-24T00:00:00.000Z", "2026-02-24T00:00:00.000Z", "Largest state testing window — massive opportunity for writing practice tool usage."],
    ["STAAR Retests", "test", "TX", "2026-06-22T00:00:00.000Z", "2026-06-26T00:00:00.000Z", "2026-06-08T00:00:00.000Z", "Retest window for students who didn't pass. Teachers need quick grading tools."],
    ["CAASPP ELA Performance Task", "test", "CA", "2026-03-16T00:00:00.000Z", "2026-06-12T00:00:00.000Z", "2026-02-01T00:00:00.000Z", "Includes essay component. Schools choose testing window — peak in Apr-May."],
    ["FAST PM1 (Fall)", "test", "FL", "2025-09-08T00:00:00.000Z", "2025-10-03T00:00:00.000Z", "2025-08-11T00:00:00.000Z", "First FAST assessment. Includes ELA writing components."],
    ["FAST PM2 (Winter)", "test", "FL", "2026-01-12T00:00:00.000Z", "2026-02-06T00:00:00.000Z", "2025-12-15T00:00:00.000Z", "Winter assessment window. Writing component drives CoGrader demand."],
    ["FAST PM3 (Spring)", "test", "FL", "2026-04-14T00:00:00.000Z", "2026-05-15T00:00:00.000Z", "2026-03-17T00:00:00.000Z", "Final FAST assessment. High-stakes for students."],
    ["AP Exams", "test", "ALL", "2026-05-04T00:00:00.000Z", "2026-05-15T00:00:00.000Z", "2026-04-06T00:00:00.000Z", "AP English Language & Literature are essay-heavy. Premium use case for CoGrader."],
    ["SAT School Day", "test", "ALL", "2026-03-25T00:00:00.000Z", "2026-03-25T00:00:00.000Z", "2026-03-01T00:00:00.000Z", "Many districts administer SAT during school. Essay prep demand."],
    ["Back to School (TX)", "milestone", "TX", "2025-08-18T00:00:00.000Z", "2025-08-22T00:00:00.000Z", null, "Teachers setting up classrooms and tools — key acquisition window."],
    ["Back to School (CA)", "milestone", "CA", "2025-08-11T00:00:00.000Z", "2025-08-15T00:00:00.000Z", null, "Early August start. Teachers onboarding new tools."],
    ["Back to School (FL)", "milestone", "FL", "2025-08-11T00:00:00.000Z", "2025-08-15T00:00:00.000Z", null, "Florida schools start early-mid August."],
    ["End of Year / Final Grading Crunch", "milestone", "ALL", "2026-05-18T00:00:00.000Z", "2026-06-12T00:00:00.000Z", null, "Teachers need fast grading. Highest usage period for essay grading tools."],
    ["Summer Professional Development", "milestone", "ALL", "2026-06-15T00:00:00.000Z", "2026-07-31T00:00:00.000Z", null, "Teachers explore new tools during PD sessions. Great content marketing opportunity."],
    ["Winter Break", "break", "ALL", "2025-12-20T00:00:00.000Z", "2026-01-03T00:00:00.000Z", null, "Schools closed. Low usage but good for content prep and planning."],
    ["Spring Break (TX)", "break", "TX", "2026-03-16T00:00:00.000Z", "2026-03-20T00:00:00.000Z", null, "Varies by district. Brief usage dip."],
    ["Spring Break (CA)", "break", "CA", "2026-03-30T00:00:00.000Z", "2026-04-03T00:00:00.000Z", null, "Late March/early April. Brief usage dip."],
    ["Spring Break (FL)", "break", "FL", "2026-03-16T00:00:00.000Z", "2026-03-20T00:00:00.000Z", null, "Similar timing to TX. Brief usage dip."],
    ["Summer Break", "break", "ALL", "2026-06-08T00:00:00.000Z", "2026-08-14T00:00:00.000Z", null, "Schools closed. Lowest usage period. Focus on content and PD outreach."],
    ["Martin Luther King Jr. Day", "marketing", "ALL", "2026-01-19T00:00:00.000Z", "2026-01-19T00:00:00.000Z", null, "Schools closed."],
    ["Presidents' Day", "marketing", "ALL", "2026-02-16T00:00:00.000Z", "2026-02-16T00:00:00.000Z", null, "Schools closed."],
    ["Valentine's Day", "marketing", "ALL", "2026-02-14T00:00:00.000Z", "2026-02-14T00:00:00.000Z", null, "Low relevance. Potential fun social media content."],
    ["Teacher Appreciation Week", "marketing", "ALL", "2026-05-04T00:00:00.000Z", "2026-05-08T00:00:00.000Z", "2026-04-20T00:00:00.000Z", "HIGH relevance — marketing + retention. Email campaigns, social media, special offers."],
    ["Memorial Day", "marketing", "ALL", "2026-05-25T00:00:00.000Z", "2026-05-25T00:00:00.000Z", null, "Schools closed."],
    ["Independence Day", "marketing", "ALL", "2026-07-04T00:00:00.000Z", "2026-07-04T00:00:00.000Z", null, "Summer. Schools closed."],
    ["Labor Day", "marketing", "ALL", "2026-09-07T00:00:00.000Z", "2026-09-07T00:00:00.000Z", null, "Schools closed. Near start of school year."],
    ["Columbus Day / Indigenous Peoples' Day", "marketing", "ALL", "2026-10-12T00:00:00.000Z", "2026-10-12T00:00:00.000Z", null, "Some schools closed."],
    ["Veterans Day", "marketing", "ALL", "2026-11-11T00:00:00.000Z", "2026-11-11T00:00:00.000Z", null, "Schools closed."],
    ["Thanksgiving Break", "break", "ALL", "2026-11-23T00:00:00.000Z", "2026-11-27T00:00:00.000Z", null, "Schools closed. Usage dip."],
    ["Black Friday / Cyber Monday", "marketing", "ALL", "2026-11-27T00:00:00.000Z", "2026-11-30T00:00:00.000Z", "2026-11-13T00:00:00.000Z", "Potential promo window for annual subscriptions."],
  ];

  for (const [name, type, states, start, end, prep, note] of events) {
    await client.execute({
      sql: `INSERT INTO calendar_events (name, type, states, start_date, end_date, prep_start_date, relevance_note) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [name, type, states, start, end, prep, note],
    });
  }

  console.log("Seed complete!");
  client.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
