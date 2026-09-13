import type { AppendixAKit } from '@repo/shared';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  user: UserProfile;
  token: string;
}

export interface KitRecord {
  id: string;
  userId: string;
  kit: AppendixAKit;
  itemMeta?: Record<string, { origin: 'generated' | 'user_edited' | 'user_added'; isPinned: boolean }>;
  deletedItemIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SseProgressEvent {
  step: string;
  message: string;
  data?: any;
  timestamp: string;
}

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('auth_token', token);
      } else {
        localStorage.removeItem('auth_token');
      }
    }
  }

  getToken(): string | null {
    if (!this.token && typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    if (!res.ok) {
      let errorMsg = `HTTP ${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body.error) {
          errorMsg = body.error + (body.details ? `: ${JSON.stringify(body.details)}` : '');
        }
      } catch {
        // use default statusText
      }
      throw new Error(errorMsg);
    }

    return res.json() as Promise<T>;
  }

  // --- Auth Endpoints ---

  async register(data: { email: string; password: string; name: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const res = await this.request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/api/auth/logout', { method: 'POST' });
    } finally {
      this.setToken(null);
    }
  }

  async getMe(): Promise<{ user: UserProfile }> {
    return this.request<{ user: UserProfile }>('/api/auth/me');
  }

  // --- Kit Endpoints ---

  async getKits(): Promise<KitRecord[]> {
    return this.request<KitRecord[]>('/api/kits');
  }

  async getKitById(id: string): Promise<KitRecord> {
    return this.request<KitRecord>(`/api/kits/${id}`);
  }

  async createKit(data: { jd: string; company_url: string; days: number } | { kit: AppendixAKit }): Promise<KitRecord> {
    return this.request<KitRecord>('/api/kits', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateKit(id: string, data: { kit?: AppendixAKit; itemMeta?: any; deletedItemIds?: string[] }): Promise<KitRecord> {
    return this.request<KitRecord>(`/api/kits/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteKit(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/kits/${id}`, {
      method: 'DELETE',
    });
  }

  async regenerateSection(id: string, section: string): Promise<{ regeneratedSection: string; kit: AppendixAKit; itemMeta: any }> {
    return this.request(`/api/kits/${id}/regenerate/${section}`, {
      method: 'POST',
    });
  }

  // --- Real-time Generation SSE ---

  async startGeneration(data: { jd: string; company_url: string; days: number }): Promise<{ sessionId: string; message: string }> {
    return this.request<{ sessionId: string; message: string }>('/api/kits/generate/start', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  subscribeProgress(
    sessionId: string,
    onEvent: (event: SseProgressEvent) => void,
    onError: (err: Error) => void
  ): () => void {
    const url = `${API_BASE}/api/kits/generate/progress/${sessionId}`;
    const eventSource = new EventSource(url, { withCredentials: true });

    eventSource.onmessage = (e) => {
      try {
        const parsed: SseProgressEvent = JSON.parse(e.data);
        onEvent(parsed);
        if (parsed.step === 'completed' || parsed.step === 'failed') {
          eventSource.close();
        }
      } catch (err) {
        onError(err instanceof Error ? err : new Error('Failed to parse SSE event'));
      }
    };

    eventSource.onerror = () => {
      // EventSource error could be network disconnect or completion close
      onError(new Error('SSE connection error'));
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }
}

export const api = new ApiClient();
