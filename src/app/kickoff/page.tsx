"use client";

import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SCOPES, SCOPE_COLORS, calculateIceScore } from "@/lib/utils";

interface TeamMember { id: number; name: string; }
interface Nct { id: number; goal: string; isActive: boolean; }

interface ProposedItem {
  name: string;
  scope: string;
  owner: string;
  definition_of_done: string;
  tasks: string[];
  why_now: string;
  calendar_urgency: number;
  impact: number;
  suggested_nct_link: string | null;
  suggested_deadline: string | null;
  addToSprint: boolean;
}

interface ProposedBacklog {
  name: string;
  scope: string;
  description: string;
  calendar_urgency: number;
  impact: number;
  suggested_nct_link: string | null;
}

export default function KickoffPage() {
  const [step, setStep] = useState(1);
  const [transcript, setTranscript] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sprintItems, setSprintItems] = useState<ProposedItem[]>([]);
  const [backlogItems, setBacklogItems] = useState<ProposedBacklog[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [ncts, setNcts] = useState<Nct[]>([]);
  const [sprintName, setSprintName] = useState("");
  const [sprintStart, setSprintStart] = useState(new Date().toISOString().split("T")[0]);
  const [sprintEnd, setSprintEnd] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]);
  const [creating, setCreating] = useState(false);

  const loadContext = useCallback(async () => {
    const [mRes, nRes] = await Promise.all([
      fetch("/api/team-members"),
      fetch("/api/ncts"),
    ]);
    setTeamMembers(await mRes.json());
    setNcts((await nRes.json()).filter((n: Nct) => n.isActive));
  }, []);

  useEffect(() => { loadContext(); }, [loadContext]);

  const processTranscriptHandler = async () => {
    if (!transcript.trim()) return;
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/process-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setSprintItems(
        (data.sprint_items || []).map((item: ProposedItem) => ({ ...item, addToSprint: true }))
      );
      setBacklogItems(data.backlog_items || []);
      setStep(3);
    } catch (e) {
      setError(String(e instanceof Error ? e.message : e));
    }
    setProcessing(false);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => setTranscript(e.target?.result as string);
    reader.readAsText(file);
  };

  const updateSprintItem = (index: number, updates: Partial<ProposedItem>) => {
    setSprintItems((prev) => prev.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  const removeSprintItem = (index: number) => {
    setSprintItems((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleSprint = (index: number) => {
    const item = sprintItems[index];
    const sprintCount = sprintItems.filter((i) => i.addToSprint).length;
    if (!item.addToSprint && sprintCount >= 4) {
      alert("Max 4 sprint items. Move something to backlog to add this.");
      return;
    }
    updateSprintItem(index, { addToSprint: !item.addToSprint });
  };

  const startSprint = async () => {
    const sprint = sprintItems.filter((i) => i.addToSprint);
    if (sprint.length === 0) { alert("Add at least one item to the sprint."); return; }
    if (sprint.length > 4) { alert("Max 4 sprint items."); return; }

    setCreating(true);

    // Check for active sprint
    const activeRes = await fetch("/api/sprints?active=true");
    const activeSprints = await activeRes.json();

    let archiveCurrent = false;
    if (activeSprints.length > 0) {
      archiveCurrent = confirm(`You have an active sprint with ${activeSprints[0].items.length} items. Archive it and start a new one?`);
      if (!archiveCurrent) { setCreating(false); return; }
    }

    // Create sprint
    const sprintRes = await fetch("/api/sprints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: sprintName || null,
        startDate: sprintStart,
        endDate: sprintEnd,
        archiveCurrent,
        transcriptText: transcript,
      }),
    });
    const newSprint = await sprintRes.json();

    // Add sprint items
    for (const item of sprint) {
      const ownerMember = teamMembers.find((m) => m.name.toLowerCase().includes(item.owner.toLowerCase()));
      const nctMatch = item.suggested_nct_link
        ? ncts.find((n) => n.goal.toLowerCase().includes(item.suggested_nct_link!.toLowerCase()))
        : null;

      await fetch("/api/sprint-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sprintId: newSprint.id,
          name: item.name,
          scope: item.scope,
          ownerId: ownerMember?.id || null,
          definitionOfDone: item.definition_of_done,
          whyNow: item.why_now,
          calendarUrgency: item.calendar_urgency,
          impact: item.impact,
          nctId: nctMatch?.id || null,
          deadline: item.suggested_deadline,
          tasks: item.tasks,
        }),
      });
    }

    // Add backlog items + non-sprint items
    const allBacklog = [
      ...backlogItems,
      ...sprintItems.filter((i) => !i.addToSprint).map((i) => ({
        name: i.name, scope: i.scope, description: i.definition_of_done,
        calendar_urgency: i.calendar_urgency, impact: i.impact, suggested_nct_link: i.suggested_nct_link,
      })),
    ];

    for (const item of allBacklog) {
      const nctMatch = item.suggested_nct_link
        ? ncts.find((n) => n.goal.toLowerCase().includes(item.suggested_nct_link!.toLowerCase()))
        : null;
      await fetch("/api/backlog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: item.name,
          scope: item.scope,
          description: item.description,
          calendarUrgency: item.calendar_urgency,
          impact: item.impact,
          nctId: nctMatch?.id || null,
        }),
      });
    }

    setCreating(false);
    window.location.href = "/sprints";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Weekly Kickoff</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-2 text-sm">
        {[
          { n: 1, label: "Input Transcript" },
          { n: 2, label: "Processing" },
          { n: 3, label: "Review & Edit" },
          { n: 4, label: "Start Sprint" },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
              step >= n ? "bg-zinc-900 text-white" : "bg-zinc-200 text-zinc-500"
            }`}>{n}</span>
            <span className={step >= n ? "text-zinc-900" : "text-zinc-400"}>{label}</span>
            {n < 4 && <span className="text-zinc-300 mx-1">/</span>}
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === 1 && (
        <Card>
          <h2 className="font-medium mb-3">Paste Meeting Transcript</h2>
          <textarea
            className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-md font-mono"
            rows={16}
            placeholder="Paste your meeting transcript here..."
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
          />
          <div className="flex items-center justify-between mt-3">
            <label className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md cursor-pointer hover:bg-zinc-50">
              Upload .txt file
              <input type="file" accept=".txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} />
            </label>
            <button
              onClick={processTranscriptHandler}
              disabled={!transcript.trim() || processing}
              className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
            >
              Process Transcript
            </button>
          </div>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

          {/* Manual option */}
          <div className="mt-4 pt-4 border-t border-zinc-100">
            <button onClick={() => { setSprintItems([]); setBacklogItems([]); setStep(3); }} className="text-sm text-zinc-500 hover:text-zinc-900">
              Or skip AI and create sprint items manually
            </button>
          </div>
        </Card>
      )}

      {/* Step 2: Processing */}
      {step === 1 && processing && (
        <Card>
          <div className="flex items-center gap-3 py-4">
            <div className="animate-spin h-5 w-5 border-2 border-zinc-300 border-t-zinc-900 rounded-full" />
            <span className="text-sm text-zinc-600">Analyzing transcript...</span>
          </div>
        </Card>
      )}

      {/* Step 3: Review & Edit */}
      {step === 3 && (
        <>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-medium">Sprint Items ({sprintItems.filter((i) => i.addToSprint).length}/4 max)</h2>
              <button
                onClick={() => {
                  setSprintItems([...sprintItems, {
                    name: "", scope: "Other", owner: "Unassigned",
                    definition_of_done: "", tasks: [], why_now: "",
                    calendar_urgency: 1, impact: 1,
                    suggested_nct_link: null, suggested_deadline: null,
                    addToSprint: true,
                  }]);
                }}
                className="text-sm text-zinc-500 hover:text-zinc-900"
              >
                + Add Item
              </button>
            </div>

            {sprintItems.map((item, index) => (
              <Card key={index} className={item.addToSprint ? "border-blue-200" : "border-zinc-200 opacity-75"}>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      className="flex-1 px-3 py-1.5 text-sm font-medium border border-zinc-200 rounded-md"
                      placeholder="Item name"
                      value={item.name}
                      onChange={(e) => updateSprintItem(index, { name: e.target.value })}
                    />
                    <button onClick={() => toggleSprint(index)} className={`px-3 py-1.5 text-xs rounded-md border ${item.addToSprint ? "bg-blue-50 border-blue-200 text-blue-700" : "border-zinc-200 text-zinc-500"}`}>
                      {item.addToSprint ? "Sprint" : "Backlog"}
                    </button>
                    <button onClick={() => removeSprintItem(index)} className="text-zinc-400 hover:text-red-500 text-sm px-1">&times;</button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={item.scope} onChange={(e) => updateSprintItem(index, { scope: e.target.value })}>
                      {SCOPES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                    <select className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={item.owner} onChange={(e) => updateSprintItem(index, { owner: e.target.value })}>
                      <option value="Unassigned">Unassigned</option>
                      {teamMembers.map((m) => <option key={m.id} value={m.name}>{m.name}</option>)}
                    </select>
                    <input type="date" className="px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={item.suggested_deadline || ""} onChange={(e) => updateSprintItem(index, { suggested_deadline: e.target.value || null })} />
                  </div>

                  <textarea
                    className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md"
                    rows={2}
                    placeholder="Definition of done"
                    value={item.definition_of_done}
                    onChange={(e) => updateSprintItem(index, { definition_of_done: e.target.value })}
                  />

                  <div>
                    <label className="text-xs text-zinc-500 mb-1 block">Tasks</label>
                    {item.tasks.map((task, ti) => (
                      <div key={ti} className="flex items-center gap-2 mb-1">
                        <input
                          className="flex-1 px-2 py-1 text-sm border border-zinc-200 rounded"
                          value={task}
                          onChange={(e) => {
                            const newTasks = [...item.tasks];
                            newTasks[ti] = e.target.value;
                            updateSprintItem(index, { tasks: newTasks });
                          }}
                        />
                        <button onClick={() => updateSprintItem(index, { tasks: item.tasks.filter((_, i) => i !== ti) })} className="text-zinc-400 hover:text-red-500 text-xs">&times;</button>
                      </div>
                    ))}
                    <button onClick={() => updateSprintItem(index, { tasks: [...item.tasks, ""] })} className="text-xs text-zinc-500 hover:text-zinc-900">+ Add task</button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-zinc-500">Calendar Urgency</label>
                      <select className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={item.calendar_urgency} onChange={(e) => updateSprintItem(index, { calendar_urgency: Number(e.target.value) })}>
                        <option value={1}>1 - No pressure</option>
                        <option value={2}>2 - 4-8 weeks</option>
                        <option value={3}>3 - Within 4 weeks</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-zinc-500">Impact</label>
                      <select className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={item.impact} onChange={(e) => updateSprintItem(index, { impact: Number(e.target.value) })}>
                        <option value={1}>1 - Research</option>
                        <option value={2}>2 - Indirect</option>
                        <option value={3}>3 - Direct</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500">
                    <Badge className={SCOPE_COLORS[item.scope]}>{item.scope}</Badge>
                    <span>ICE: {calculateIceScore(item.calendar_urgency, item.impact)}</span>
                    {item.why_now && <span className="italic">{item.why_now}</span>}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {backlogItems.length > 0 && (
            <div>
              <h2 className="font-medium mb-2">Backlog Items</h2>
              <div className="space-y-2">
                {backlogItems.map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2 bg-white rounded-lg border border-zinc-200">
                    <div>
                      <span className="text-sm font-medium">{item.name}</span>
                      <span className="text-xs text-zinc-500 ml-2">{item.description}</span>
                    </div>
                    <Badge className={SCOPE_COLORS[item.scope]}>{item.scope}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sprint config + launch */}
          <Card>
            <h2 className="font-medium mb-3">Sprint Configuration</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Sprint Name (optional)</label>
                <input className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" placeholder="e.g., Sprint 12" value={sprintName} onChange={(e) => setSprintName(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Start Date</label>
                <input type="date" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={sprintStart} onChange={(e) => setSprintStart(e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-zinc-500 block mb-1">End Date</label>
                <input type="date" className="w-full px-3 py-1.5 text-sm border border-zinc-200 rounded-md" value={sprintEnd} onChange={(e) => setSprintEnd(e.target.value)} />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-zinc-500 hover:text-zinc-900">Back to transcript</button>
              <button
                onClick={startSprint}
                disabled={creating || sprintItems.filter((i) => i.addToSprint).length === 0}
                className="px-4 py-2 text-sm bg-zinc-900 text-white rounded-md hover:bg-zinc-800 disabled:opacity-50"
              >
                {creating ? "Creating Sprint..." : `Start Sprint (${sprintItems.filter((i) => i.addToSprint).length} items)`}
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
