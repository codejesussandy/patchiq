# R5: RedHat Agent Nomination - Remaining Code

## Status
- ✅ Prisma Schema: COMPLETE
- ✅ Validators: COMPLETE
- ⚠️ Service: Imports added, methods need to be added
- ⏳ Controller: Pending
- ⏳ Routes: Pending

## Service Methods to Add (settings.service.ts)

Add before the closing brace of the SettingsService class:

```typescript
  // ============================================
  // Red Hat Nominations
  // ============================================

  async createRedHatNomination(data: CreateRedHatNominationInput, userId: string) {
    const agent = await prisma.agent.findUnique({ where: { id: data.agentId } });
    if (!agent) throw new NotFoundError('Agent not found');

    const os = (agent.os || '').toLowerCase();
    if (!os.includes('red hat') && !os.includes('centos') && !os.includes('rhel')) {
      throw new BadRequestError('Agent OS must be Red Hat Enterprise Linux or CentOS');
    }

    const existing = await prisma.redHatNomination.findUnique({ where: { agentId: data.agentId } });
    if (existing) throw new ConflictError('Agent already nominated');

    const nomination = await prisma.redHatNomination.create({
      data: {
        agentId: data.agentId,
        name: data.name,
        scheduledTime: data.scheduledTime || null,
        endpoint: data.endpoint || 0,
        updatedBy: userId,
      },
      include: {
        agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } },
      },
    });

    return this.transformNomination(nomination);
  }

  async listRedHatNominations() {
    const nominations = await prisma.redHatNomination.findMany({
      include: {
        agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return nominations.map(n => this.transformNomination(n));
  }

  async getRedHatNomination(id: string) {
    const nomination = await prisma.redHatNomination.findUnique({
      where: { id },
      include: {
        agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } },
      },
    });
    if (!nomination) throw new NotFoundError('Red Hat nomination not found');
    return this.transformNomination(nomination);
  }

  async updateRedHatNomination(id: string, data: UpdateRedHatNominationInput, userId: string) {
    const existing = await prisma.redHatNomination.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Red Hat nomination not found');

    const updateData: Record<string, unknown> = { updatedBy: userId };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.scheduledTime !== undefined) updateData.scheduledTime = data.scheduledTime;
    if (data.endpoint !== undefined) updateData.endpoint = data.endpoint;

    const nomination = await prisma.redHatNomination.update({
      where: { id },
      data: updateData,
      include: {
        agent: { select: { id: true, hostname: true, os: true, osVersion: true, status: true, ipAddress: true } },
      },
    });

    return this.transformNomination(nomination);
  }

  async deleteRedHatNomination(id: string) {
    const existing = await prisma.redHatNomination.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Red Hat nomination not found');
    await prisma.redHatNomination.delete({ where: { id } });
    return { message: 'Red Hat nomination deleted' };
  }

  private transformNomination(n: {
    id: string;
    agentId: string;
    agent: {
      id: string;
      hostname: string | null;
      os: string | null;
      osVersion: string | null;
      status: string;
      ipAddress: string | null;
    } | null;
    name: string;
    status: string;
    endpoint: number;
    scheduledTime: string | null;
    lastSyncTime: Date | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: n.id,
      agentId: n.agentId,
      agent: n.agent ? {
        id: n.agent.id,
        hostname: n.agent.hostname,
        os: n.agent.os,
        osVersion: n.agent.osVersion,
        status: n.agent.status,
        ipAddress: n.agent.ipAddress,
      } : null,
      name: n.name,
      status: n.status,
      endpoint: n.endpoint,
      scheduledTime: n.scheduledTime,
      lastSyncTime: n.lastSyncTime?.toISOString() || null,
      updatedBy: n.updatedBy,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    };
  }
```

## Controller Methods to Add (settings.controller.ts)

Add these imports at the top:
```typescript
import type {
  // ... existing imports
  CreateRedHatNominationInput,
  UpdateRedHatNominationInput,
} from './settings.validators';
```

Add before the closing brace of the SettingsController class:
```typescript
  // ============================================
  // Red Hat Nominations
  // ============================================

  async listRedHatNominations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.listRedHatNominations();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async getRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.getRedHatNomination(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async createRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as CreateRedHatNominationInput;
      const userId = req.user!.id;
      const result = await settingsService.createRedHatNomination(input, userId);
      sendSuccess(res, result, 201);
    } catch (error) {
      next(error);
    }
  }

  async updateRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const input = req.body as UpdateRedHatNominationInput;
      const userId = req.user!.id;
      const result = await settingsService.updateRedHatNomination(req.params.id, input, userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }

  async deleteRedHatNomination(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await settingsService.deleteRedHatNomination(req.params.id);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  }
```

## Routes to Add (settings.routes.ts)

Add to imports:
```typescript
import {
  // ... existing imports
  createRedHatNominationSchema,
  updateRedHatNominationSchema,
} from './settings.validators';
```

Add before `export { router as settingsRoutes };`:
```typescript
// ============================================
// Red Hat Nominations
// ============================================
router.get('/redhat-nominations', checkPermission('settings', 'view'), settingsController.listRedHatNominations.bind(settingsController));
router.post('/redhat-nominations', checkPermission('settings', 'add'), validateBody(createRedHatNominationSchema), settingsController.createRedHatNomination.bind(settingsController));
router.get('/redhat-nominations/:id', checkPermission('settings', 'view'), validateParams(idParamSchema), settingsController.getRedHatNomination.bind(settingsController));
router.put('/redhat-nominations/:id', checkPermission('settings', 'edit'), validateParams(idParamSchema), validateBody(updateRedHatNominationSchema), settingsController.updateRedHatNomination.bind(settingsController));
router.delete('/redhat-nominations/:id', checkPermission('settings', 'delete'), validateParams(idParamSchema), settingsController.deleteRedHatNomination.bind(settingsController));
```

## Endpoints Created

- `GET /api/settings/redhat-nominations` - List all nominations
- `POST /api/settings/redhat-nominations` - Create nomination (validates RHEL/CentOS OS)
- `GET /api/settings/redhat-nominations/:id` - Get single nomination
- `PUT /api/settings/redhat-nominations/:id` - Update nomination
- `DELETE /api/settings/redhat-nominations/:id` - Delete nomination
