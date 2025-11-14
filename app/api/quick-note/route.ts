"use server";

import { NextResponse } from "next/server";
import { addNote, getNotes, updateNote, QuickNoteStatus } from "./store";

type QuickNotePayload = {
  note?: string;
};

type UpdatePayload = {
  id?: string;
  status?: QuickNoteStatus;
};

export async function GET() {
  return NextResponse.json({ notes: await getNotes() });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as QuickNotePayload;
    const trimmed = payload.note?.trim();

    if (!trimmed) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    const note = await addNote(trimmed);
    console.info("[quick-note:add]", note);

    return NextResponse.json({ note, notes: await getNotes() });
  } catch (error) {
    console.error("[quick-note] failed to log", error);
    return NextResponse.json(
      { error: "Failed to record note." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const payload = (await request.json()) as UpdatePayload;
    const id = payload.id;
    const status = payload.status;

    if (!id || !status) {
      return NextResponse.json(
        { error: "Note id and status are required." },
        { status: 400 }
      );
    }

    const updated = await updateNote(id, status);

    if (!updated) {
      return NextResponse.json({ error: "Note not found." }, { status: 404 });
    }

    console.info("[quick-note:update]", updated);

    return NextResponse.json({ note: updated, notes: await getNotes() });
  } catch (error) {
    console.error("[quick-note] failed to update", error);
    return NextResponse.json(
      { error: "Failed to update note." },
      { status: 500 }
    );
  }
}

