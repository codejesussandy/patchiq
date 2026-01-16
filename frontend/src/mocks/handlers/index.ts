import { authHandlers } from './auth.handlers';
import { agentHandlers } from './agent.handlers';
import { patchHandlers } from './patch.handlers';
import { assetHandlers } from './asset.handlers';
import { settingsHandlers } from './settings.handlers';
import { categoryHandlers } from './category.handlers';
import { tagHandlers } from './tag.handlers';
import { notificationHandlers } from './notification.handlers';
import { discoveryHandlers } from './discovery.handlers';

// Combine all handlers
export const handlers = [
  ...authHandlers,
  ...agentHandlers,
  ...patchHandlers,
  ...assetHandlers,
  ...settingsHandlers,
  ...discoveryHandlers,
  ...categoryHandlers,
  ...tagHandlers,
  ...notificationHandlers,
];
