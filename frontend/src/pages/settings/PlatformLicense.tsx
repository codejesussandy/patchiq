import {
  CopyOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import {
  App,
  Card,
  Row,
  Col,
  Typography,
  Button,
  Form,
  Input,
  Spin,
  Divider,
  Space,
  Tag,
} from 'antd';
import { usePlatformLicense, useUpdatePlatformLicense } from '../../hooks/useSettings';

const { Title, Text } = Typography;

interface License {
  licenseTo: string;
  productCode: string;
  licenseType: string;
  productVersion: string;
  poNumber: string;
  invoiceNumber: string;
  email: string;
  partner: string;
  issueDate: string;
  expiresOn: string;
  numberOfEndpoints: number;
  usedEndpoints: number;
  activationCode: string;
  remainingDays: number;
  remainingEndpoints: number;
}

export const PlatformLicense = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { data: license = null, isLoading: loading, refetch } = usePlatformLicense() as unknown as { data: License | null; isLoading: boolean; refetch: () => void };
  const updateLicenseMutation = useUpdatePlatformLicense();

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const handleSubmitLicenseCode = async () => {
    try {
      const values = await form.validateFields();
      await updateLicenseMutation.mutateAsync({
        licenseCode: values.licenseCode,
      });
      message.success('License updated successfully');
      form.resetFields();
    } catch {
      message.error('Failed to update license');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const getLicenseTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      free: '#faad14',
      trial: '#1890ff',
      professional: '#52c41a',
      enterprise: '#722ed1',
    };
    return colors[type.toLowerCase()] || '#2f54eb';
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2} style={{ margin: 0 }}>Platform License</Title>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => refetch()}
          loading={loading}
        >
          Refresh
        </Button>
      </div>

      <Spin spinning={loading}>
        {license && (
          <>
            {/* License Information Cards */}
            <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
              {/* License To and Product Code */}
              <Col xs={24} lg={12}>
                <Card
                  title={<Title level={4} style={{ margin: 0 }}>License To: {license.licenseTo}</Title>}
                  style={{ height: '100%' }}
                >
                  <Form layout="vertical">
                    <Form.Item label="License Type">
                      <Tag color={getLicenseTypeColor(license.licenseType)}>
                        {(license.licenseType ?? 'unknown').toUpperCase()}
                      </Tag>
                    </Form.Item>
                    <Form.Item label="PO Number">
                      <Text>{license.poNumber || '—'}</Text>
                    </Form.Item>
                    <Form.Item label="Invoice Number">
                      <Text>{license.invoiceNumber || '—'}</Text>
                    </Form.Item>
                    <Form.Item label="Email">
                      <Text>{license.email || '—'}</Text>
                    </Form.Item>
                    <Form.Item label="Partner">
                      <Text>{license.partner || '—'}</Text>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>

              {/* Product Code and Dates */}
              <Col xs={24} lg={12}>
                <Card
                  title={<Title level={4} style={{ margin: 0 }}>Product Code: {license.productCode}</Title>}
                  style={{ height: '100%' }}
                >
                  <Form layout="vertical">
                    <Form.Item label="Product Version">
                      <Tag>{license.productVersion}</Tag>
                    </Form.Item>
                    <Form.Item label="Issue Date">
                      <Text>{formatDate(license.issueDate)}</Text>
                    </Form.Item>
                    <Form.Item label="Expires On">
                      <Text>{formatDate(license.expiresOn)}</Text>
                    </Form.Item>
                    <Form.Item label="No. Of Endpoints">
                      <Text>{license.numberOfEndpoints}</Text>
                    </Form.Item>
                    <Form.Item label="Used Endpoints">
                      <Text>{license.usedEndpoints}</Text>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
            </Row>

            {/* License Metrics */}
            <Row gutter={[24, 24]} style={{ marginBottom: '32px' }}>
              <Col xs={24} sm={12} lg={6}>
                <Card style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                    {license.remainingDays}
                  </div>
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    Remaining Days
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <Card style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                    {license.remainingEndpoints}
                  </div>
                  <Text type="secondary" style={{ display: 'block', marginTop: '8px' }}>
                    Remaining Endpoints
                  </Text>
                </Card>
              </Col>
            </Row>

            <Divider />

            {/* Activation Code and License Code */}
            <Card style={{ marginBottom: '32px' }}>
              <Form layout="vertical">
                <Form.Item label="Activation Code">
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      value={license.activationCode}
                      disabled
                      style={{ flex: 1 }}
                    />
                    <Button
                      icon={<CopyOutlined />}
                      onClick={() => handleCopyToClipboard(license.activationCode)}
                    >
                      Copy
                    </Button>
                  </Space.Compact>
                </Form.Item>
              </Form>
            </Card>

            {/* License Code Input */}
            <Card title={<Title level={4} style={{ margin: 0 }}>Update License</Title>}>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmitLicenseCode}
              >
                <Form.Item
                  label="License Code"
                  name="licenseCode"
                  rules={[
                    { required: true, message: 'Please enter a license code' },
                    { min: 10, message: 'License code must be at least 10 characters' },
                  ]}
                >
                  <Input.TextArea
                    placeholder="Paste your license code here"
                    rows={4}
                  />
                </Form.Item>

                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={updateLicenseMutation.isPending}
                  >
                    Update License
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </>
        )}
      </Spin>
    </div>
  );
};
