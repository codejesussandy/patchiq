import type { ReactNode } from 'react';
import { createElement } from 'react';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  SyncOutlined,
  WarningOutlined,
  BugOutlined,
} from '@ant-design/icons';

export const getSeverityColor = (severity: string) => {
  switch (severity?.toUpperCase()) {
    case 'CRITICAL':
      return 'red';
    case 'HIGH':
      return 'orange';
    case 'MEDIUM':
      return 'gold';
    case 'LOW':
      return 'green';
    default:
      return 'default';
  }
};

export const getStatusIcon = (status: string): ReactNode => {
  switch (status) {
    case 'INSTALLED':
    case 'VERIFIED':
      return createElement(CheckCircleOutlined, { style: { color: '#52c41a' } });
    case 'MISSING':
    case 'FAILED':
      return createElement(CloseCircleOutlined, { style: { color: '#ff4d4f' } });
    case 'PENDING':
    case 'DEPLOYED':
    case 'ACCEPTED':
      return createElement(SyncOutlined, { spin: true, style: { color: '#1890ff' } });
    case 'REJECTED':
      return createElement(WarningOutlined, { style: { color: '#fa8c16' } });
    case 'RECOMMENDED':
      return createElement(BugOutlined, { style: { color: '#faad14' } });
    default:
      return createElement(ClockCircleOutlined);
  }
};

export const getStatusColor = (status: string) => {
  switch (status) {
    case 'INSTALLED':
    case 'SUCCESS':
    case 'VERIFIED':
      return 'success';
    case 'MISSING':
    case 'FAILED':
      return 'error';
    case 'PENDING':
    case 'DEPLOYED':
    case 'ACCEPTED':
      return 'processing';
    case 'RECOMMENDED':
      return 'warning';
    default:
      return 'default';
  }
};

export const getStatusBadgeStatus = (
  status: string
): 'success' | 'processing' | 'error' | 'default' | 'warning' => {
  switch (status) {
    case 'VERIFIED':
      return 'success';
    case 'DEPLOYED':
    case 'ACCEPTED':
      return 'processing';
    case 'FAILED':
    case 'REJECTED':
      return 'error';
    case 'RECOMMENDED':
      return 'warning';
    default:
      return 'default';
  }
};

export const CHART_COLORS = {
  installed: '#52c41a',
  missing: '#ff4d4f',
  pending: '#1890ff',
  failed: '#fa8c16',
};
