import { App, Button, DatePicker, Modal } from 'antd';
import type { Dayjs } from 'dayjs';

type TimePeriod = 'all' | 'thisMinute' | 'thisHour' | 'thisDay' | 'thisWeek' | 'thisMonth' | 'thisQuarter' | 'thisYear' | 'previous15Hours' | 'previousWeek' | 'previousMonth' | 'previousQuarter' | 'previousYear' | 'custom';

export type { TimePeriod };

const TIME_PERIOD_BUTTONS = [
  { key: 'thisMinute', label: 'This Minute' },
  { key: 'thisHour', label: 'This Hour' },
  { key: 'thisDay', label: 'This Day' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'thisQuarter', label: 'This Quarter' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'previous15Hours', label: 'Previous 15 Hours' },
  { key: 'previousWeek', label: 'Previous Week' },
  { key: 'previousMonth', label: 'Previous Month' },
  { key: 'previousQuarter', label: 'Previous Quarter' },
  { key: 'previousYear', label: 'Previous Year' },
];

interface AuditTimelineModalProps {
  open: boolean;
  selectedTimePeriod: TimePeriod;
  customStartDate: Dayjs | null;
  customEndDate: Dayjs | null;
  onTimePeriodChange: (period: TimePeriod) => void;
  onCustomStartChange: (date: Dayjs | null) => void;
  onCustomEndChange: (date: Dayjs | null) => void;
  onClose: () => void;
}

export const AuditTimelineModal = ({
  open, selectedTimePeriod, customStartDate, customEndDate,
  onTimePeriodChange, onCustomStartChange, onCustomEndChange, onClose,
}: AuditTimelineModalProps) => {
  const { message } = App.useApp();

  return (
    <Modal
      title="Select Timeline"
      open={open}
      onCancel={onClose}
      width={500}
      footer={[<Button key="close" onClick={onClose}>Close</Button>]}
      centered
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>Preset Timeline</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {TIME_PERIOD_BUTTONS.map((period) => (
              <Button
                key={period.key}
                type={selectedTimePeriod === period.key && selectedTimePeriod !== 'custom' ? 'primary' : 'default'}
                onClick={() => {
                  onTimePeriodChange(period.key as TimePeriod);
                  onCustomStartChange(null);
                  onCustomEndChange(null);
                }}
                style={{ textAlign: 'left', fontSize: '13px', height: '36px' }}
              >
                {period.label}
              </Button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', color: '#333' }}>Custom Date Range</div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>From</div>
              <DatePicker value={customStartDate} onChange={onCustomStartChange} placeholder="Start Date" style={{ width: '100%' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', color: '#666', marginBottom: '4px' }}>To</div>
              <DatePicker value={customEndDate} onChange={onCustomEndChange} placeholder="End Date" style={{ width: '100%' }} />
            </div>
          </div>
          <Button
            block
            style={{ marginTop: '12px' }}
            type={selectedTimePeriod === 'custom' ? 'primary' : 'default'}
            onClick={() => {
              if (customStartDate && customEndDate) {
                onTimePeriodChange('custom');
              } else {
                message.warning('Please select both start and end dates');
              }
            }}
          >
            Apply Custom Range
          </Button>
        </div>
      </div>
    </Modal>
  );
};
