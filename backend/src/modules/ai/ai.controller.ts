import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '@shared/utils/response';
import { aiService } from './ai.service';

export class AiController {
  chat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { message, conversationHistory } = req.body;
      const userId = req.user?.id;
      const result = await aiService.chat(message, conversationHistory, userId);
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };

  healthCheck = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await aiService.healthCheck();
      sendSuccess(res, result);
    } catch (error) {
      next(error);
    }
  };
}

export const aiController = new AiController();
