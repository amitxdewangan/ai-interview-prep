import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app.js';
import { UserStore } from '../models/User.js';
import { KitStore } from '../models/Kit.js';
import { sseManager } from '../services/sseService.js';
import type { AppendixAKit } from '@repo/shared';

// Mock valid Appendix A kit fixture
function createMockKit(): AppendixAKit {
  return {
    source: {
      company: 'Acme Corp',
      company_url: 'https://acme.example.com',
      role: 'Senior TypeScript Engineer',
      location: 'Remote',
      jd_chars: 520,
      researched_at: new Date().toISOString(),
      pages_used: ['https://acme.example.com/about', 'https://acme.example.com/careers'],
    },
    company_brief: {
      summary: 'Acme Corp builds cloud workflow automation tools.',
      what_they_do: 'Enterprise automation, event orchestration, and API gateways.',
      sources: ['https://acme.example.com/about'],
    },
    role: {
      title: 'Senior TypeScript Engineer',
      seniority: 'Senior',
      responsibilities: ['Build high-throughput Node.js microservices', 'Mentor junior engineers'],
      requirements: [
        {
          id: 'r1',
          text: 'Deep TypeScript & Node.js expertise',
          kind: 'technical',
          priority: 'must',
        },
        {
          id: 'r2',
          text: 'Experience with distributed queues and event systems',
          kind: 'technical',
          priority: 'must',
        },
        {
          id: 'r3',
          text: 'Cross-functional engineering leadership',
          kind: 'behavioural',
          priority: 'must',
        },
        {
          id: 'r4',
          text: 'Familiarity with Kubernetes and Helm',
          kind: 'domain',
          priority: 'nice',
        },
      ],
    },
    questions: [
      {
        id: 'q1',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'How would you handle race conditions in an asynchronous event pipeline in Node.js?',
        answer_outline: 'Explain event loop phases, mutexes, idempotency keys, and optimistic concurrency.',
        difficulty: 2,
      },
      {
        id: 'q2',
        requirement_ids: ['r2'],
        category: 'technical',
        prompt: 'Design a dead-letter queue mechanism for processing webhook spikes.',
        answer_outline: 'Discuss exponential backoff, retry limits, alerting, and poison pill isolation.',
        difficulty: 3,
      },
      {
        id: 'q3',
        requirement_ids: ['r1'],
        category: 'technical',
        prompt: 'Explain advanced TypeScript utility types and template literal types.',
        answer_outline: 'Show conditional types, infer keyword, and mapped types.',
        difficulty: 2,
      },
      {
        id: 'q4',
        requirement_ids: ['r3'],
        category: 'behavioural',
        prompt: 'Tell me about a time you resolved a major disagreement between senior engineers.',
        answer_outline: 'Use STAR format: Situation, conflicting approaches, trade-off matrix, alignment.',
        difficulty: 2,
      },
    ],
    flashcards: [
      {
        id: 'f1',
        front: 'What is the Node.js event loop lag and how do you monitor it?',
        back: 'Event loop lag measures delay in scheduled callbacks. Monitor via perf_hooks eventLoopUtilization.',
        requirement_ids: ['r1'],
      },
      {
        id: 'f2',
        front: 'What is at-least-once delivery vs exactly-once delivery?',
        back: 'At-least-once allows duplicates (requires idempotency). Exactly-once guarantees single processing.',
        requirement_ids: ['r2'],
      },
    ],
    schedule: {
      days_available: 3,
      days: [
        {
          day: 1,
          focus: 'Deep technical core and event systems',
          question_ids: ['q2', 'q1'],
          minutes: 90,
        },
        {
          day: 2,
          focus: 'TypeScript architecture and system design',
          question_ids: ['q3'],
          minutes: 60,
        },
        {
          day: 3,
          focus: 'Behavioural and leadership polish',
          question_ids: ['q4'],
          minutes: 45,
        },
      ],
    },
    coverage: {
      uncovered_requirement_ids: [],
      passes: 1,
    },
  };
}

describe('Phase 7: Backend API, Persistence & State Preservation', () => {
  const app = createApp();

  beforeEach(() => {
    UserStore.clear();
    KitStore.clear();
    sseManager.clear();
  });

  // =========================================================================
  // 1. AUTHENTICATION & ACCESS CONTROL TESTS
  // =========================================================================
  describe('Authentication API (/api/auth)', () => {
    it('registers a new user, sets httpOnly cookie, and returns profile & token', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice Smith',
        });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user).toMatchObject({
        email: 'alice@example.com',
        name: 'Alice Smith',
      });
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).not.toHaveProperty('password');

      // Check cookie header
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies[0]).toMatch(/token=/);
      expect(cookies[0]).toMatch(/HttpOnly/i);
    });

    it('rejects registration with existing duplicate email', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'alice@example.com',
          password: 'password123',
          name: 'Alice Smith',
        });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'ALICE@example.com', // Case-insensitive duplicate check
          password: 'password456',
          name: 'Alice Duplicate',
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/already registered/i);
    });

    it('rejects registration with invalid input schema', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: '123', // Too short (< 6 chars)
          name: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('logs in an existing user with valid credentials', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'securePassword99',
          name: 'Bob Jones',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'securePassword99',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('bob@example.com');
    });

    it('rejects login with incorrect password', async () => {
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'bob@example.com',
          password: 'securePassword99',
          name: 'Bob Jones',
        });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toMatch(/Invalid email or password/i);
    });

    it('logs out and clears authentication cookie', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/Logged out successfully/i);
    });

    it('enforces requireAuth on protected /api/auth/me', async () => {
      const unauthRes = await request(app).get('/api/auth/me');
      expect(unauthRes.status).toBe(401);

      // Register and use token
      const regRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'carol@example.com',
          password: 'password123',
          name: 'Carol Danvers',
        });

      const token = regRes.body.token;

      const authRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(authRes.status).toBe(200);
      expect(authRes.body.user.email).toBe('carol@example.com');
    });
  });

  // =========================================================================
  // 2. KIT CRUD & TENANT ISOLATION TESTS
  // =========================================================================
  describe('Kit CRUD & User Isolation (/api/kits)', () => {
    let tokenUser1: string;
    let user1Id: string;
    let tokenUser2: string;
    let user2Id: string;

    beforeEach(async () => {
      const u1 = await request(app).post('/api/auth/register').send({
        email: 'user1@test.com',
        password: 'password123',
        name: 'User One',
      });
      tokenUser1 = u1.body.token;
      user1Id = u1.body.user.id;

      const u2 = await request(app).post('/api/auth/register').send({
        email: 'user2@test.com',
        password: 'password123',
        name: 'User Two',
      });
      tokenUser2 = u2.body.token;
      user2Id = u2.body.user.id;
    });

    it('creates a kit with auto-initialized item tracking state', async () => {
      const mockKit = createMockKit();
      const res = await request(app)
        .post('/api/kits')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ kit: mockKit });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.userId).toBe(user1Id);
      expect(res.body.kit.source.company).toBe('Acme Corp');

      // Verify itemMeta tracking was generated for questions and flashcards
      expect(res.body.itemMeta).toHaveProperty('q1');
      expect(res.body.itemMeta.q1).toEqual({ origin: 'generated', isPinned: false });
      expect(res.body.itemMeta).toHaveProperty('f1');
      expect(res.body.itemMeta.f1).toEqual({ origin: 'generated', isPinned: false });
      expect(res.body.deletedItemIds).toEqual([]);
    });

    it('strictly isolates kits between users', async () => {
      const mockKit = createMockKit();

      // User 1 creates kit
      const created = await request(app)
        .post('/api/kits')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ kit: mockKit });

      const kitId = created.body.id;

      // User 1 lists kits -> has 1 kit
      const listUser1 = await request(app)
        .get('/api/kits')
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(listUser1.status).toBe(200);
      expect(listUser1.body).toHaveLength(1);
      expect(listUser1.body[0].id).toBe(kitId);

      // User 2 lists kits -> has 0 kits
      const listUser2 = await request(app)
        .get('/api/kits')
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(listUser2.status).toBe(200);
      expect(listUser2.body).toHaveLength(0);

      // User 2 attempts to get User 1's kit by ID -> 404 access denied
      const getUser2 = await request(app)
        .get(`/api/kits/${kitId}`)
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(getUser2.status).toBe(404);

      // User 2 attempts to update User 1's kit -> 404 access denied
      const putUser2 = await request(app)
        .put(`/api/kits/${kitId}`)
        .set('Authorization', `Bearer ${tokenUser2}`)
        .send({ kit: mockKit });
      expect(putUser2.status).toBe(404);

      // User 2 attempts to delete User 1's kit -> 404 access denied
      const delUser2 = await request(app)
        .delete(`/api/kits/${kitId}`)
        .set('Authorization', `Bearer ${tokenUser2}`);
      expect(delUser2.status).toBe(404);
    });

    it('updates kit questions and persists user_edited and isPinned state', async () => {
      const mockKit = createMockKit();
      const created = await request(app)
        .post('/api/kits')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ kit: mockKit });

      const kitId = created.body.id;

      // User modifies question q1 and pins question q2
      mockKit.questions[0].prompt = 'Custom prompt edited by user!';
      const updatedMeta = {
        ...created.body.itemMeta,
        q1: { origin: 'user_edited', isPinned: false },
        q2: { origin: 'generated', isPinned: true },
      };

      const updateRes = await request(app)
        .put(`/api/kits/${kitId}`)
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({
          kit: mockKit,
          itemMeta: updatedMeta,
          deletedItemIds: ['q3'],
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.kit.questions[0].prompt).toBe('Custom prompt edited by user!');
      expect(updateRes.body.itemMeta.q1).toEqual({ origin: 'user_edited', isPinned: false });
      expect(updateRes.body.itemMeta.q2).toEqual({ origin: 'generated', isPinned: true });
      expect(updateRes.body.deletedItemIds).toEqual(['q3']);
    });

    it('deletes kit cleanly', async () => {
      const mockKit = createMockKit();
      const created = await request(app)
        .post('/api/kits')
        .set('Authorization', `Bearer ${tokenUser1}`)
        .send({ kit: mockKit });

      const kitId = created.body.id;

      const delRes = await request(app)
        .delete(`/api/kits/${kitId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(delRes.status).toBe(200);

      const getRes = await request(app)
        .get(`/api/kits/${kitId}`)
        .set('Authorization', `Bearer ${tokenUser1}`);
      expect(getRes.status).toBe(404);
    });
  });

  // =========================================================================
  // 3. SCOPED SECTION REGENERATION & STATE PRESERVATION TESTS
  // =========================================================================
  describe('Scoped Section Regeneration (/api/kits/:id/regenerate/:section)', () => {
    let token: string;
    let kitId: string;

    beforeEach(async () => {
      const reg = await request(app).post('/api/auth/register').send({
        email: 'dev@test.com',
        password: 'password123',
        name: 'Dev User',
      });
      token = reg.body.token;

      // Create a kit with 3 technical questions and 1 behavioural question
      const mockKit = createMockKit();
      // Setup specific state:
      // q1: user_edited (technical)
      // q2: pinned (technical)
      // q3: untouched generated (technical)
      // q4: behavioural (should never be affected by technical regeneration)
      const customMeta = {
        q1: { origin: 'user_edited', isPinned: false },
        q2: { origin: 'generated', isPinned: true },
        q3: { origin: 'generated', isPinned: false },
        q4: { origin: 'generated', isPinned: false },
        f1: { origin: 'generated', isPinned: false },
        f2: { origin: 'generated', isPinned: false },
      };

      const created = await request(app)
        .post('/api/kits')
        .set('Authorization', `Bearer ${token}`)
        .send({
          kit: mockKit,
          itemMeta: customMeta,
        });

      kitId = created.body.id;
    });

    it(
      'preserves user-edited, user-added, and pinned questions during category regeneration',
      async () => {
        // Regenerate "technical" category
      const regenRes = await request(app)
        .post(`/api/kits/${kitId}/regenerate/technical`)
        .set('Authorization', `Bearer ${token}`);

      expect(regenRes.status).toBe(200);
      expect(regenRes.body.regeneratedSection).toBe('technical');
      // q1 (user_edited) and q2 (pinned) were preserved!
      expect(regenRes.body.preservedCount).toBe(2);

      const updatedKit: AppendixAKit = regenRes.body.kit;
      const updatedQuestions = updatedKit.questions;

      // 1. Verify user_edited q1 survived with exact original prompt
      const q1 = updatedQuestions.find((q) => q.id === 'q1');
      expect(q1).toBeDefined();
      expect(q1?.prompt).toBe('How would you handle race conditions in an asynchronous event pipeline in Node.js?');

      // 2. Verify pinned q2 survived
      const q2 = updatedQuestions.find((q) => q.id === 'q2');
      expect(q2).toBeDefined();

      // 3. Verify untouched generated q3 was discarded and replaced
      const q3 = updatedQuestions.find((q) => q.id === 'q3');
      expect(q3).toBeUndefined();

      // 4. Verify q4 (behavioural category) was completely untouched!
      const q4 = updatedQuestions.find((q) => q.id === 'q4');
      expect(q4).toBeDefined();
      expect(q4?.category).toBe('behavioural');

      // 5. Verify new questions were added with non-colliding IDs
      const newQuestions = updatedQuestions.filter(
        (q) => q.id !== 'q1' && q.id !== 'q2' && q.id !== 'q4'
      );
      expect(newQuestions.length).toBeGreaterThan(0);
      for (const nq of newQuestions) {
        expect(nq.id).toMatch(/^q\d+$/);
        expect(nq.category).toBe('technical');
      }

      // 6. Verify deterministic coverage and schedule were synchronized
      expect(updatedKit.schedule.days).toHaveLength(updatedKit.schedule.days_available);
      const allScheduledQuestionIds = updatedKit.schedule.days.flatMap((d) => d.question_ids);
      const allCurrentQuestionIds = new Set(updatedQuestions.map((q) => q.id));
      for (const scheduledId of allScheduledQuestionIds) {
        expect(allCurrentQuestionIds.has(scheduledId)).toBe(true);
      }
    }, 20000);

    it('regenerates schedule deterministically without mutating questions', async () => {
      const regenRes = await request(app)
        .post(`/api/kits/${kitId}/regenerate/schedule`)
        .set('Authorization', `Bearer ${token}`);

      expect(regenRes.status).toBe(200);
      expect(regenRes.body.regeneratedSection).toBe('schedule');

      const kit: AppendixAKit = regenRes.body.kit;
      expect(kit.schedule.days).toHaveLength(3);
      for (const day of kit.schedule.days) {
        expect(Number.isInteger(day.minutes)).toBe(true);
      }
    });

    it('rejects invalid section name with 400', async () => {
      const res = await request(app)
        .post(`/api/kits/${kitId}/regenerate/non_existent_section`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid section/i);
    });
  });

  // =========================================================================
  // 4. SSE REAL-TIME GENERATION PROGRESS TESTS
  // =========================================================================
  describe('Server-Sent Events (SSE) Progress Streaming', () => {
    it('rejects generation start with invalid days constraint', async () => {
      const res = await request(app)
        .post('/api/kits/generate/start')
        .send({
          jd: 'Senior TypeScript Developer',
          company_url: 'https://example.com',
          days: 100, // Invalid: must be 1 to 60
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/days must be an integer between 1 and 60/i);
    });

    it('starts generation session and returns valid sessionId', async () => {
      const res = await request(app)
        .post('/api/kits/generate/start')
        .send({
          jd: 'Senior TypeScript Developer with Node.js and AWS experience.',
          company_url: 'https://example.com',
          days: 5,
        });

      expect(res.status).toBe(202);
      expect(res.body).toHaveProperty('sessionId');
      expect(typeof res.body.sessionId).toBe('string');
    });

    it('handles unknown sessionId on SSE progress stream with 404', async () => {
      const res = await request(app).get('/api/kits/generate/progress/non-existent-session-id');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });

    it('streams SSE progress events for an active session', async () => {
      const testSessionId = 'test-session-12345';
      sseManager.createSession(testSessionId);
      sseManager.emitProgress(testSessionId, 'crawl', 'Crawled company website');
      sseManager.completeSession(testSessionId, { kitId: 'kit-test', kit: null });

      const res = await request(app)
        .get(`/api/kits/generate/progress/${testSessionId}`)
        .expect('Content-Type', /text\/event-stream/);

      expect(res.status).toBe(200);
      expect(res.text).toContain('SSE connection established');
      expect(res.text).toContain('Crawled company website');
      expect(res.text).toContain('completed');
    });
  });
});
