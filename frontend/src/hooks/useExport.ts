import { useState, useCallback } from 'react';

interface ExportColumn {
  key: string;
  header: string;
}

interface UseExportReturn {
  exporting: boolean;
  exportCSV: (data: Record<string, unknown>[], filename: string, columns?: ExportColumn[]) => void;
  exportJSON: (data: unknown, filename: string) => void;
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCSVValue(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Handles CSV and JSON export with loading state.
 * Generates downloadable files from tabular or arbitrary data.
 *
 * @example
 * ```tsx
 * function PatchList() {
 *   const { exporting, exportCSV, exportJSON } = useExport();
 *   const { data: patches } = usePatches();
 *
 *   return (
 *     <Space>
 *       <Button
 *         loading={exporting}
 *         onClick={() => exportCSV(patches, 'patches.csv', [
 *           { key: 'name', header: 'Patch Name' },
 *           { key: 'severity', header: 'Severity' },
 *           { key: 'status', header: 'Status' },
 *         ])}
 *       >
 *         Export CSV
 *       </Button>
 *       <Button
 *         loading={exporting}
 *         onClick={() => exportJSON(patches, 'patches.json')}
 *       >
 *         Export JSON
 *       </Button>
 *     </Space>
 *   );
 * }
 * ```
 */
export function useExport(): UseExportReturn {
  const [exporting, setExporting] = useState(false);

  const exportCSV = useCallback(
    (data: Record<string, unknown>[], filename: string, columns?: ExportColumn[]) => {
      if (data.length === 0) return;

      setExporting(true);
      try {
        const cols = columns ?? Object.keys(data[0]).map((key) => ({ key, header: key }));
        const headerRow = cols.map((c) => escapeCSVValue(c.header)).join(',');
        const dataRows = data.map((row) =>
          cols.map((c) => escapeCSVValue(row[c.key])).join(','),
        );
        const csv = [headerRow, ...dataRows].join('\n');
        const finalFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
        downloadBlob(csv, finalFilename, 'text/csv;charset=utf-8;');
      } finally {
        setExporting(false);
      }
    },
    [],
  );

  const exportJSON = useCallback((data: unknown, filename: string) => {
    setExporting(true);
    try {
      const json = JSON.stringify(data, null, 2);
      const finalFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
      downloadBlob(json, finalFilename, 'application/json');
    } finally {
      setExporting(false);
    }
  }, []);

  return { exporting, exportCSV, exportJSON };
}
