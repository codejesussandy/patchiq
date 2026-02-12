import { Router } from 'express';
import { authenticate } from '@middleware/auth';
import { validateQuery } from '@middleware/validation';
import { PatchTemplatesController } from './patch-templates.controller';
import { getLatestVersionQuerySchema } from './patch-templates.validators';

const router = Router();
const controller = new PatchTemplatesController();

router.get('/', authenticate, controller.listTemplates);
router.get('/:id/latest', authenticate, validateQuery(getLatestVersionQuerySchema), controller.getLatestVersion);
router.post('/sync', authenticate, controller.syncToHub);
router.post('/:id/sync', authenticate, controller.syncOneToHub);

export { router as patchTemplateRoutes };
