import {
  PlusOutlined,
  FileOutlined,
  InboxOutlined,
  SearchOutlined,
  RocketOutlined,
  SettingOutlined,
  NotificationOutlined,
  DashboardOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { Button, Empty, Space, Typography } from 'antd';

const { Title, Paragraph } = Typography;

export interface EmptyStateAction {
  label: string;
  onClick: () => void;
  type?: 'primary' | 'default' | 'dashed' | 'link';
  icon?: React.ReactNode;
}

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actions?: EmptyStateAction[];
  showImage?: boolean;
}

/**
 * Comprehensive empty state component with icons, titles, descriptions, and CTAs
 * Use this for empty lists, no data scenarios, and initial states
 */
export const EmptyState = ({
  icon,
  title,
  description,
  actions,
  showImage = true,
}: EmptyStateProps) => {
  return (
    <div style={{ padding: '60px 20px', textAlign: 'center' }}>
      {showImage ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          imageStyle={{ height: 60, marginBottom: 16 }}
          description={null}
        />
      ) : icon ? (
        <div style={{ fontSize: 48, color: '#d9d9d9', marginBottom: 24 }}>
          {icon}
        </div>
      ) : null}

      <Title level={4} style={{ marginBottom: 8, fontWeight: 500 }}>
        {title}
      </Title>

      {description && (
        <Paragraph type="secondary" style={{ marginBottom: 24, maxWidth: 400, margin: '0 auto 24px' }}>
          {description}
        </Paragraph>
      )}

      {actions && actions.length > 0 && (
        <Space size="middle">
          {actions.map((action, index) => (
            <Button
              key={index}
              type={action.type || (index === 0 ? 'primary' : 'default')}
              icon={action.icon}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          ))}
        </Space>
      )}
    </div>
  );
};

/**
 * Predefined empty states for common scenarios
 */

export const NoDataEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<InboxOutlined />}
    title="No Data Available"
    description="Get started by creating your first item"
    actions={onCreate ? [{ label: 'Create New', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoSearchResultsEmptyState = ({ onClear }: { onClear?: () => void }) => (
  <EmptyState
    icon={<SearchOutlined />}
    title="No Results Found"
    description="Try adjusting your search criteria or filters"
    actions={onClear ? [{ label: 'Clear Filters', onClick: onClear, type: 'default' }] : undefined}
    showImage={false}
  />
);

export const NoDeploymentsEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<RocketOutlined />}
    title="No Deployments Yet"
    description="Start deploying patches to your assets to see deployment history and status here"
    actions={onCreate ? [{ label: 'Create Deployment', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoJobsEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<SettingOutlined />}
    title="No Jobs Configured"
    description="Create automated jobs to scan for vulnerabilities, deploy patches, or discover devices"
    actions={onCreate ? [{ label: 'Create Job', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoPoliciesEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<FileOutlined />}
    title="No Policies Defined"
    description="Define policies to automate patch approval and deployment workflows"
    actions={onCreate ? [{ label: 'Create Policy', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoNotificationsEmptyState = () => (
  <EmptyState
    icon={<NotificationOutlined />}
    title="No Notifications"
    description="You're all caught up! Notifications about deployments, scans, and alerts will appear here"
    showImage={false}
  />
);

export const NoReportsEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<DashboardOutlined />}
    title="No Reports Available"
    description="Generate reports to analyze vulnerabilities, patches, and compliance across your assets"
    actions={onCreate ? [{ label: 'Generate Report', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoAgentsEmptyState = ({ onDownload }: { onDownload?: () => void }) => (
  <EmptyState
    icon={<DownloadOutlined />}
    title="No Agents Installed"
    description="Download and install the agent on your devices to start collecting inventory and deploying patches"
    actions={onDownload ? [{ label: 'Download Agent', onClick: onDownload, icon: <DownloadOutlined /> }] : undefined}
  />
);

export const NoCredentialsEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<TeamOutlined />}
    title="No Credentials Configured"
    description="Add credentials to enable device discovery and remote management"
    actions={onCreate ? [{ label: 'Add Credential', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoComputerGroupsEmptyState = ({ onCreate }: { onCreate?: () => void }) => (
  <EmptyState
    icon={<TeamOutlined />}
    title="No Computer Groups"
    description="Organize your assets into groups for easier management and targeted deployments"
    actions={onCreate ? [{ label: 'Create Group', onClick: onCreate, icon: <PlusOutlined /> }] : undefined}
  />
);

export const NoPackagesEmptyState = ({ onUpload }: { onUpload?: () => void }) => (
  <EmptyState
    icon={<CloudUploadOutlined />}
    title="No Packages Available"
    description="Upload software packages to deploy them across your infrastructure"
    actions={onUpload ? [{ label: 'Upload Package', onClick: onUpload, icon: <CloudUploadOutlined /> }] : undefined}
  />
);

export const DashboardEmptyState = ({ onGetStarted }: { onGetStarted?: () => void }) => (
  <EmptyState
    icon={<DashboardOutlined />}
    title="Welcome to PatchIQ"
    description="Get started by downloading the agent and adding your first devices to start managing patches and vulnerabilities"
    actions={onGetStarted ? [
      { label: 'Download Agent', onClick: onGetStarted, icon: <DownloadOutlined />, type: 'primary' },
    ] : undefined}
  />
);
