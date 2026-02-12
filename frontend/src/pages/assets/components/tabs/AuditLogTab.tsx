import { useState, useMemo } from 'react';
import {
  Card,
  Tag,
  Input,
} from 'antd';
import { DataTable } from '../../../../components/shared/DataTable';
import { useAssetAuditLog } from '../../../../hooks/useAssets';

interface AuditLogTabProps {
  assetId: string;
}

const formatAuditDetails = (details: string | object | null): string => {
  if (!details) return '-';
  try {
    const data = typeof details === 'string' ? JSON.parse(details) : details;

    if (data.changes && Array.isArray(data.changes)) {
      if (data.changes.length === 0) return 'No changes';
      return data.changes.map((c: { field: string; from: unknown; to: unknown }) => {
        const fromVal = c.from === null || c.from === undefined || c.from === '' ? '(empty)' : String(c.from);
        const toVal = c.to === null || c.to === undefined || c.to === '' ? '(empty)' : String(c.to);
        return `\u2022 ${c.field}: "${fromVal}" \u2192 "${toVal}"`;
      }).join('\n');
    }

    if (data.deletedAsset) {
      const asset = data.deletedAsset;
      const lines = ['Deleted Asset:'];
      if (asset.name) lines.push(`  \u2022 Name: ${asset.name}`);
      if (asset.assetTag) lines.push(`  \u2022 Tag: ${asset.assetTag}`);
      if (asset.type) lines.push(`  \u2022 Type: ${asset.type}`);
      if (asset.os) lines.push(`  \u2022 OS: ${asset.os}`);
      if (asset.ipAddress) lines.push(`  \u2022 IP: ${asset.ipAddress}`);
      return lines.join('\n');
    }

    if (data.bulkDelete) {
      const count = data.count || data.deletedAssets?.length || 0;
      const lines = [`Bulk Delete: ${count} asset(s)`];
      if (data.deletedAssets) {
        data.deletedAssets.slice(0, 5).forEach((a: { name: string; assetTag?: string }) => {
          lines.push(`  \u2022 ${a.name}${a.assetTag ? ` (${a.assetTag})` : ''}`);
        });
        if (count > 5) lines.push(`  \u2022 ... and ${count - 5} more`);
      }
      return lines.join('\n');
    }

    if (data.action === 'add_tags' && data.tagsAdded) {
      const lines = ['Tags Added:'];
      data.tagsAdded.forEach((t: { name: string }) => { lines.push(`  \u2022 ${t.name}`); });
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
      if (data.osVersion) lines.push(`  \u2022 Version: ${data.osVersion}`);
      if (data.ipAddress) lines.push(`  \u2022 IP: ${data.ipAddress}`);
      if (data.status) lines.push(`  \u2022 Status: ${data.status}`);
      return lines.join('\n');
    }

    const entries = Object.entries(data).filter(([k]) => !['changeCount'].includes(k)).slice(0, 6);
    if (entries.length > 0) {
      return entries.map(([k, v]) => `\u2022 ${k}: ${v}`).join('\n');
    }

    return typeof details === 'string' ? details : JSON.stringify(data);
  } catch {
    return typeof details === 'string' ? details : String(details);
  }
};

export const AuditLogTab = ({ assetId }: AuditLogTabProps) => {
  const { data: auditLogRaw, isLoading: loadingAuditLog } = useAssetAuditLog(assetId);
  const [auditLogSearch, setAuditLogSearch] = useState('');

  const auditLog = useMemo(() => {
    if (!auditLogRaw) return [];
    return (auditLogRaw as Array<{ id?: string; timestamp?: string; user?: string; action?: string; details?: string | object | null }>).map((log, idx) => ({
      key: log.id || String(idx),
      date: log.timestamp ? new Date(log.timestamp).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: '2-digit', hour: 'numeric', minute: '2-digit', hour12: true,
      }) : '',
      user: log.user || 'System',
      action: log.action || '',
      changes: formatAuditDetails(log.details),
    }));
  }, [auditLogRaw]);

  return (
    <div>
      <Card title="Audit Log">
        <div style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="Search by user, action, or details..."
            allowClear
            value={auditLogSearch}
            onChange={(e) => setAuditLogSearch(e.target.value)}
            style={{ width: 300 }}
          />
        </div>
        <DataTable
          columns={[
            { title: 'Date', dataIndex: 'date', key: 'date', width: 180 },
            { title: 'User', dataIndex: 'user', key: 'user', width: 150 },
            {
              title: 'Action', dataIndex: 'action', key: 'action', width: 100,
              render: (action: string) => (
                <Tag color={action === 'create' ? 'green' : action === 'update' ? 'blue' : action === 'delete' ? 'red' : 'default'}>
                  {action.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: 'Details', dataIndex: 'changes', key: 'changes',
              render: (text: string) => <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: '1.6' }}>{text}</div>,
            },
          ]}
          data={auditLog.filter((log) => {
            if (!auditLogSearch) return true;
            const search = auditLogSearch.toLowerCase();
            return log.user.toLowerCase().includes(search) || log.action.toLowerCase().includes(search) || log.changes.toLowerCase().includes(search) || log.date.toLowerCase().includes(search);
          })}
          loading={loadingAuditLog}
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>
    </div>
  );
};
