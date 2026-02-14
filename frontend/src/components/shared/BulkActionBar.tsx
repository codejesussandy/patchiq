import type { ReactNode } from 'react';
import { Button, Card, Space, Tag } from 'antd';

interface BulkActionBarProps {
  selectedCount: number;
  onClear: () => void;
  children: ReactNode;
}

export const BulkActionBar = ({ selectedCount, onClear, children }: BulkActionBarProps) => {
  if (selectedCount === 0) return null;

  return (
    <Card
      size="small"
      style={{
        marginBottom: 16,
        borderRadius: 8,
        background: '#e6f7ff',
        borderColor: '#91d5ff',
      }}
    >
      <Space size="middle" wrap>
        <Tag color="blue">{selectedCount} selected</Tag>
        {children}
        <Button size="small" onClick={onClear}>
          Clear Selection
        </Button>
      </Space>
    </Card>
  );
};
