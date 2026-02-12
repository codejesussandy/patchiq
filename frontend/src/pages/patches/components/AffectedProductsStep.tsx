import { useState } from 'react';
import { DeleteOutlined } from '@ant-design/icons';
import { App, Button, Typography, Modal, Form, Input, Select, Row, Col } from 'antd';
import { DataTable } from '../../../components/shared/DataTable';
import { useAddAffectedProduct, useRemoveAffectedProduct } from '../../../hooks/usePatches';
import type { AffectedSoftware } from '../../../services/patch.service';

const { Title } = Typography;
const { Option } = Select;

interface AffectedProductsStepProps {
  patchId: string | null;
  affectedProducts: AffectedSoftware[];
  setAffectedProducts: React.Dispatch<React.SetStateAction<AffectedSoftware[]>>;
}

export const AffectedProductsStep = ({ patchId, affectedProducts, setAffectedProducts }: AffectedProductsStepProps) => {
  const { message } = App.useApp();
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [addForm] = Form.useForm();
  const addProductMutation = useAddAffectedProduct();
  const removeProductMutation = useRemoveAffectedProduct();

  const handleAdd = async () => {
    try {
      const values = await addForm.validateFields();
      if (!patchId) return;
      const product = await addProductMutation.mutateAsync({
        patchId,
        data: {
          softwareName: values.softwareName,
          version: values.version,
          vendor: values.vendor,
          platform: values.platform,
        },
      });
      setAffectedProducts((prev) => [...prev, product]);
      setAddModalVisible(false);
      addForm.resetFields();
      message.success('Affected product added');
    } catch (error) {
      if (!(error as { errorFields?: unknown }).errorFields) {
        message.error('Failed to add affected product');
      }
    }
  };

  const handleRemove = async (productId: string) => {
    if (!patchId) return;
    try {
      await removeProductMutation.mutateAsync({ patchId, productId });
      setAffectedProducts((prev) => prev.filter((p) => p.id !== productId));
      message.success('Affected product removed');
    } catch {
      message.error('Failed to remove affected product');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Title level={5} style={{ margin: 0 }}>Affected Products</Title>
        <Button type="link" onClick={() => { addForm.resetFields(); setAddModalVisible(true); }}>
          + Add Affected Product
        </Button>
      </div>

      <DataTable
        data={affectedProducts}
        rowKey="id"
        pagination={false}
        size="small"
        locale={{ emptyText: 'No affected products added yet. Click "+ Add Affected Product" above.' }}
        columns={[
          { title: 'Software Name', dataIndex: 'softwareName', key: 'softwareName' },
          { title: 'Version', dataIndex: 'version', key: 'version', render: (v: string) => v || '-' },
          { title: 'Vendor', dataIndex: 'vendor', key: 'vendor', render: (v: string) => v || '-' },
          { title: 'Platform', dataIndex: 'platform', key: 'platform', render: (v: string) => v || '-' },
          { title: 'Installed On', dataIndex: 'installedOn', key: 'installedOn', render: (v: number) => `${v ?? 0} endpoint${v !== 1 ? 's' : ''}` },
          {
            title: '', key: 'action', width: 50,
            render: (_: unknown, record: AffectedSoftware) => (
              <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleRemove(record.id)} />
            ),
          },
        ]}
      />

      <Modal
        title="Add Affected Product"
        open={addModalVisible}
        onCancel={() => setAddModalVisible(false)}
        onOk={handleAdd}
        confirmLoading={addProductMutation.isPending}
        okText="Add"
      >
        <Form form={addForm} layout="vertical">
          <Form.Item name="softwareName" label="Software Name" rules={[{ required: true, message: 'Required' }]}>
            <Input placeholder="e.g., Microsoft Office" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="version" label="Version"><Input placeholder="e.g., 2021" /></Form.Item></Col>
            <Col span={12}><Form.Item name="vendor" label="Vendor"><Input placeholder="e.g., Microsoft" /></Form.Item></Col>
          </Row>
          <Form.Item name="platform" label="Platform">
            <Select placeholder="Select platform" allowClear>
              <Option value="Windows">Windows</Option>
              <Option value="MacOS">MacOS</Option>
              <Option value="Linux">Linux</Option>
              <Option value="Cross-platform">Cross-platform</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
