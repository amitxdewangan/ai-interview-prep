import type { Request, Response } from 'express';
import crypto from 'node:crypto';
import mongoose from 'mongoose';
import { AppendixAKitSchema } from '@repo/shared';
import { KitModel, initializeItemMeta } from '../models/Kit.js';
import { generatePrepKit } from '../pipeline/orchestrator.js';
import { RegenerationService } from '../services/regenerationService.js';
import { sseManager, type SseEvent } from '../services/sseService.js';

function paramToString(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

export class KitController {
  /**
   * POST /api/kits
   * Create a new kit (either from direct AppendixAKit JSON or by running pipeline)
   */
  static async createKit(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    try {
      // Case A: Full pre-existing or validated kit passed
      if (req.body.kit) {
        const parseResult = AppendixAKitSchema.safeParse(req.body.kit);
        if (!parseResult.success) {
          res.status(400).json({
            error: 'Invalid kit schema',
            details: parseResult.error.flatten(),
          });
          return;
        }

        const meta = req.body.itemMeta ?? initializeItemMeta(parseResult.data);
        const created = await KitModel.create({
          userId,
          kit: parseResult.data,
          itemMeta: meta,
          deletedItemIds: req.body.deletedItemIds || [],
        });

        res.status(201).json(created);
        return;
      }

      // Case B: Raw generation request (jd, company_url, days)
      const { jd, company_url, days } = req.body;
      if (!jd || !company_url || typeof days !== 'number') {
        res.status(400).json({
          error: 'Missing required parameters: jd (string), company_url (string), days (number 1-60)',
        });
        return;
      }

      const generatedKit = await generatePrepKit({
        jd,
        companyUrl: company_url,
        days,
      });

      const meta = initializeItemMeta(generatedKit);
      const created = await KitModel.create({
        userId,
        kit: generatedKit,
        itemMeta: meta,
        deletedItemIds: [],
      });

      res.status(201).json(created);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to create kit', details: msg });
    }
  }

  /**
   * GET /api/kits
   * Get all kits belonging to current authenticated user
   */
  static async getKits(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    try {
      const kits = await KitModel.find({ userId }).sort({ updatedAt: -1 });
      res.status(200).json(kits);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to retrieve kits', details: msg });
    }
  }

  /**
   * GET /api/kits/:id
   * Get specific kit by ID (enforces user isolation)
   */
  static async getKitById(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const id = paramToString(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Kit not found or access denied' });
      return;
    }

    try {
      const kit = await KitModel.findOne({ _id: id, userId });
      if (!kit) {
        res.status(404).json({ error: 'Kit not found or access denied' });
        return;
      }

      res.status(200).json(kit);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to retrieve kit', details: msg });
    }
  }

  /**
   * PUT /api/kits/:id
   * Update kit state (edits, pins, additions, deletions from Builder UI)
   */
  static async updateKit(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const id = paramToString(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Kit not found or access denied' });
      return;
    }

    try {
      const existing = await KitModel.findOne({ _id: id, userId });
      if (!existing) {
        res.status(404).json({ error: 'Kit not found or access denied' });
        return;
      }

      if (req.body.kit) {
        const parseResult = AppendixAKitSchema.safeParse(req.body.kit);
        if (!parseResult.success) {
          res.status(400).json({
            error: 'Invalid kit schema',
            details: parseResult.error.flatten(),
          });
          return;
        }
      }

      const updatePayload: Record<string, any> = {};
      if (req.body.kit) updatePayload.kit = req.body.kit;
      if (req.body.itemMeta) updatePayload.itemMeta = req.body.itemMeta;
      if (req.body.deletedItemIds) updatePayload.deletedItemIds = req.body.deletedItemIds;

      const updated = await KitModel.findOneAndUpdate(
        { _id: id, userId },
        { $set: updatePayload },
        { returnDocument: 'after' }
      );

      res.status(200).json(updated);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to update kit', details: msg });
    }
  }

  /**
   * DELETE /api/kits/:id
   * Delete kit by ID (enforces user isolation)
   */
  static async deleteKit(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const id = paramToString(req.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(404).json({ error: 'Kit not found or access denied' });
      return;
    }

    try {
      const resDelete = await KitModel.deleteOne({ _id: id, userId });
      if ((resDelete.deletedCount || 0) === 0) {
        res.status(404).json({ error: 'Kit not found or access denied' });
        return;
      }

      res.status(200).json({ message: 'Kit deleted successfully' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      res.status(500).json({ error: 'Failed to delete kit', details: msg });
    }
  }

  /**
   * POST /api/kits/:id/regenerate/:section
   * Single-section regeneration with state preservation
   */
  static async regenerateSection(req: Request, res: Response): Promise<void> {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const id = paramToString(req.params.id);
    const section = paramToString(req.params.section);

    try {
      const result = await RegenerationService.regenerate(id, userId, section);
      res.status(200).json(result);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isNotFound = msg.includes('not found') || msg.includes('access denied');
      const isInvalidSection = msg.includes('Invalid section');

      if (isNotFound) {
        res.status(404).json({ error: msg });
      } else if (isInvalidSection) {
        res.status(400).json({ error: msg });
      } else {
        res.status(500).json({ error: 'Section regeneration failed', details: msg });
      }
    }
  }

  /**
   * POST /api/kits/generate/start
   * Start generation job and return a sessionId for SSE tracking
   */
  static async startGeneration(req: Request, res: Response): Promise<void> {
    const { jd, company_url, days } = req.body;

    if (!jd || !company_url || typeof days !== 'number') {
      res.status(400).json({
        error: 'Missing required parameters: jd (string), company_url (string), days (number 1-60)',
      });
      return;
    }

    if (days < 1 || days > 60) {
      res.status(400).json({ error: 'days must be an integer between 1 and 60' });
      return;
    }

    const sessionId = crypto.randomUUID();
    sseManager.createSession(sessionId);

    // Run generation in background
    const userId = req.user?.id || 'anonymous';

    (async () => {
      try {
        sseManager.emitProgress(sessionId, 'validating', 'Validating input & sanitizing URL');

        const kit = await generatePrepKit({
          jd,
          companyUrl: company_url,
          days,
          onProgress: (status) => {
            sseManager.emitProgress(sessionId, 'pipeline', status);
          },
        });

        // If user is authenticated, save kit
        let savedKitId: string | undefined;
        if (userId !== 'anonymous' && mongoose.Types.ObjectId.isValid(userId)) {
          const meta = initializeItemMeta(kit);
          const saved = await KitModel.create({
            userId,
            kit,
            itemMeta: meta,
            deletedItemIds: [],
          });
          savedKitId = saved._id.toString();
        }

        sseManager.completeSession(sessionId, {
          kitId: savedKitId,
          kit,
        });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        sseManager.failSession(sessionId, errMsg);
      }
    })();

    res.status(202).json({
      sessionId,
      message: 'Kit generation started. Connect to SSE progress stream.',
    });
  }

  /**
   * GET /api/kits/generate/progress/:sessionId
   * Server-Sent Events (SSE) stream for live generation progress
   */
  static async getProgressStream(req: Request, res: Response): Promise<void> {
    const sessionId = paramToString(req.params.sessionId);
    const session = sseManager.getSession(sessionId);

    if (!session) {
      res.status(404).json({ error: `Session '${sessionId}' not found` });
      return;
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    if (res.flushHeaders) {
      res.flushHeaders();
    }

    // Send initial greeting event
    res.write(`data: ${JSON.stringify({ step: 'connected', message: 'SSE connection established', sessionId })}\n\n`);

    // Replay any buffered events
    for (const event of session.events) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // If session is already completed or failed, close connection immediately
    if (session.status === 'completed' || session.status === 'failed') {
      res.end();
      return;
    }

    // Subscribe to future events
    const unsubscribe = sseManager.addListener(sessionId, (event: SseEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
      if (event.step === 'completed' || event.step === 'failed') {
        res.end();
      }
    });

    // Clean up listener on client disconnect
    req.on('close', () => {
      unsubscribe();
    });
  }
}
