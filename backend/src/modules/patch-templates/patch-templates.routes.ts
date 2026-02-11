import { Router } from 'express';
import { PatchTemplatesController } from './patch-templates.controller';
import { authenticate } from '@middleware/auth';

const router = Router();
const controller = new PatchTemplatesController();

router.get('/', authenticate, controller.listTemplates);
router.get('/:id/latest', authenticate, controller.getLatestVersion);
router.post('/sync', authenticate, controller.syncToHub);
router.post('/:id/sync', authenticate, controller.syncOneToHub);

export { router as patchTemplateRoutes };
