import { ReloadOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { Button, Result } from 'antd';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetryButton?: boolean;
  status?: 'error' | 'warning' | '500' | '404' | '403';
}

/**
 * Reusable error state component with optional retry button
 * Use this for network errors, failed API calls, or any error states
 */
export const ErrorState = ({
  title = 'Something went wrong',
  message = 'Unable to load data. Please try again.',
  onRetry,
  showRetryButton = true,
  status = 'error',
}: ErrorStateProps) => {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center' }}>
      <Result
        status={status}
        icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
        title={title}
        subTitle={message}
        extra={
          showRetryButton && onRetry ? (
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={onRetry}
            >
              Try Again
            </Button>
          ) : null
        }
      />
    </div>
  );
};

/**
 * Network-specific error state for connection issues
 */
export const NetworkErrorState = ({ onRetry }: { onRetry?: () => void }) => {
  return (
    <ErrorState
      title="Network Error"
      message="Unable to connect to the server. Please check your internet connection and try again."
      onRetry={onRetry}
      status="500"
    />
  );
};

/**
 * API error state for failed API calls
 */
export const APIErrorState = ({ onRetry, message }: { onRetry?: () => void; message?: string }) => {
  return (
    <ErrorState
      title="Failed to Load Data"
      message={message || 'An error occurred while fetching data from the server.'}
      onRetry={onRetry}
      status="error"
    />
  );
};
