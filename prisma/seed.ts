import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Clear existing data
  await prisma.sprintTask.deleteMany();
  await prisma.sprintItem.deleteMany();
  await prisma.sprint.deleteMany();
  await prisma.backlogItem.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.nct.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.appSetting.deleteMany();

  // Team members
  await prisma.teamMember.createMany({
    data: [
      { name: "Daniel Medeiros", role: "Growth Lead" },
      { name: "Gabriel Adamante", role: "COO" },
    ],
  });

  // NCTs for Q1 2026
  await prisma.nct.createMany({
    data: [
      { goal: "Reach 2,000 new teacher sign-ups this quarter", metric: "Sign-ups", target: 2000, current: 940, quarter: "Q1 2026", isActive: true },
      { goal: "Launch in-product MGM mechanism", metric: "Shipped (0 or 1)", target: 1, current: 0, quarter: "Q1 2026", isActive: true },
    ],
  });

  // Default settings
  await prisma.appSetting.createMany({
    data: [
      { key: "tracked_states", value: "TX,CA,FL" },
      { key: "google_ai_api_key", value: "" },
    ],
  });

  // Calendar Events
  const calendarEvents = [
    // TEXAS (STAAR)
    { name: "STAAR Writing (Grades 4 & 7)", type: "test", states: "TX", startDate: new Date("2026-04-07"), endDate: new Date("2026-04-10"), prepStartDate: new Date("2026-02-24"), relevanceNote: "Peak demand for CoGrader essay grading. Teachers prep students with practice essays.", isRecurring: true },
    { name: "STAAR ELA (All tested grades)", type: "test", states: "TX", startDate: new Date("2026-04-07"), endDate: new Date("2026-04-24"), prepStartDate: new Date("2026-02-24"), relevanceNote: "Largest state testing window — massive opportunity for writing practice tool usage.", isRecurring: true },
    { name: "STAAR Retests", type: "test", states: "TX", startDate: new Date("2026-06-22"), endDate: new Date("2026-06-26"), prepStartDate: new Date("2026-06-08"), relevanceNote: "Retest window for students who didn't pass. Teachers need quick grading tools.", isRecurring: true },

    // CALIFORNIA (CAASPP)
    { name: "CAASPP ELA Performance Task", type: "test", states: "CA", startDate: new Date("2026-03-16"), endDate: new Date("2026-06-12"), prepStartDate: new Date("2026-02-01"), relevanceNote: "Includes essay component. Schools choose testing window — peak in Apr-May.", isRecurring: true },

    // FLORIDA (FAST)
    { name: "FAST PM1 (Fall)", type: "test", states: "FL", startDate: new Date("2025-09-08"), endDate: new Date("2025-10-03"), prepStartDate: new Date("2025-08-11"), relevanceNote: "First FAST assessment. Includes ELA writing components.", isRecurring: true },
    { name: "FAST PM2 (Winter)", type: "test", states: "FL", startDate: new Date("2026-01-12"), endDate: new Date("2026-02-06"), prepStartDate: new Date("2025-12-15"), relevanceNote: "Winter assessment window. Writing component drives CoGrader demand.", isRecurring: true },
    { name: "FAST PM3 (Spring)", type: "test", states: "FL", startDate: new Date("2026-04-14"), endDate: new Date("2026-05-15"), prepStartDate: new Date("2026-03-17"), relevanceNote: "Final FAST assessment. High-stakes for students.", isRecurring: true },

    // National
    { name: "AP Exams", type: "test", states: "ALL", startDate: new Date("2026-05-04"), endDate: new Date("2026-05-15"), prepStartDate: new Date("2026-04-06"), relevanceNote: "AP English Language & Literature are essay-heavy. Premium use case for CoGrader.", isRecurring: true },
    { name: "SAT School Day", type: "test", states: "ALL", startDate: new Date("2026-03-25"), endDate: new Date("2026-03-25"), prepStartDate: new Date("2026-03-01"), relevanceNote: "Many districts administer SAT during school. Essay prep demand.", isRecurring: true },

    // School Milestones
    { name: "Back to School (TX)", type: "milestone", states: "TX", startDate: new Date("2025-08-18"), endDate: new Date("2025-08-22"), prepStartDate: null, relevanceNote: "Teachers setting up classrooms and tools — key acquisition window.", isRecurring: true },
    { name: "Back to School (CA)", type: "milestone", states: "CA", startDate: new Date("2025-08-11"), endDate: new Date("2025-08-15"), prepStartDate: null, relevanceNote: "Early August start. Teachers onboarding new tools.", isRecurring: true },
    { name: "Back to School (FL)", type: "milestone", states: "FL", startDate: new Date("2025-08-11"), endDate: new Date("2025-08-15"), prepStartDate: null, relevanceNote: "Florida schools start early-mid August.", isRecurring: true },
    { name: "End of Year / Final Grading Crunch", type: "milestone", states: "ALL", startDate: new Date("2026-05-18"), endDate: new Date("2026-06-12"), prepStartDate: null, relevanceNote: "Teachers need fast grading. Highest usage period for essay grading tools.", isRecurring: true },
    { name: "Summer Professional Development", type: "milestone", states: "ALL", startDate: new Date("2026-06-15"), endDate: new Date("2026-07-31"), prepStartDate: null, relevanceNote: "Teachers explore new tools during PD sessions. Great content marketing opportunity.", isRecurring: true },

    // School Breaks
    { name: "Winter Break", type: "break", states: "ALL", startDate: new Date("2025-12-20"), endDate: new Date("2026-01-03"), prepStartDate: null, relevanceNote: "Schools closed. Low usage but good for content prep and planning.", isRecurring: true },
    { name: "Spring Break (TX)", type: "break", states: "TX", startDate: new Date("2026-03-16"), endDate: new Date("2026-03-20"), prepStartDate: null, relevanceNote: "Varies by district. Brief usage dip.", isRecurring: true },
    { name: "Spring Break (CA)", type: "break", states: "CA", startDate: new Date("2026-03-30"), endDate: new Date("2026-04-03"), prepStartDate: null, relevanceNote: "Late March/early April. Brief usage dip.", isRecurring: true },
    { name: "Spring Break (FL)", type: "break", states: "FL", startDate: new Date("2026-03-16"), endDate: new Date("2026-03-20"), prepStartDate: null, relevanceNote: "Similar timing to TX. Brief usage dip.", isRecurring: true },
    { name: "Summer Break", type: "break", states: "ALL", startDate: new Date("2026-06-08"), endDate: new Date("2026-08-14"), prepStartDate: null, relevanceNote: "Schools closed. Lowest usage period. Focus on content and PD outreach.", isRecurring: true },

    // Federal & Marketing Holidays
    { name: "Martin Luther King Jr. Day", type: "marketing", states: "ALL", startDate: new Date("2026-01-19"), endDate: new Date("2026-01-19"), prepStartDate: null, relevanceNote: "Schools closed.", isRecurring: true },
    { name: "Presidents' Day", type: "marketing", states: "ALL", startDate: new Date("2026-02-16"), endDate: new Date("2026-02-16"), prepStartDate: null, relevanceNote: "Schools closed.", isRecurring: true },
    { name: "Valentine's Day", type: "marketing", states: "ALL", startDate: new Date("2026-02-14"), endDate: new Date("2026-02-14"), prepStartDate: null, relevanceNote: "Low relevance. Potential fun social media content.", isRecurring: true },
    { name: "Teacher Appreciation Week", type: "marketing", states: "ALL", startDate: new Date("2026-05-04"), endDate: new Date("2026-05-08"), prepStartDate: new Date("2026-04-20"), relevanceNote: "HIGH relevance — marketing + retention. Email campaigns, social media, special offers.", isRecurring: true },
    { name: "Memorial Day", type: "marketing", states: "ALL", startDate: new Date("2026-05-25"), endDate: new Date("2026-05-25"), prepStartDate: null, relevanceNote: "Schools closed.", isRecurring: true },
    { name: "Independence Day", type: "marketing", states: "ALL", startDate: new Date("2026-07-04"), endDate: new Date("2026-07-04"), prepStartDate: null, relevanceNote: "Summer. Schools closed.", isRecurring: true },
    { name: "Labor Day", type: "marketing", states: "ALL", startDate: new Date("2026-09-07"), endDate: new Date("2026-09-07"), prepStartDate: null, relevanceNote: "Schools closed. Near start of school year.", isRecurring: true },
    { name: "Columbus Day / Indigenous Peoples' Day", type: "marketing", states: "ALL", startDate: new Date("2026-10-12"), endDate: new Date("2026-10-12"), prepStartDate: null, relevanceNote: "Some schools closed.", isRecurring: true },
    { name: "Veterans Day", type: "marketing", states: "ALL", startDate: new Date("2026-11-11"), endDate: new Date("2026-11-11"), prepStartDate: null, relevanceNote: "Schools closed.", isRecurring: true },
    { name: "Thanksgiving Break", type: "break", states: "ALL", startDate: new Date("2026-11-23"), endDate: new Date("2026-11-27"), prepStartDate: null, relevanceNote: "Schools closed. Usage dip.", isRecurring: true },
    { name: "Black Friday / Cyber Monday", type: "marketing", states: "ALL", startDate: new Date("2026-11-27"), endDate: new Date("2026-11-30"), prepStartDate: new Date("2026-11-13"), relevanceNote: "Potential promo window for annual subscriptions.", isRecurring: true },
  ];

  for (const event of calendarEvents) {
    await prisma.calendarEvent.create({ data: event });
  }

  console.log("Seed complete!");
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
