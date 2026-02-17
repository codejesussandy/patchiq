import { useState } from 'react';
import { EditOutlined } from '@ant-design/icons';
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Button,
  Select,
} from 'antd';
import { useAssetLifeCycle } from '../../../../hooks/useAssets';

const { Title, Text } = Typography;

interface LifecycleTabProps {
  assetId: string;
  onEditFinancialData: () => void;
}

export const LifecycleTab = ({ assetId, onEditFinancialData }: LifecycleTabProps) => {
  const [selectedDepreciationMethod, setSelectedDepreciationMethod] = useState<string>('straight-line');
  const { data: lifecycle, isLoading: loadingLifecycle } = useAssetLifeCycle(assetId, selectedDepreciationMethod);

  if (loadingLifecycle) return <div>Loading lifecycle data...</div>;
  if (!lifecycle) return <div>No lifecycle data available</div>;

  if (!lifecycle.hasFinancialData) {
    return (
      <div>
        <Card title="Depreciation Timeline" style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '16px', color: '#d9d9d9' }}>
              {'\u{1F4CA}'}
            </div>
            <Title level={4} style={{ marginBottom: '8px', color: '#595959' }}>
              No Financial Data Available
            </Title>
            <Text type="secondary" style={{ marginBottom: '24px', maxWidth: '400px' }}>
              Add purchase cost, salvage value, and end of life date to see depreciation analysis using different calculation methods.
            </Text>
            <Button type="primary" icon={<EditOutlined />} onClick={onEditFinancialData}>
              Add Financial Data
            </Button>
          </div>
        </Card>

        {(lifecycle.purchaseDate || lifecycle.amcExpiryDate || lifecycle.warrantyExpiryDate || lifecycle.endOfLife) && (
          <Card title="Lifecycle Dates" style={{ marginBottom: 24 }}>
            <Row gutter={[24, 16]}>
              {lifecycle.purchaseDate && (
                <Col span={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '16px' }}>Purchase Date</Text>
                  <Text strong>{lifecycle.purchaseDate}</Text>
                </Col>
              )}
              {lifecycle.amcExpiryDate && (
                <Col span={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '16px' }}>AMC Expiry Date</Text>
                  <Text strong>{lifecycle.amcExpiryDate}</Text>
                </Col>
              )}
              {lifecycle.warrantyExpiryDate && (
                <Col span={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '16px' }}>Warranty Expiry Date</Text>
                  <Text strong>{lifecycle.warrantyExpiryDate}</Text>
                </Col>
              )}
              {lifecycle.endOfLife && (
                <Col span={6}>
                  <Text type="secondary" style={{ display: 'block', fontSize: '16px' }}>End of Life</Text>
                  <Text strong>{lifecycle.endOfLife}</Text>
                </Col>
              )}
            </Row>
          </Card>
        )}
      </div>
    );
  }

  const maxValue = Math.max(...lifecycle.depreciationTimeline.map((p) => p.value));

  return (
    <div>
      <Card
        title="Depreciation Timeline"
        extra={
          <Select
            value={selectedDepreciationMethod}
            onChange={setSelectedDepreciationMethod}
            style={{ width: 220 }}
            options={[
              { value: 'straight-line', label: 'Straight Line (SLM)' },
              { value: 'double-declining', label: 'Double Declining Balance (DDB)' },
              { value: 'sum-of-years', label: 'Sum of Years Digits (SYD)' },
            ]}
          />
        }
        style={{ marginBottom: 24 }}
      >
        {/* Timeline */}
        <div style={{ position: 'relative', marginBottom: 40 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            <div
              style={{
                position: 'absolute', top: '8px', left: 0, right: 0, height: '4px',
                background: 'linear-gradient(to right, #1890ff 0%, #1890ff 33%, #d9d9d9 33%, #d9d9d9 100%)',
                zIndex: 0,
              }}
            />
            <TimelineDot label="Purchased on" date={lifecycle.purchaseDate} value={lifecycle.purchaseValue} color="#1890ff" tagColor="blue" align="left" />
            <TimelineDot label="Today" date={lifecycle.currentDate} value={lifecycle.currentValue} color="#1890ff" tagColor="blue" align="center" />
            <TimelineDot label="AMC Expiry Date" date={lifecycle.amcExpiryDate} extra={`Warranty Expiry Date: ${lifecycle.warrantyExpiryDate}`} color="#d9d9d9" tagColor="purple" align="center" />
            <TimelineDot label="End Of Life" date={lifecycle.endOfLife} value={lifecycle.endOfLifeValue} color="#d9d9d9" tagColor="red" align="right" />
          </div>
        </div>

        {/* Depreciation Chart */}
        <div style={{ marginTop: 40 }}>
          <div style={{ display: 'flex', gap: '16px', height: '350px', position: 'relative' }}>
            <div
              style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
                width: '60px', paddingRight: '16px', borderRight: '1px solid #d9d9d9', textAlign: 'right',
              }}
            >
              {[40000, 30000, 20000, 10000, 0].map((value) => (
                <div key={value} style={{ fontSize: '16px', color: '#666', height: '20px' }}>
                  {'\u20B9'}{(value / 1000).toFixed(0)}k
                </div>
              ))}
            </div>
            <div
              style={{
                flex: 1, display: 'flex', alignItems: 'flex-end', gap: '20px',
                paddingBottom: '40px', position: 'relative', borderBottom: '1px solid #d9d9d9',
              }}
            >
              {lifecycle.depreciationTimeline.map((point, index) => (
                <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <div style={{ fontSize: '11px', marginBottom: '8px', color: '#666', fontWeight: 500 }}>
                    {'\u20B9'}{point.value.toLocaleString()}
                  </div>
                  <div
                    style={{
                      width: '100%', maxWidth: '50px',
                      height: `${(point.value / maxValue) * 100}%`,
                      background: index === 0 ? '#5b8ff9' : '#ff6b72',
                      borderRadius: '8px 8px 0 0', transition: 'all 0.3s ease',
                      minHeight: '30px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    }}
                  />
                  <div style={{ marginTop: '12px', fontSize: '16px', color: '#666', fontWeight: 500, textAlign: 'center' }}>
                    {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', marginLeft: '76px' }}>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              <Text type="secondary" style={{ fontSize: '16px' }}><strong>Method:</strong> {lifecycle.depreciationMethod}</Text>
              <Text type="secondary" style={{ fontSize: '16px' }}><strong>Annual Depreciation:</strong> {'\u20B9'}{lifecycle.annualDepreciation?.toLocaleString() || 'N/A'}</Text>
              <Text type="secondary" style={{ fontSize: '16px' }}><strong>Total Depreciation:</strong> {'\u20B9'}{lifecycle.totalDepreciation?.toLocaleString() || 'N/A'}</Text>
              <Text type="secondary" style={{ fontSize: '16px' }}><strong>Years Elapsed:</strong> {lifecycle.yearsElapsed?.toFixed(1) || 'N/A'}</Text>
              <Text type="secondary" style={{ fontSize: '16px' }}><strong>Years Remaining:</strong> {lifecycle.yearsRemaining?.toFixed(1) || 'N/A'}</Text>
            </div>
            <Text type="secondary" style={{ fontSize: '16px' }}>Year(s)</Text>
          </div>
        </div>
      </Card>
    </div>
  );
};

function TimelineDot({ label, date, value, extra, color, tagColor, align }: {
  label: string;
  date?: string;
  value?: number;
  extra?: string;
  color: string;
  tagColor: string;
  align: 'left' | 'center' | 'right';
}) {
  return (
    <div style={{ zIndex: 1, flex: 1, textAlign: align }}>
      <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: color, margin: '0 auto' }} />
      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ display: 'block', fontSize: '16px' }}>{label}</Text>
        <Text strong>{date}</Text>
        <div>
          {value !== undefined && <Tag color={tagColor}>{'\u20B9'}{value.toLocaleString()}</Tag>}
          {extra && <Tag color={tagColor}>{extra}</Tag>}
        </div>
      </div>
    </div>
  );
}
