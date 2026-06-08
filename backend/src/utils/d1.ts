import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type { User, Event, Job, JobStatus, RateLimit } from '../shared';

/**
 * Typed wrapper around Cloudflare D1 binding.
 * Usage: const db = new D1Helper(env.DB);
 */
export class D1Helper {
  constructor(private db: D1Database) {}

  // ─── Generic Queries ─────────────────────────────────

  async first<T>(query: string, ...params: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      const result = await stmt.bind(...params).first<T>();
      return result ?? null;
    }
    return await stmt.first<T>() ?? null;
  }

  async all<T>(query: string, ...params: unknown[]): Promise<{ results: T[]; success: boolean }> {
    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      return stmt.bind(...params).all<T>();
    }
    return stmt.all<T>();
  }

  async run(query: string, ...params: unknown[]): Promise<D1Result> {
    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      return stmt.bind(...params).run();
    }
    return stmt.run();
  }

  // ─── Users ────────────────────────────────────────────

  async getUserById(id: string): Promise<User | null> {
    return this.first<User>('SELECT * FROM users WHERE id = ?', id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.first<User>('SELECT * FROM users WHERE email = ?', email);
  }

  async upsertUser(user: Omit<User, 'createdAt'>): Promise<void> {
    await this.run(
      `INSERT INTO users (id, email, name, image, role, created_at)
       VALUES (?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(email) DO UPDATE SET
         id = excluded.id,
         name = excluded.name,
         image = excluded.image,
         role = excluded.role`,
      user.id,
      user.email,
      user.name ?? null,
      user.image ?? null,
      user.role
    );
  }

  // ─── Events ───────────────────────────────────────────

  async getActiveEvents(
    category?: string,
    page = 1,
    pageSize = 20
  ): Promise<{ events: Event[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const categoryFilter = category ? 'AND category = ?' : '';
    const params = category ? [category, pageSize, offset] : [pageSize, offset];

    const countResult = await this.first<{ count: number }>(
      `SELECT COUNT(*) as count FROM events WHERE status = 'active' ${categoryFilter}`,
      ...(category ? [category] : [])
    );

    const rows = await this.all<Record<string, unknown>>(
      `SELECT * FROM events
       WHERE status = 'active' ${categoryFilter}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      ...params
    );

    return {
      events: rows.results.map((row) => this.mapEvent(row)),
      total: countResult?.count ?? 0,
    };
  }

  async getEventById(id: string): Promise<Event | null> {
    const row = await this.first<Record<string, unknown>>(
      'SELECT * FROM events WHERE id = ?',
      id
    );
    return row ? this.mapEvent(row) : null;
  }

  async getAllEvents(page = 1, pageSize = 20): Promise<{ events: Event[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await this.first<{ count: number }>(
      'SELECT COUNT(*) as count FROM events'
    );
    const rows = await this.all<Record<string, unknown>>(
      'SELECT * FROM events ORDER BY created_at DESC LIMIT ? OFFSET ?',
      pageSize,
      offset
    );
    return {
      events: rows.results.map((row) => this.mapEvent(row)),
      total: countResult?.count ?? 0,
    };
  }

  async createEvent(event: Omit<Event, 'createdAt'>): Promise<void> {
    await this.run(
      `INSERT INTO events (id, title, category, description, video_url, thumbnail_url, duration, status, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      event.id,
      event.title,
      event.category,
      event.description ?? null,
      event.videoUrl,
      event.thumbnailUrl ?? null,
      event.duration ?? null,
      event.status,
      event.createdBy
    );
  }

  async updateEvent(
    id: string,
    updates: Partial<Pick<Event, 'title' | 'category' | 'description' | 'duration' | 'status'>>
  ): Promise<void> {
    const fields: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        fields.push(`${camelToSnake(key)} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) return;

    values.push(id);
    await this.run(`UPDATE events SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async deleteEvent(id: string): Promise<void> {
    await this.run('DELETE FROM events WHERE id = ?', id);
  }

  // ─── Jobs ──────────────────────────────────────────────

  async createJob(
    job: Omit<Job, 'createdAt' | 'completedAt'>
  ): Promise<void> {
    await this.run(
      `INSERT INTO jobs (id, user_id, event_id, fal_request_id, input_image, output_video, status, error_message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      job.id,
      job.userId,
      job.eventId,
      job.falRequestId ?? null,
      job.inputImage,
      job.outputVideo ?? null,
      job.status,
      job.errorMessage ?? null
    );
  }

  async getJobById(id: string): Promise<Job | null> {
    const row = await this.first<Record<string, unknown>>(
      'SELECT * FROM jobs WHERE id = ?',
      id
    );
    return row ? this.mapJob(row) : null;
  }

  async updateJobStatus(
    id: string,
    status: JobStatus,
    outputVideo?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.run(
      `UPDATE jobs SET
        status = ?,
        output_video = COALESCE(?, output_video),
        error_message = ?,
        completed_at = CASE WHEN ? IN ('completed', 'failed') THEN unixepoch() ELSE completed_at END
       WHERE id = ?`,
      status,
      outputVideo ?? null,
      errorMessage ?? null,
      status,
      id
    );
  }

  async updateJobFalRequestId(id: string, falRequestId: string): Promise<void> {
    await this.run(
      'UPDATE jobs SET fal_request_id = ?, status = ? WHERE id = ?',
      falRequestId,
      'processing',
      id
    );
  }

  async getUserJobs(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ jobs: Job[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await this.first<{ count: number }>(
      'SELECT COUNT(*) as count FROM jobs WHERE user_id = ?',
      userId
    );
    const rows = await this.all<Record<string, unknown>>(
      'SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      userId,
      pageSize,
      offset
    );
    return {
      jobs: rows.results.map((row) => this.mapJob(row)),
      total: countResult?.count ?? 0,
    };
  }

  // ─── Rate Limits ──────────────────────────────────────

  async getTodayGenerationCount(userId: string): Promise<number> {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const row = await this.first<{ count: number }>(
      'SELECT count FROM rate_limits WHERE user_id = ? AND date = ?',
      userId,
      today
    );
    return row?.count ?? 0;
  }

  async incrementGenerationCount(userId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    await this.run(
      `INSERT INTO rate_limits (user_id, date, count) VALUES (?, ?, 1)
       ON CONFLICT(user_id, date) DO UPDATE SET count = count + 1`,
      userId,
      today
    );
  }

  // ─── Row Mappers ──────────────────────────────────────

  private mapEvent(row: Record<string, unknown>): Event {
    return {
      id: row.id as string,
      title: row.title as string,
      category: row.category as Event['category'],
      description: (row.description as string) ?? undefined,
      videoUrl: row.video_url as string,
      thumbnailUrl: (row.thumbnail_url as string) ?? undefined,
      duration: (row.duration as number) ?? undefined,
      status: row.status as Event['status'],
      createdBy: row.created_by as string,
      createdAt: row.created_at as number,
    };
  }

  private mapJob(row: Record<string, unknown>): Job {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      eventId: row.event_id as string,
      falRequestId: (row.fal_request_id as string) ?? undefined,
      inputImage: row.input_image as string,
      outputVideo: (row.output_video as string) ?? undefined,
      status: row.status as JobStatus,
      errorMessage: (row.error_message as string) ?? undefined,
      createdAt: row.created_at as number,
      completedAt: (row.completed_at as number) ?? undefined,
    };
  }
}

/** Convert camelCase to snake_case */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
