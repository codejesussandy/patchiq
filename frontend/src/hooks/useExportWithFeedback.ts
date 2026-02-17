import { useState } from 'react';
import { App } from 'antd';

export type ExportFormat = 'csv' | 'pdf' | 'excel' | 'json';

interface UseExportWithFeedbackOptions {
  onExport: (format: ExportFormat) => Promise<void> | void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook to handle data exports with loading state and user feedback
 * Shows loading indicator during export and success/error messages
 */
export const useExportWithFeedback = ({
  onExport,
  successMessage = 'Export completed successfully',
  errorMessage = 'Failed to export data',
}: UseExportWithFeedbackOptions) => {
  const { message } = App.useApp();
  const [exporting, setExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat | null>(null);

  const handleExport = async (format: ExportFormat) => {
    try {
      setExporting(true);
      setExportFormat(format);

      const hideLoading = message.loading(
        `Exporting to ${format.toUpperCase()}...`,
        0
      );

      await onExport(format);

      hideLoading();
      message.success(successMessage, 3);
    } catch {
      message.error(errorMessage, 3);
    } finally {
      setExporting(false);
      setExportFormat(null);
    }
  };

  return {
    handleExport,
    exporting,
    exportFormat,
    isExporting: (format: ExportFormat) => exporting && exportFormat === format,
  };
};
