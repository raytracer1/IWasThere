import type { D1Database, D1Result } from '@cloudflare/workers-types';
import type { User, Event, Generation, GenerationStatus, SportType } from '../shared';

/**
 * Typed wrapper around Cloudflare D1 binding.
 */
export class D1Helper {
  constructor(private db: D1Database) {}

  // ─── Generic Queries ─────────────────────────────────

  async first<T>(query: string, ...params: unknown[]): Promise<T | null> {
    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      const result = await stmt.bind(...params.map(v => v === undefined ? null : v)).first<T>();
      return result ?? null;
    }
    return await stmt.first<T>() ?? null;
  }

  async all<T>(query: string, ...params: unknown[]): Promise<{ results: T[]; success: boolean }> {
    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      return stmt.bind(...params.map(v => v === undefined ? null : v)).all<T>();
    }
    return stmt.all<T>();
  }

  async run(query: string, ...params: unknown[]): Promise<D1Result> {
    const stmt = this.db.prepare(query);
    if (params.length > 0) {
      return stmt.bind(...params.map(v => v === undefined ? null : v)).run();
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

  async upsertUser(user: Omit<User, 'createdAt' | 'role'>): Promise<void> {
    await this.run(
      `INSERT INTO users (id, email, name, image, credits, created_at)
       VALUES (?, ?, ?, ?, ?, unixepoch())
       ON CONFLICT(email) DO UPDATE SET
         name = excluded.name,
         image = excluded.image`,
      user.id,
      user.email,
      user.name ?? null,
      user.image ?? null,
      user.credits ?? 0
    );
  }

  // ─── Events ───────────────────────────────────────────

  async getActiveEvents(
    sportType?: string,
    page = 1,
    pageSize = 20
  ): Promise<{ events: Event[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const sportFilter = sportType ? 'AND sport_type = ?' : '';
    const params = sportType ? [sportType, pageSize, offset] : [pageSize, offset];

    const countResult = await this.first<{ count: number }>(
      `SELECT COUNT(*) as count FROM events WHERE status = 'active' ${sportFilter}`,
      ...(sportType ? [sportType] : [])
    );

    const rows = await this.all<Record<string, unknown>>(
      `SELECT * FROM events
       WHERE status = 'active' ${sportFilter}
       ORDER BY viral_score DESC, created_at DESC
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
      `INSERT INTO events (id, title, year, location, sport_type, description, key_moment, era_clothing, image_prompt, caption_templates, hashtags, viral_score, thumbnail_url, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      event.id,
      event.title,
      event.year,
      event.location ?? null,
      event.sportType,
      event.description ?? null,
      event.keyMoment ?? null,
      event.eraClothing ?? null,
      event.imagePrompt,
      event.captionTemplates ?? null,
      event.hashtags ?? null,
      event.viralScore ?? 5.0,
      event.thumbnailUrl ?? null,
      event.status
    );
  }

  async updateEvent(id: string, updates: Record<string, unknown>): Promise<void> {
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

  // ─── Generations ──────────────────────────────────────

  async createGeneration(gen: Omit<Generation, 'createdAt' | 'completedAt'>): Promise<void> {
    await this.run(
      `INSERT INTO generations (id, user_id, event_id, input_image, output_image, agnes_job_id, status, error_message, captions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      gen.id,
      gen.userId,
      gen.eventId,
      gen.inputImage,
      gen.outputImage ?? null,
      gen.agnesJobId ?? null,
      gen.status,
      gen.errorMessage ?? null,
      gen.captions ?? null
    );
  }

  async getGenerationById(id: string): Promise<Generation | null> {
    const row = await this.first<Record<string, unknown>>(
      'SELECT * FROM generations WHERE id = ?',
      id
    );
    return row ? this.mapGeneration(row) : null;
  }

  async updateGeneration(id: string, updates: Partial<Generation>): Promise<void> {
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
    await this.run(`UPDATE generations SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  async updateGenerationStatus(
    id: string,
    status: GenerationStatus,
    outputImage?: string,
    errorMessage?: string,
    captions?: string
  ): Promise<void> {
    await this.run(
      `UPDATE generations SET
        status = ?,
        output_image = COALESCE(?, output_image),
        error_message = ?,
        captions = COALESCE(?, captions),
        completed_at = CASE WHEN ? IN ('completed', 'failed') THEN unixepoch() ELSE completed_at END
       WHERE id = ?`,
      status,
      outputImage ?? null,
      errorMessage ?? null,
      captions ?? null,
      status,
      id
    );
  }

  async getUserGenerations(
    userId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ generations: Generation[]; total: number }> {
    const offset = (page - 1) * pageSize;
    const countResult = await this.first<{ count: number }>(
      'SELECT COUNT(*) as count FROM generations WHERE user_id = ?',
      userId
    );
    const rows = await this.all<Record<string, unknown>>(
      'SELECT g.*, e.title as event_title, e.year as event_year, e.sport_type as event_sport_type, e.thumbnail_url as event_thumbnail FROM generations g LEFT JOIN events e ON g.event_id = e.id WHERE g.user_id = ? ORDER BY g.created_at DESC LIMIT ? OFFSET ?',
      userId,
      pageSize,
      offset
    );
    return {
      generations: rows.results.map((row) => this.mapGeneration(row)),
      total: countResult?.count ?? 0,
    };
  }

  // ─── Row Mappers ──────────────────────────────────────

  private mapEvent(row: Record<string, unknown>): Event {
    return {
      id: row.id as string,
      title: row.title as string,
      year: row.year as number,
      location: (row.location as string) ?? undefined,
      sportType: row.sport_type as SportType,
      description: (row.description as string) ?? undefined,
      keyMoment: (row.key_moment as string) ?? undefined,
      eraClothing: (row.era_clothing as string) ?? undefined,
      imagePrompt: row.image_prompt as string,
      captionTemplates: (row.caption_templates as string) ?? '[]',
      hashtags: (row.hashtags as string) ?? '',
      viralScore: row.viral_score as number,
      thumbnailUrl: (row.thumbnail_url as string) ?? undefined,
      status: row.status as Event['status'],
      createdAt: row.created_at as number,
    };
  }

  private mapGeneration(row: Record<string, unknown>): Generation {
    return {
      id: row.id as string,
      userId: row.user_id as string,
      eventId: row.event_id as string,
      inputImage: row.input_image as string,
      outputImage: (row.output_image as string) ?? undefined,
      agnesJobId: (row.agnes_job_id as string) ?? undefined,
      status: row.status as GenerationStatus,
      errorMessage: (row.error_message as string) ?? undefined,
      captions: (row.captions as string) ?? undefined,
      selectedCaption: (row.selected_caption as string) ?? undefined,
      createdAt: row.created_at as number,
      completedAt: (row.completed_at as number) ?? undefined,
      // Joined fields
      eventTitle: (row as { event_title?: string }).event_title,
      eventYear: (row as { event_year?: number }).event_year,
      eventSportType: (row as { event_sport_type?: string }).event_sport_type,
      eventThumbnail: (row as { event_thumbnail?: string }).event_thumbnail,
    } as Generation & {
      eventTitle?: string;
      eventYear?: number;
      eventSportType?: string;
      eventThumbnail?: string;
    };
  }
}

/** Convert camelCase to snake_case */
function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}
