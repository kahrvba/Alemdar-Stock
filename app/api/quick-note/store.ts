"use server";

import pool from "@/lib/db";

export type QuickNoteStatus = "in_progress" | "resolved";

export type QuickNote = {
  id: string;
  message: string;
  status: QuickNoteStatus;
  createdAt: string;
  updatedAt: string;
};

export async function getNotes(): Promise<QuickNote[]> {
  const client = await pool.connect();
  try {
    await client.query("SET client_encoding = 'UTF8';");
    const result = await client.query(
      `SELECT id, message, status, created_at, updated_at 
       FROM public.quick_notes 
       ORDER BY created_at DESC`
    );
    
    return result.rows.map((row) => ({
      id: row.id,
      message: row.message,
      status: row.status as QuickNoteStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (error) {
    console.error("[quick-note] getNotes error:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function addNote(message: string): Promise<QuickNote> {
  const client = await pool.connect();
  try {
    await client.query("SET client_encoding = 'UTF8';");
    await client.query("BEGIN");
    
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    
    const result = await client.query(
      `INSERT INTO public.quick_notes (id, message, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, message, status, created_at, updated_at`,
      [id, message, "in_progress", now, now]
    );
    
    await client.query("COMMIT");
    
    const row = result.rows[0];
    return {
      id: row.id,
      message: row.message,
      status: row.status as QuickNoteStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[quick-note] addNote error:", error);
    throw error;
  } finally {
    client.release();
  }
}

export async function updateNote(
  id: string,
  status: QuickNoteStatus
): Promise<QuickNote | null> {
  const client = await pool.connect();
  try {
    await client.query("SET client_encoding = 'UTF8';");
    await client.query("BEGIN");
    
    const now = new Date().toISOString();
    
    const result = await client.query(
      `UPDATE public.quick_notes 
       SET status = $1, updated_at = $2
       WHERE id = $3
       RETURNING id, message, status, created_at, updated_at`,
      [status, now, id]
    );
    
    if (result.rows.length === 0) {
      await client.query("ROLLBACK");
      return null;
    }
    
    await client.query("COMMIT");
    
    const row = result.rows[0];
    return {
      id: row.id,
      message: row.message,
      status: row.status as QuickNoteStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[quick-note] updateNote error:", error);
    throw error;
  } finally {
    client.release();
  }
}

