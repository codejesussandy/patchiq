declare module 'net-snmp' {
  interface SessionOptions {
    port?: number;
    timeout?: number;
    retries?: number;
  }

  interface Session {
    get(oids: string[], callback: (error: Error | null, varbinds?: unknown[]) => void): void;
    close(): void;
  }

  function createSession(target: string, community: string, options?: SessionOptions): Session;
}
