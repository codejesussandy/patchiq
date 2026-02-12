import { useState } from 'react';
import {
  SearchOutlined,
  RightOutlined,
  LeftOutlined,
  WindowsOutlined,
  AppleOutlined,
  LinuxOutlined,
} from '@ant-design/icons';
import { Input, Button, Checkbox, Row, Col, Typography } from 'antd';

const { Text } = Typography;

export interface TransferItem {
  key: string;
  title: string;
  subtitle?: string;
  os: string[];
}

interface TransferListPickerProps {
  selectedKeys: string[];
  onSelectedKeysChange: (keys: string[]) => void;
  items: TransferItem[];
  height?: number;
}

function getOSIcon(os: string[]) {
  if (os.includes('Windows')) return <WindowsOutlined style={{ color: '#1890ff' }} />;
  if (os.includes('Mac')) return <AppleOutlined />;
  if (os.includes('Linux')) return <LinuxOutlined />;
  return null;
}

function TransferPanel({
  items,
  checkedKeys,
  onCheckedKeysChange,
  height,
}: {
  items: TransferItem[];
  checkedKeys: string[];
  onCheckedKeysChange: (keys: string[]) => void;
  height: number;
}) {
  const [search, setSearch] = useState('');

  const filtered = items.filter(item =>
    item.title.toLowerCase().includes(search.toLowerCase()) ||
    (item.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  const handleItemSelect = (key: string) => {
    if (checkedKeys.includes(key)) {
      onCheckedKeysChange(checkedKeys.filter(k => k !== key));
    } else {
      onCheckedKeysChange([...checkedKeys, key]);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    onCheckedKeysChange(checked ? filtered.map(item => item.key) : []);
  };

  return (
    <div style={{ border: '1px solid #d9d9d9', borderRadius: 6, padding: 8, height, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', marginBottom: 8, flexShrink: 0 }}>
        <Checkbox
          indeterminate={checkedKeys.length > 0 && checkedKeys.length < filtered.length}
          checked={filtered.length > 0 && checkedKeys.length === filtered.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
        >
          <Text strong style={{ marginLeft: 8 }}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </Text>
        </Checkbox>
      </div>

      <div style={{ padding: '0 12px 8px 12px', flexShrink: 0 }}>
        <Input
          placeholder="Search here"
          prefix={<SearchOutlined />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: '100%' }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            <div>No data</div>
          </div>
        ) : (
          filtered.map((item) => {
            const isSelected = checkedKeys.includes(item.key);
            return (
              <div
                key={item.key}
                onClick={() => handleItemSelect(item.key)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  backgroundColor: isSelected ? '#e6f7ff' : 'transparent',
                  borderBottom: '1px solid #f0f0f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <Checkbox checked={isSelected} />
                {getOSIcon(item.os)}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, color: '#666' }}>{item.title}</div>
                  {item.subtitle && (
                    <div style={{ fontSize: 11, color: '#999' }}>{item.subtitle}</div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export function TransferListPicker({
  selectedKeys,
  onSelectedKeysChange,
  items,
  height = 400,
}: TransferListPickerProps) {
  const [leftChecked, setLeftChecked] = useState<string[]>([]);
  const [rightChecked, setRightChecked] = useState<string[]>([]);

  const availableItems = items.filter(item => !selectedKeys.includes(item.key));
  const selectedItems = items.filter(item => selectedKeys.includes(item.key));

  const moveRight = () => {
    onSelectedKeysChange([...selectedKeys, ...leftChecked]);
    setLeftChecked([]);
  };

  const moveLeft = () => {
    onSelectedKeysChange(selectedKeys.filter(k => !rightChecked.includes(k)));
    setRightChecked([]);
  };

  return (
    <Row gutter={16}>
      <Col span={11}>
        <TransferPanel
          items={availableItems}
          checkedKeys={leftChecked}
          onCheckedKeysChange={setLeftChecked}
          height={height}
        />
      </Col>
      <Col span={2} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
        <Button
          type="primary"
          icon={<RightOutlined />}
          onClick={moveRight}
          disabled={leftChecked.length === 0}
        />
        <Button
          type="primary"
          icon={<LeftOutlined />}
          onClick={moveLeft}
          disabled={rightChecked.length === 0}
        />
      </Col>
      <Col span={11}>
        <TransferPanel
          items={selectedItems}
          checkedKeys={rightChecked}
          onCheckedKeysChange={setRightChecked}
          height={height}
        />
      </Col>
    </Row>
  );
}
