import { authHandlers } from './auth.handlers';
import { commonHandlers } from './common.handlers';
import { dashboardHandlers } from './dashboard.handlers';
import { assetHandlers } from './asset.handlers';
import { categoryHandlers } from './category.handlers';
import { tagHandlers } from './tag.handlers';
import { patchHandlers } from './patch.handlers';
import { patchRecommendationHandlers } from './patch-recommendation.handlers';
import { jobsHandlers } from './jobs.handlers';
import { vulnerabilityHandlers } from './vulnerability.handlers';
import { discoveryHandlers } from './discovery.handlers';
import { hubHandlers } from './hub.handlers';
import { settingsHandlers } from './settings.handlers';
import { reportsHandlers } from './reports.handlers';
import { notificationHandlers } from './notification.handlers';
import { aiHandlers } from './ai.handlers';

export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...assetHandlers,
  ...categoryHandlers,
  ...tagHandlers,
  ...patchHandlers,
  ...patchRecommendationHandlers,
  ...jobsHandlers,
  ...vulnerabilityHandlers,
  ...discoveryHandlers,
  ...hubHandlers,
  ...settingsHandlers,
  ...reportsHandlers,
  ...notificationHandlers,
  ...aiHandlers,
  ...commonHandlers,
];
