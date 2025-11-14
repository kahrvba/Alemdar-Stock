"use server";

export type QuickNoteStatus = "in_progress" | "resolved";

export type QuickNote = {
  id: string;
  message: string;
  status: QuickNoteStatus;
  createdAt: string;
  updatedAt: string;
};

type QuickNoteStore = {
  notes: QuickNote[];
};

const STORE_SYMBOL = Symbol.for("alemdar.quick-note-store");

function getGlobalStore(): QuickNoteStore {
  const globalSymbols = Object.getOwnPropertySymbols(globalThis);
  if (!globalSymbols.includes(STORE_SYMBOL)) {
    (globalThis as typeof globalThis & { [STORE_SYMBOL]: QuickNoteStore })[
      STORE_SYMBOL
    ] = {
      notes: [],
    };
  }

  return (globalThis as typeof globalThis & { [STORE_SYMBOL]: QuickNoteStore })[
    STORE_SYMBOL
  ];
}

export async function getNotes(): Promise<QuickNote[]> {
  return Promise.resolve(
    [...getGlobalStore().notes].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    )
  );
}

export async function addNote(message: string): Promise<QuickNote> {
  const store = getGlobalStore();
  const now = new Date().toISOString();
  const note: QuickNote = {
    id: crypto.randomUUID(),
    message,
    status: "in_progress",
    createdAt: now,
    updatedAt: now,
  };
  store.notes = [note, ...store.notes];
  return Promise.resolve(note);
}

export async function updateNote(
  id: string,
  status: QuickNoteStatus
): Promise<QuickNote | null> {
  const store = getGlobalStore();
  const index = store.notes.findIndex((note) => note.id === id);
  if (index === -1) {
    return Promise.resolve(null);
  }
  const updated: QuickNote = {
    ...store.notes[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  store.notes[index] = updated;
  return Promise.resolve(updated);
}

