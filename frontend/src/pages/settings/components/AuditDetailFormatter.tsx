interface ChangeEntry {
  field: string;
  from: unknown;
  to: unknown;
}

interface DeletedAsset {
  name?: string;
  assetTag?: string;
  type?: string;
  os?: string;
}

export const formatAuditDetail = (value: string): string => {
  if (!value) return '-';

  try {
    const data = JSON.parse(value);
    if (typeof data !== 'object') return value;

    if (data.changes && Array.isArray(data.changes)) {
      if (data.changes.length === 0) return 'No changes';
      return data.changes.map((c: ChangeEntry) => {
        const fromVal = c.from === null || c.from === undefined || c.from === '' ? '(empty)' : String(c.from);
        const toVal = c.to === null || c.to === undefined || c.to === '' ? '(empty)' : String(c.to);
        return `\u2022 ${c.field}: "${fromVal}" \u2192 "${toVal}"`;
      }).join('\n');
    }

    if (data.deletedAsset) {
      const asset: DeletedAsset = data.deletedAsset;
      const lines = ['Deleted Asset:'];
      if (asset.name) lines.push(`  \u2022 Name: ${asset.name}`);
      if (asset.assetTag) lines.push(`  \u2022 Tag: ${asset.assetTag}`);
      if (asset.type) lines.push(`  \u2022 Type: ${asset.type}`);
      if (asset.os) lines.push(`  \u2022 OS: ${asset.os}`);
      return lines.join('\n');
    }

    if (data.bulkDelete) {
      const count = data.count || data.deletedAssets?.length || 0;
      const lines = [`Bulk Delete: ${count} asset(s)`];
      if (data.deletedAssets) {
        data.deletedAssets.slice(0, 3).forEach((a: { name: string }) => {
          lines.push(`  \u2022 ${a.name}`);
        });
        if (count > 3) lines.push(`  \u2022 ... and ${count - 3} more`);
      }
      return lines.join('\n');
    }

    if (data.action === 'add_tags' && data.tagsAdded) {
      const lines = ['Tags Added:'];
      data.tagsAdded.forEach((t: { name: string }) => {
        lines.push(`  \u2022 ${t.name}`);
      });
      return lines.join('\n');
    }

    if (data.action === 'remove_tag' && data.tagRemoved) {
      return `Tag Removed:\n  \u2022 ${data.tagRemoved.name || data.tagRemoved.id}`;
    }

    if (data.assetName || data.assetTag) {
      const lines = ['Asset Created:'];
      if (data.assetName) lines.push(`  \u2022 Name: ${data.assetName}`);
      if (data.assetTag) lines.push(`  \u2022 Tag: ${data.assetTag}`);
      if (data.type) lines.push(`  \u2022 Type: ${data.type}`);
      if (data.os) lines.push(`  \u2022 OS: ${data.os}`);
      if (data.ipAddress) lines.push(`  \u2022 IP: ${data.ipAddress}`);
      return lines.join('\n');
    }

    const entries = Object.entries(data).filter(([k]) => !['changeCount'].includes(k)).slice(0, 4);
    return entries.map(([k, v]) => `\u2022 ${k}: ${v}`).join('\n');
  } catch {
    return value.length > 100 ? value.substring(0, 100) + '...' : value;
  }
};
