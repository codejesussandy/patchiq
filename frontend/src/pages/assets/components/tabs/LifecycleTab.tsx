import { useState, type CSSProperties } from 'react';
import { EditOutlined, CalendarOutlined, DollarOutlined, ClockCircleOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { Tag, Typography, Button, Select, Skeleton } from 'antd';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { useAssetLifeCycle } from '../../../../hooks/useAssets';

const { Text } = Typography;

/* ── Shared styles ────────────────────────────────────────── */

const cardStyle: CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  overflow: 'hidden',
};

const cardHeaderStyle: CSSProperties = {
  padding: '14px 20px',
  borderBottom: '1px solid #e5e7eb',
  backgroundColor: '#eef0f4',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const cardTitleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#0f172a',
  margin: 0,
};

/* ── Main component ───────────────────────────────────────── */

interface LifecycleTabProps {
  assetId: string;
  onEditFinancialData: () => void;
}

export const LifecycleTab = ({ assetId, onEditFinancialData }: LifecycleTabProps) => {
  const [selectedDepreciationMethod, setSelectedDepreciationMethod] = useState<string>('straight-line');
  const { data: lifecycle, isLoading: loadingLifecycle } = useAssetLifeCycle(assetId, selectedDepreciationMethod);

  if (loadingLifecycle) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton active paragraph={{ rows: 6 }} />
        <Skeleton active paragraph={{ rows: 4 }} />
      </div>
    );
  }

  if (!lifecycle) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '80px 20px', color: '#6b7280',
      }}>
        <ClockCircleOutlined style={{ fontSize: 40, color: '#d1d5db', marginBottom: 12 }} />
        <Text style={{ fontSize: 14, color: '#6b7280' }}>No lifecycle data available</Text>
      </div>
    );
  }

  if (!lifecycle.hasFinancialData) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
            <span style={cardTitleStyle}>Depreciation Timeline</span>
          </div>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '64px 20px', textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 10, background: '#f8fafc',
              border: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
            }}>
              <DollarOutlined style={{ fontSize: 22, color: '#94a3b8' }} />
            </div>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 4, display: 'block' }}>
              No Financial Data Available
            </Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 20, maxWidth: 360, display: 'block', lineHeight: '1.5' }}>
              Add purchase cost, salvage value, and end of life date to see depreciation analysis.
            </Text>
            <Button
              type="primary"
              icon={<EditOutlined />}
              onClick={onEditFinancialData}
              style={{ borderRadius: 8, height: 36, fontWeight: 500 }}
            >
              Add Financial Data
            </Button>
          </div>
        </div>

        {(lifecycle.purchaseDate || lifecycle.amcExpiryDate || lifecycle.warrantyExpiryDate || lifecycle.endOfLife) && (
          <LifecycleDatesCard
            purchaseDate={lifecycle.purchaseDate}
            amcExpiryDate={lifecycle.amcExpiryDate}
            warrantyExpiryDate={lifecycle.warrantyExpiryDate}
            endOfLife={lifecycle.endOfLife}
          />
        )}
      </div>
    );
  }

  // Prepare chart data
  const chartData = lifecycle.depreciationTimeline.map((point, index) => ({
    name: `Year ${index + 1}`,
    year: index + 1,
    value: point.value,
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Summary stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <SummaryCard label="Depreciation Method" value={lifecycle.depreciationMethod || 'N/A'} icon={<FieldTimeOutlined />} />
        <SummaryCard label="Annual Depreciation" value={lifecycle.annualDepreciation != null ? `₹${lifecycle.annualDepreciation.toLocaleString()}` : 'N/A'} icon={<DollarOutlined />} />
        <SummaryCard label="Total Depreciation" value={lifecycle.totalDepreciation != null ? `₹${lifecycle.totalDepreciation.toLocaleString()}` : 'N/A'} icon={<DollarOutlined />} />
        <SummaryCard label="Years Elapsed" value={lifecycle.yearsElapsed != null ? `${lifecycle.yearsElapsed.toFixed(1)} yr` : 'N/A'} icon={<ClockCircleOutlined />} />
        <SummaryCard label="Years Remaining" value={lifecycle.yearsRemaining != null ? `${lifecycle.yearsRemaining.toFixed(1)} yr` : 'N/A'} icon={<ClockCircleOutlined />} />
      </div>

      {/* Timeline */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span style={cardTitleStyle}>Asset Timeline</span>
        </div>
        <div style={{ padding: '24px 28px 20px' }}>
          <AssetTimeline
            purchaseDate={lifecycle.purchaseDate}
            purchaseValue={lifecycle.purchaseValue}
            currentDate={lifecycle.currentDate}
            currentValue={lifecycle.currentValue}
            amcExpiryDate={lifecycle.amcExpiryDate}
            warrantyExpiryDate={lifecycle.warrantyExpiryDate}
            endOfLife={lifecycle.endOfLife}
            endOfLifeValue={lifecycle.endOfLifeValue}
          />
        </div>
      </div>

      {/* Depreciation Chart */}
      <div style={cardStyle}>
        <div style={cardHeaderStyle}>
          <span style={cardTitleStyle}>Depreciation Schedule</span>
          <Select
            value={selectedDepreciationMethod}
            onChange={setSelectedDepreciationMethod}
            style={{ width: 210 }}
            size="small"
            options={[
              { value: 'straight-line', label: 'Straight Line (SLM)' },
              { value: 'double-declining', label: 'Double Declining (DDB)' },
              { value: 'sum-of-years', label: 'Sum of Years Digits (SYD)' },
            ]}
          />
        </div>
        <div style={{ padding: '20px 20px 16px' }}>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#64748b' }}
                dy={8}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: '#94a3b8' }}
                tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}k`}
                width={60}
              />
              <RechartsTooltip
                cursor={{ fill: '#f8fafc' }}
                contentStyle={{
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -2px rgba(0,0,0,0.05)',
                  padding: '8px 12px',
                  fontSize: 13,
                }}
                formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Value']}
                labelStyle={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {chartData.map((_, index) => (
                  <Cell
                    key={index}
                    fill={index === 0 ? '#3b82f6' : '#f87171'}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center', paddingTop: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3b82f6' }} />
              <Text style={{ fontSize: 12, color: '#64748b' }}>Purchase Value</Text>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: '#f87171' }} />
              <Text style={{ fontSize: 12, color: '#64748b' }}>Depreciated Value</Text>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Asset Timeline ────────────────────────────────────────── */

function AssetTimeline({ purchaseDate, purchaseValue, currentDate, currentValue, amcExpiryDate, warrantyExpiryDate, endOfLife, endOfLifeValue }: {
  purchaseDate?: string | null;
  purchaseValue?: number | null;
  currentDate: string;
  currentValue?: number | null;
  amcExpiryDate?: string | null;
  warrantyExpiryDate?: string | null;
  endOfLife?: string | null;
  endOfLifeValue?: number | null;
}) {
  type Milestone = { key: string; label: string; date: string; value?: number | null; color: string; tagColor: string; isPast: boolean };
  const milestones: Milestone[] = [];
  const today = new Date(currentDate).getTime();

  if (purchaseDate) {
    milestones.push({ key: 'purchase', label: 'Purchased', date: purchaseDate, value: purchaseValue, color: '#3b82f6', tagColor: 'blue', isPast: true });
  }
  milestones.push({ key: 'today', label: 'Today', date: currentDate, value: currentValue, color: '#3b82f6', tagColor: 'blue', isPast: true });
  if (warrantyExpiryDate) {
    milestones.push({ key: 'warranty', label: 'Warranty Expiry', date: warrantyExpiryDate, color: '#a855f7', tagColor: 'purple', isPast: new Date(warrantyExpiryDate).getTime() <= today });
  }
  if (amcExpiryDate) {
    milestones.push({ key: 'amc', label: 'AMC Expiry', date: amcExpiryDate, color: '#f59e0b', tagColor: 'orange', isPast: new Date(amcExpiryDate).getTime() <= today });
  }
  if (endOfLife) {
    milestones.push({ key: 'eol', label: 'End of Life', date: endOfLife, value: endOfLifeValue, color: '#ef4444', tagColor: 'red', isPast: new Date(endOfLife).getTime() <= today });
  }

  milestones.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Calculate proportional positions with padding so edge labels don't clip
  const timestamps = milestones.map(m => new Date(m.date).getTime());
  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);
  const range = maxTime - minTime;
  // Use 5-95% range so first/last labels have room
  const positions = timestamps.map(t => range > 0 ? 5 + ((t - minTime) / range) * 90 : 50);

  // Ensure minimum 15% spacing
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - positions[i - 1] < 15) {
      positions[i] = Math.min(positions[i - 1] + 15, 95);
    }
  }

  const todayIndex = milestones.findIndex(m => m.key === 'today');
  const progressPct = todayIndex >= 0 ? positions[todayIndex] : 0;

  return (
    <div style={{ position: 'relative' }}>
      {/* Track */}
      <div style={{ position: 'relative', height: 14, margin: '0 0 12px' }}>
        <div style={{
          position: 'absolute', top: 6, left: '5%', right: '5%', height: 3,
          background: '#e2e8f0', borderRadius: 2,
        }} />
        <div style={{
          position: 'absolute', top: 6, left: '5%',
          width: `${progressPct - 5}%`, height: 3,
          background: '#3b82f6', borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />

        {/* Dots */}
        {milestones.map((m, i) => (
          <div key={m.key} style={{
            position: 'absolute',
            left: `${positions[i]}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: m.key === 'today' ? 14 : 12,
            height: m.key === 'today' ? 14 : 12,
            borderRadius: '50%',
            background: m.isPast ? m.color : '#fff',
            border: `2.5px solid ${m.color}`,
            boxShadow: m.isPast ? `0 0 0 3px ${m.color}18` : 'none',
            zIndex: 2,
          }} />
        ))}
      </div>

      {/* Labels below */}
      <div style={{ position: 'relative', minHeight: 70 }}>
        {milestones.map((m, i) => {
          const left = positions[i];
          const isFirst = i === 0;
          const isLast = i === milestones.length - 1;
          // Align text: left-align first, right-align last, center others
          const textAlign = isFirst ? 'left' as const : isLast ? 'right' as const : 'center' as const;
          const transform = isFirst ? 'translateX(0)' : isLast ? 'translateX(-100%)' : 'translateX(-50%)';

          return (
            <div key={m.key} style={{
              position: 'absolute',
              left: `${left}%`,
              top: 0,
              transform,
              textAlign,
              whiteSpace: 'nowrap',
            }}>
              <Text style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 500 }}>
                {m.label}
              </Text>
              <Text style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginTop: 1 }}>
                {m.date}
              </Text>
              {m.value != null && (
                <Tag color={m.tagColor} style={{ margin: '4px 0 0', borderRadius: 4, fontSize: 11, fontWeight: 600, lineHeight: '20px' }}>
                  ₹{m.value.toLocaleString()}
                </Tag>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Sub-components ───────────────────────────────────────── */

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{
      ...cardStyle,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: '#94a3b8', fontSize: 13, display: 'flex' }}>{icon}</span>
        <Text style={{ fontSize: 12, color: '#64748b' }}>{label}</Text>
      </div>
      <Text style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>{value}</Text>
    </div>
  );
}

function LifecycleDatesCard({ purchaseDate, amcExpiryDate, warrantyExpiryDate, endOfLife }: {
  purchaseDate?: string | null;
  amcExpiryDate?: string | null;
  warrantyExpiryDate?: string | null;
  endOfLife?: string | null;
}) {
  const dates = [
    { label: 'Purchase Date', value: purchaseDate, icon: <CalendarOutlined /> },
    { label: 'AMC Expiry', value: amcExpiryDate, icon: <ClockCircleOutlined /> },
    { label: 'Warranty Expiry', value: warrantyExpiryDate, icon: <ClockCircleOutlined /> },
    { label: 'End of Life', value: endOfLife, icon: <FieldTimeOutlined /> },
  ].filter((d) => d.value);

  if (dates.length === 0) return null;

  return (
    <div style={cardStyle}>
      <div style={cardHeaderStyle}>
        <span style={cardTitleStyle}>Lifecycle Dates</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(dates.length, 4)}, 1fr)` }}>
        {dates.map((d, i) => (
          <div key={d.label} style={{ padding: 20, borderRight: i < dates.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <span style={{ color: '#94a3b8', fontSize: 13, display: 'flex' }}>{d.icon}</span>
              <Text style={{ fontSize: 12, color: '#64748b' }}>{d.label}</Text>
            </div>
            <Text style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{d.value}</Text>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimelineDot({ label, date, value, extra, color, tagColor, align, active }: {
  label: string;
  date?: string | null;
  value?: number | null;
  extra?: string | null;
  color: string;
  tagColor: string;
  align: 'left' | 'center' | 'right';
  active?: boolean;
}) {
  return (
    <div style={{ zIndex: 2, flex: 1, textAlign: align }}>
      <div style={{
        width: 12, height: 12, borderRadius: '50%',
        background: active ? color : '#cbd5e1',
        border: `2px solid ${active ? color : '#cbd5e1'}`,
        margin: align === 'left' ? '0' : align === 'right' ? '0 0 0 auto' : '0 auto',
        boxShadow: active ? `0 0 0 3px ${color}20` : 'none',
        transition: 'all 0.2s ease',
      }} />
      <div style={{ marginTop: 10 }}>
        <Text style={{ display: 'block', fontSize: 11, color: '#64748b', fontWeight: 500, letterSpacing: '0.01em', marginBottom: 2 }}>
          {label}
        </Text>
        {date && (
          <Text style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#0f172a', marginBottom: 4 }}>
            {date}
          </Text>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center' }}>
          {value != null && (
            <Tag color={tagColor} style={{ margin: 0, borderRadius: 4, fontSize: 11, fontWeight: 600, lineHeight: '20px' }}>
              ₹{value.toLocaleString()}
            </Tag>
          )}
          {extra && (
            <Tag color={tagColor} style={{ margin: 0, borderRadius: 4, fontSize: 10, lineHeight: '18px' }}>
              {extra}
            </Tag>
          )}
        </div>
      </div>
    </div>
  );
}
