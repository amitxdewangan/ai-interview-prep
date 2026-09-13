export interface SseEvent {
  step: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface SseSession {
  id: string;
  status: 'running' | 'completed' | 'failed';
  events: SseEvent[];
  result?: any;
  error?: string;
  listeners: Array<(event: SseEvent) => void>;
}

class SseSessionManager {
  private sessions = new Map<string, SseSession>();

  createSession(sessionId: string): SseSession {
    const session: SseSession = {
      id: sessionId,
      status: 'running',
      events: [],
      listeners: [],
    };
    this.sessions.set(sessionId, session);
    return session;
  }

  getSession(sessionId: string): SseSession | undefined {
    return this.sessions.get(sessionId);
  }

  emitProgress(sessionId: string, step: string, message: string, data?: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const event: SseEvent = {
      step,
      message,
      data,
      timestamp: new Date().toISOString(),
    };

    session.events.push(event);

    for (const listener of session.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[SSE] Error in listener for session ${sessionId}:`, err);
      }
    }
  }

  completeSession(sessionId: string, result: any): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'completed';
    session.result = result;

    this.emitProgress(sessionId, 'completed', 'Preparation kit generated successfully', result);

    // Schedule cleanup after 10 minutes
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 10 * 60 * 1000);
  }

  failSession(sessionId: string, error: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.status = 'failed';
    session.error = error;

    this.emitProgress(sessionId, 'failed', error, { error });

    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 10 * 60 * 1000);
  }

  addListener(sessionId: string, listener: (event: SseEvent) => void): () => void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return () => {};
    }

    session.listeners.push(listener);

    // Return cleanup unsubscribe function
    return () => {
      const idx = session.listeners.indexOf(listener);
      if (idx !== -1) {
        session.listeners.splice(idx, 1);
      }
    };
  }

  clear(): void {
    this.sessions.clear();
  }
}

export const sseManager = new SseSessionManager();
