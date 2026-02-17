import { Modal, Form, Select, Button } from 'antd';

interface Category {
  id: string;
  name: string;
}

interface AssetFilterModalProps {
  open: boolean;
  categories: Category[];
  filterCategoryId: string | null;
  filterStatus: string | null;
  filterOperationalStatus: string | null;
  onFilterCategoryChange: (value: string | null) => void;
  onFilterStatusChange: (value: string | null) => void;
  onFilterOperationalStatusChange: (value: string | null) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const AssetFilterModal = ({
  open, categories, filterCategoryId, filterStatus, filterOperationalStatus,
  onFilterCategoryChange, onFilterStatusChange, onFilterOperationalStatusChange,
  onApply, onClear, onClose,
}: AssetFilterModalProps) => {
  return (
    <Modal
      title="Filter Assets"
      open={open}
      onOk={onApply}
      onCancel={onClose}
      width={500}
      okText="Apply Filters"
      cancelText="Close"
    >
      <Form layout="vertical">
        <Form.Item label="Filter by Category">
          <Select
            placeholder="Select a category"
            value={filterCategoryId}
            onChange={onFilterCategoryChange}
            options={categories.map((cat) => ({ label: cat.name, value: cat.id }))}
            allowClear
          />
        </Form.Item>

        <Form.Item label="Filter by Status">
          <Select
            placeholder="Select status"
            value={filterStatus}
            onChange={onFilterStatusChange}
            options={[
              { label: 'In Use', value: 'IN_USE' },
              { label: 'Available', value: 'AVAILABLE' },
              { label: 'Under Maintenance', value: 'UNDER_MAINTENANCE' },
              { label: 'Retired', value: 'RETIRED' },
            ]}
            allowClear
          />
        </Form.Item>

        <Form.Item label="Filter by Operational Status">
          <Select
            placeholder="Select operational status"
            value={filterOperationalStatus}
            onChange={onFilterOperationalStatusChange}
            options={[
              { label: 'Connected', value: 'CONNECTED' },
              { label: 'Disconnected', value: 'DISCONNECTED' },
            ]}
            allowClear
          />
        </Form.Item>

        <Button type="dashed" onClick={onClear} style={{ width: '100%' }}>
          Clear All Filters
        </Button>

        {(filterCategoryId || filterStatus || filterOperationalStatus) && (
          <div style={{ padding: '12px', background: '#e6f7ff', borderRadius: '4px', marginTop: '12px' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px' }}>Active Filters:</div>
            {filterCategoryId && (
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                Category: <strong>{categories.find((c) => c.id === filterCategoryId)?.name}</strong>
              </div>
            )}
            {filterStatus && (
              <div style={{ fontSize: '16px', marginBottom: '4px' }}>
                Status: <strong>{filterStatus}</strong>
              </div>
            )}
            {filterOperationalStatus && (
              <div style={{ fontSize: '16px' }}>
                Operational Status: <strong>{filterOperationalStatus}</strong>
              </div>
            )}
          </div>
        )}
      </Form>
    </Modal>
  );
};
