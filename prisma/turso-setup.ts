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
    ["STAAR Writing (Grades 4 & 7)", "test", "TX", "2026-04-07", "2026-04-10", "2026-02-24", "Peak demand for CoGrader essay grading. Teachers prep students with practice essays."],
    ["STAAR ELA (All tested grades)", "test", "TX", "2026-04-07", "2026-04-24", "2026-02-24", "Largest state testing window — massive opportunity for writing practice tool usage."],
    ["STAAR Retests", "test", "TX", "2026-06-22", "2026-06-26", "2026-06-08", "Retest window for students who didn't pass. Teachers need quick grading tools."],
    ["CAASPP ELA Performance Task", "test", "CA", "2026-03-16", "2026-06-12", "2026-02-01", "Includes essay component. Schools choose testing window — peak in Apr-May."],
    ["FAST PM1 (Fall)", "test", "FL", "2025-09-08", "2025-10-03", "2025-08-11", "First FAST assessment. Includes ELA writing components."],
    ["FAST PM2 (Winter)", "test", "FL", "2026-01-12", "2026-02-06", "2025-12-15", "Winter assessment window. Writing component drives CoGrader demand."],
    ["FAST PM3 (Spring)", "test", "FL", "2026-04-14", "2026-05-15", "2026-03-17", "Final FAST assessment. High-stakes for students."],
    ["AP Exams", "test", "ALL", "2026-05-04", "2026-05-15", "2026-04-06", "AP English Language & Literature are essay-heavy. Premium use case for CoGrader."],
    ["SAT School Day", "test", "ALL", "2026-03-25", "2026-03-25", "2026-03-01", "Many districts administer SAT during school. Essay prep demand."],
    ["Back to School (TX)", "milestone", "TX", "2025-08-18", "2025-08-22", null, "Teachers setting up classrooms and tools — key acquisition window."],
    ["Back to School (CA)", "milestone", "CA", "2025-08-11", "2025-08-15", null, "Early August start. Teachers onboarding new tools."],
    ["Back to School (FL)", "milestone", "FL", "2025-08-11", "2025-08-15", null, "Florida schools start early-mid August."],
    ["End of Year / Final Grading Crunch", "milestone", "ALL", "2026-05-18", "2026-06-12", null, "Teachers need fast grading. Highest usage period for essay grading tools."],
    ["Summer Professional Development", "milestone", "ALL", "2026-06-15", "2026-07-31", null, "Teachers explore new tools during PD sessions. Great content marketing opportunity."],
    ["Winter Break", "break", "ALL", "2025-12-20", "2026-01-03", null, "Schools closed. Low usage but good for content prep and planning."],
    ["Spring Break (TX)", "break", "TX", "2026-03-16", "2026-03-20", null, "Varies by district. Brief usage dip."],
    ["Spring Break (CA)", "break", "CA", "2026-03-30", "2026-04-03", null, "Late March/early April. Brief usage dip."],
    ["Spring Break (FL)", "break", "FL", "2026-03-16", "2026-03-20", null, "Similar timing to TX. Brief usage dip."],
    ["Summer Break", "break", "ALL", "2026-06-08", "2026-08-14", null, "Schools closed. Lowest usage period. Focus on content and PD outreach."],
    ["Martin Luther King Jr. Day", "marketing", "ALL", "2026-01-19", "2026-01-19", null, "Schools closed."],
    ["Presidents' Day", "marketing", "ALL", "2026-02-16", "2026-02-16", null, "Schools closed."],
    ["Valentine's Day", "marketing", "ALL", "2026-02-14", "2026-02-14", null, "Low relevance. Potential fun social media content."],
    ["Teacher Appreciation Week", "marketing", "ALL", "2026-05-04", "2026-05-08", "2026-04-20", "HIGH relevance — marketing + retention. Email campaigns, social media, special offers."],
    ["Memorial Day", "marketing", "ALL", "2026-05-25", "2026-05-25", null, "Schools closed."],
    ["Independence Day", "marketing", "ALL", "2026-07-04", "2026-07-04", null, "Summer. Schools closed."],
    ["Labor Day", "marketing", "ALL", "2026-09-07", "2026-09-07", null, "Schools closed. Near start of school year."],
    ["Columbus Day / Indigenous Peoples' Day", "marketing", "ALL", "2026-10-12", "2026-10-12", null, "Some schools closed."],
    ["Veterans Day", "marketing", "ALL", "2026-11-11", "2026-11-11", null, "Schools closed."],
    ["Thanksgiving Break", "break", "ALL", "2026-11-23", "2026-11-27", null, "Schools closed. Usage dip."],
    ["Black Friday / Cyber Monday", "marketing", "ALL", "2026-11-27", "2026-11-30", "2026-11-13", "Potential promo window for annual subscriptions."],
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
