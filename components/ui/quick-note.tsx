"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

type QuickNoteStatus = "in_progress" | "resolved";

type QuickNote = {
  id: string;
  message: string;
  status: QuickNoteStatus;
  createdAt: string;
  updatedAt: string;
};

const statusCopy: Record<QuickNoteStatus, string> = {
  in_progress: "In Progress",
  resolved: "Resolved",
};

export function QuickNoteButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState("");
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [notesState, setNotesState] = useState<
    "idle" | "loading" | "error"
  >("idle");

  const orderedNotes = useMemo(() => notes, [notes]);

  const fetchNotes = useCallback(async () => {
    try {
      setNotesState("loading");
      const response = await fetch("/api/quick-note", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to load notes");
      }

      const data = (await response.json()) as { notes?: QuickNote[] };
      setNotes(data.notes ?? []);
      setNotesState("idle");
    } catch (error) {
      console.error("[quick-note] fetch failed", error);
      setNotesState("error");
    }
  }, []);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setStatus("idle");
    setMessage("");
    if (!isOpen) {
      fetchNotes();
    }
  };

  const handleSend = async () => {
    const trimmed = note.trim();
    if (!trimmed) {
      setStatus("error");
      setMessage("Please add a note before sending.");
      return;
    }

    try {
      setStatus("sending");
      setMessage("Sending...");
      const response = await fetch("/api/quick-note", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ note: trimmed }),
      });

      if (!response.ok) {
        throw new Error("Request failed");
      }

      const data = (await response.json()) as {
        notes?: QuickNote[];
      };

      setNotes(data.notes ?? []);
      setStatus("success");
      setNote("");
      setMessage("Note saved to log.");
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 1500);
    } catch {
      setStatus("error");
      setMessage("Could not save the note. Try again.");
    }
  };

  const handleStatusChange = async (
    noteId: string,
    nextStatus: QuickNoteStatus
  ) => {
    try {
      const response = await fetch("/api/quick-note", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: noteId, status: nextStatus }),
      });

      if (!response.ok) {
        throw new Error("Failed to update note");
      }

      const data = (await response.json()) as {
        notes?: QuickNote[];
      };

      setNotes(data.notes ?? []);
    } catch (error) {
      console.error("[quick-note] update failed", error);
      setStatus("error");
      setMessage("Could not update the note.");
      setTimeout(() => {
        setStatus("idle");
        setMessage("");
      }, 2000);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          "fixed bottom-6 right-6 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-muted/70 text-foreground shadow-xl shadow-black/20 backdrop-blur transition hover:scale-105 hover:bg-muted active:scale-95"
        )}
        aria-expanded={isOpen}
        aria-label="Toggle quick note"
      >
        <span className="text-2xl font-semibold">{isOpen ? "×" : "✎"}</span>
      </button>

      {isOpen ? (
        <div className="fixed bottom-24 right-6 z-50 w-96 rounded-2xl border border-border/60 bg-popover/90 p-5 text-popover-foreground shadow-[0_20px_60px_-15px_rgba(0,0,0,0.45)] backdrop-blur-md">
          <header className="mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Quick Note to Ahmed
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Write updates, blockers, or shipping notes. Everyone can follow
              progress below.
            </p>
          </header>
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Type your message…"
            rows={4}
            className="w-full resize-none rounded-xl border border-border/60 bg-muted/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-border focus:ring-2 focus:ring-border"
          />
          <div className="mt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handleSend}
              disabled={status === "sending"}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition active:scale-95",
                status === "sending"
                  ? "cursor-wait bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {status === "sending" ? "Sending..." : "Save"}
            </button>
            {status !== "idle" && (
              <span
                className={cn(
                  "text-xs font-medium",
                  status === "success"
                    ? "text-emerald-400"
                    : status === "sending"
                      ? "text-muted-foreground"
                      : "text-red-400"
                )}
              >
                {message}
              </span>
            )}
          </div>

          <div className="mt-5 h-px w-full bg-border/60" />

          <section className="mt-4">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
              <span>Activity</span>
              <button
                type="button"
                className="text-[0.65rem] uppercase tracking-[0.4em] text-muted-foreground transition hover:text-foreground"
                onClick={fetchNotes}
              >
                Refresh
              </button>
            </div>

            <div className="mt-3 max-h-64 space-y-3 overflow-y-auto pr-1">
              {notesState === "loading" ? (
                <p className="text-sm text-muted-foreground">Loading notes…</p>
              ) : notesState === "error" ? (
                <p className="text-sm text-red-400">
                  Could not load notes. Try refreshing.
                </p>
              ) : orderedNotes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No notes yet. Your updates will appear here.
                </p>
              ) : (
                orderedNotes.map((item) => {
                  const nextStatus: QuickNoteStatus =
                    item.status === "resolved" ? "in_progress" : "resolved";

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-border/60 bg-card/80 px-4 py-3"
                    >
                      <p className="text-sm text-foreground">{item.message}</p>
                      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                        <span
                          className={cn(
                            "rounded-full px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em]",
                            item.status === "resolved"
                              ? "bg-emerald-500/20 text-emerald-500 dark:text-emerald-300"
                              : "bg-amber-500/20 text-amber-600 dark:text-amber-200"
                          )}
                        >
                          {statusCopy[item.status]}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(item.id, nextStatus)}
                          className="rounded-full border border-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-white transition hover:border-white/30 hover:bg-white/10"
                        >
                          {nextStatus === "resolved"
                            ? "Mark Resolved"
                            : "Reopen"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

