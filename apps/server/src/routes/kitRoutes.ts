import { Router } from 'express';
import { KitController } from '../controllers/kitController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';

export const kitRoutes = Router();

// Generation & Real-time Progress (SSE)
kitRoutes.post('/generate/start', optionalAuth, KitController.startGeneration);
kitRoutes.get('/generate/progress/:sessionId', KitController.getProgressStream);

// Kit CRUD (Protected by requireAuth)
kitRoutes.post('/', requireAuth, KitController.createKit);
kitRoutes.get('/', requireAuth, KitController.getKits);
kitRoutes.get('/:id', requireAuth, KitController.getKitById);
kitRoutes.put('/:id', requireAuth, KitController.updateKit);
kitRoutes.delete('/:id', requireAuth, KitController.deleteKit);

// Scoped Section Regeneration (Protected by requireAuth)
kitRoutes.post('/:id/regenerate/:section', requireAuth, KitController.regenerateSection);
