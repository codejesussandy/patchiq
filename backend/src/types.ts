// Express type augmentation
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        organizationId?: string;
      };
      agentId?: string;
    }
  }
}

export {};
