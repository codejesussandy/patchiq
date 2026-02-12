import { App } from 'antd';

export function exportToCsv<T extends Record<string, unknown>>(
  data: T[],
  columns: { header: string; accessor: (item: T) => string | number }[],
  filename: string,
  message: ReturnType<typeof App.useApp>['message']
) {
  if (data.length === 0) {
    message.warning('No data to export');
    return;
  }

  const headers = columns.map(c => c.header);
  const csvContent = [
    headers.join(','),
    ...data.map((item) =>
      columns.map((col) => {
        const value = String(col.accessor(item) ?? '');
        if (value.includes(',') || value.includes('"')) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    ),
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  message.success('Data exported successfully');
}
