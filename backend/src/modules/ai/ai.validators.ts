import { z } from 'zod';

const conversationMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

export const chatRequestSchema = z.object({
  message: z
    .string()
    .min(1, 'Message is required')
    .max(4000, 'Message must be 4000 characters or less')
    .trim()
    .refine((val) => val.trim().length > 0, {
      message: 'Message cannot be empty or whitespace only',
    }),
  conversationHistory: z.array(conversationMessageSchema).max(20).optional().default([]),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
