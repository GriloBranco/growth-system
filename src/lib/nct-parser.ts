/**
 * Shared NCT parser — extracts 4-level hierarchy from spreadsheet rows.
 *
 * Expected CSV / Sheets layout (sections separated by marker rows):
 *   O                         ← Objectives section
 *   <objective rows>
 *   Narratives
 *   Name | Description | ... | KR
 *   <narrative rows>
 *   Commitments
 *   Narrative | Name | Type | Description | DRI
 *   <commitment rows>
 *   Tasks
 *   Commitment | Task 1 | Task 2 | ... | Task 7 | Done
 *   <task rows>
 */

export interface ParsedTask {
  text: string;
  isDone: boolean;
  sortOrder: number;
}

export interface ParsedCommitment {
  name: string;
  type: string;
  description: string;
  dri: string;
  sortOrder: number;
  tasks: ParsedTask[];
}

export interface ParsedNarrative {
  name: string;
  description: string;
  kr: string;
  target: number;
  metric: string;
  sortOrder: number;
  commitments: ParsedCommitment[];
}

export interface ParsedNctData {
  objectives: string[];
  narratives: ParsedNarrative[];
  quarter: string;
}

function findSectionIndex(rows: string[][], marker: string): number {
  return rows.findIndex((row) =>
    row.some((c) => c.trim().toLowerCase() === marker.toLowerCase())
  );
}

function findHeaderRow(rows: string[][], startIdx: number, requiredCols: string[]): number {
  for (let i = startIdx; i < Math.min(startIdx + 5, rows.length); i++) {
    const lower = rows[i].map((c) => c.trim().toLowerCase());
    if (requiredCols.every((col) => lower.some((c) => c.includes(col)))) {
      return i;
    }
  }
  return -1;
}

function colIndex(headerRow: string[], ...candidates: string[]): number {
  const lower = headerRow.map((c) => c.trim().toLowerCase());
  for (const cand of candidates) {
    const idx = lower.findIndex((c) => c === cand || c.includes(cand));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cell(row: string[], idx: number): string {
  return (idx >= 0 && idx < row.length ? row[idx] : "").trim();
}

const SUFFIXES: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

/**
 * Parse a human-readable number from a KR string.
 * Handles: "24K leads" → 24000, "$1.5M ARR" → 1500000,
 * "50%" → 50, "3,500" → 3500, "10" → 10
 */
export function parseKrNumber(kr: string): number | null {
  if (!kr) return null;
  // Match optional currency, number with optional decimals/commas, optional K/M/B suffix
  const match = kr.match(/[$€£]?\s*([\d,]+(?:\.\d+)?)\s*([kmb])?/i);
  if (!match) return null;
  const base = parseFloat(match[1].replace(/,/g, ""));
  if (isNaN(base)) return null;
  const suffix = match[2]?.toLowerCase();
  return suffix && SUFFIXES[suffix] ? base * SUFFIXES[suffix] : base;
}

export function parseNctRows(rows: string[][], quarter = "Q1 2026"): ParsedNctData {
  const objectivesIdx = findSectionIndex(rows, "O");
  const narrativesIdx = findSectionIndex(rows, "Narratives");
  const commitmentsIdx = findSectionIndex(rows, "Commitments");
  const tasksIdx = findSectionIndex(rows, "Tasks");

  // --- Objectives ---
  const objectives: string[] = [];
  if (objectivesIdx >= 0) {
    const end = narrativesIdx >= 0 ? narrativesIdx : rows.length;
    for (let i = objectivesIdx + 1; i < end; i++) {
      const text = rows[i].filter((c) => c.trim()).join(" ").trim();
      if (text && text.toLowerCase() !== "o") objectives.push(text);
    }
  }

  // --- Narratives ---
  const narratives: ParsedNarrative[] = [];
  if (narrativesIdx >= 0) {
    const headerIdx = findHeaderRow(rows, narrativesIdx + 1, ["name"]);
    if (headerIdx >= 0) {
      const hdr = rows[headerIdx];
      const nameI = colIndex(hdr, "name");
      const descI = colIndex(hdr, "description");
      const krI = colIndex(hdr, "kr");

      const end = commitmentsIdx >= 0 ? commitmentsIdx : tasksIdx >= 0 ? tasksIdx : rows.length;
      let sort = 0;
      for (let i = headerIdx + 1; i < end; i++) {
        const row = rows[i];
        const name = cell(row, nameI);
        if (!name) continue;
        if (["commitments", "tasks"].includes(name.toLowerCase())) break;

        const kr = cell(row, krI);
        const target = parseKrNumber(kr) ?? 1;

        narratives.push({
          name,
          description: cell(row, descI),
          kr,
          target,
          metric: kr || name,
          sortOrder: sort++,
          commitments: [],
        });
      }
    }
  }

  // --- Commitments ---
  if (commitmentsIdx >= 0) {
    const headerIdx = findHeaderRow(rows, commitmentsIdx + 1, ["name"]);
    if (headerIdx >= 0) {
      const hdr = rows[headerIdx];
      const narrI = colIndex(hdr, "narrative");
      const nameI = colIndex(hdr, "name");
      const typeI = colIndex(hdr, "type");
      const descI = colIndex(hdr, "description");
      const driI = colIndex(hdr, "dri");

      const end = tasksIdx >= 0 ? tasksIdx : rows.length;
      let currentNarrative: ParsedNarrative | undefined;
      let sort = 0;

      for (let i = headerIdx + 1; i < end; i++) {
        const row = rows[i];
        const name = cell(row, nameI);
        if (!name) continue;
        if (name.toLowerCase() === "tasks") break;

        // Link to parent narrative
        const narrName = cell(row, narrI);
        if (narrName) {
          currentNarrative = narratives.find(
            (n) => n.name.toLowerCase() === narrName.toLowerCase()
          );
        }

        if (currentNarrative) {
          currentNarrative.commitments.push({
            name,
            type: cell(row, typeI) || "Quantitative",
            description: cell(row, descI),
            dri: cell(row, driI),
            sortOrder: sort++,
            tasks: [],
          });
        }
      }
    }
  }

  // --- Tasks ---
  if (tasksIdx >= 0) {
    const headerIdx = findHeaderRow(rows, tasksIdx + 1, ["task"]);
    if (headerIdx >= 0) {
      const hdr = rows[headerIdx];
      const commitI = colIndex(hdr, "commitment");
      const doneI = colIndex(hdr, "done");

      // Find Task 1..7 columns
      const taskCols: number[] = [];
      hdr.forEach((c, idx) => {
        if (/^task\s*\d/i.test(c.trim())) taskCols.push(idx);
      });

      let currentCommitment: ParsedCommitment | undefined;

      for (let i = headerIdx + 1; i < rows.length; i++) {
        const row = rows[i];

        // Link to parent commitment
        const commitName = cell(row, commitI);
        if (commitName) {
          for (const narr of narratives) {
            const found = narr.commitments.find(
              (c) => c.name.toLowerCase() === commitName.toLowerCase()
            );
            if (found) { currentCommitment = found; break; }
          }
        }

        if (!currentCommitment) continue;

        const isDone = cell(row, doneI).toLowerCase();
        const done = isDone === "true" || isDone === "yes" || isDone === "1" || isDone === "x";

        let sort = 0;
        for (const col of taskCols) {
          const text = cell(row, col);
          if (text) {
            currentCommitment.tasks.push({ text, isDone: done, sortOrder: sort++ });
          }
        }
      }
    }
  }

  return { objectives, narratives, quarter };
}
