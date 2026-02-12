import { api } from './api.service';

export interface SoftwareTemplateItem {
  id: string;
  name: string;
  vendor: string;
  product: string;
  category: 'A' | 'B' | 'C';
  supportedOs: string[];
  defaultSeverity: string;
  defaultCategory: string;
  description?: string;
  referenceUrl?: string;
}

export interface TemplateFetchResult {
  software: string;
  title: string;
  vendor: string;
  product: string;
  os: string;
  architecture: string;
  downloadUrl: string;
  referenceUrl?: string;
  severity: string;
  category: string;
  releaseDate?: string;
  vendorData: {
    version: string;
    fileName?: string;
    checksumSha256?: string;
    fileSize?: number;
    releaseNotes?: string;
  };
}

export const patchTemplateService = {
  async listTemplates(): Promise<SoftwareTemplateItem[]> {
    const response = await api.get('/patch-templates');
    return response.data;
  },

  async getLatestVersion(
    templateId: string,
    os: string,
    arch: string = 'x64'
  ): Promise<TemplateFetchResult> {
    const response = await api.get(`/patch-templates/${templateId}/latest`, {
      params: { os, arch },
    });
    return response.data;
  },

  async syncOneToHub(
    templateId: string,
    os: string = 'Windows',
    arch: string = 'x64',
    force: boolean = false
  ): Promise<{ templateId: string; name: string; version: string; os: string; status: string; packageId?: string; error?: string; downloadSize?: number }> {
    const response = await api.post(`/patch-templates/${templateId}/sync`, { os, arch, force }, { timeout: 300000 });
    return response.data;
  },

  async syncAllToHub(
    os: string = 'Windows',
    arch: string = 'x64',
    templateIds?: string[],
    onProgress?: (result: Record<string, unknown>) => void
  ): Promise<void> {
    const response = await fetch(`/v1/patch-templates/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({ os, arch, templateIds }),
    });

    if (!response.ok) throw new Error('Sync failed');
    if (!response.body) return;

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';
      for (const line of lines) {
        if (line.trim()) {
          try {
            const result = JSON.parse(line);
            onProgress?.(result);
          } catch { /* skip malformed lines */ }
        }
      }
    }
  },
};
