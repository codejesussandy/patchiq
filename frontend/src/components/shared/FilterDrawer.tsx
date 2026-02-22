import { Drawer, Button, Badge, Space } from 'antd';

export interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  onApply: (values: Record<string, unknown>) => void;
  onReset: () => void;
  activeCount?: number;
  title?: string;
  children: React.ReactNode;
}

export function FilterDrawer({
  open,
  onClose,
  onApply,
  onReset,
  activeCount = 0,
  title = 'Filters',
  children,
}: FilterDrawerProps) {
  const drawerTitle = activeCount > 0 ? (
    <Space>
      {title}
      <Badge count={activeCount} style={{ backgroundColor: '#1890ff' }} />
    </Space>
  ) : title;

  return (
    <Drawer
      title={drawerTitle}
      open={open}
      onClose={onClose}
      styles={{ wrapper: { width: 360 } }}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={onReset}>Reset</Button>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={() => onApply({})}>
              Apply
            </Button>
          </Space>
        </div>
      }
    >
      {children}
    </Drawer>
  );
}
