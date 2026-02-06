import type { Response } from 'express';

interface SSEClient {
  userId: string;
  res: Response;
}

class SSEManager {
  private clients: SSEClient[] = [];

  addClient(userId: string, res: Response): void {
    this.clients.push({ userId, res });
    res.on('close', () => {
      this.clients = this.clients.filter((c) => c.res !== res);
    });
  }

  send(userId: string, data: Record<string, unknown>): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (client.userId === userId) {
        try {
          client.res.write(payload);
        } catch {
          // Client disconnected — will be cleaned up on close
        }
      }
    }
  }

  broadcast(data: Record<string, unknown>, userIds?: string[]): void {
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      if (!userIds || userIds.includes(client.userId)) {
        try {
          client.res.write(payload);
        } catch {
          // Client disconnected
        }
      }
    }
  }
}

export const sseManager = new SSEManager();
