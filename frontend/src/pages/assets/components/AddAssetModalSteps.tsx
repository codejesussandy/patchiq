import { Row, Col, Form, Input, Select, DatePicker, Switch } from 'antd';
import TagSelector from './TagSelector';

const { Option } = Select;

interface Step1Props {
  categories: Array<{ id: string; name: string }>;
  subCategories: Array<{ id: string; name: string }>;
  selectedCategoryId?: string;
  onCategoryChange: (value: string) => void;
  form: ReturnType<typeof Form.useForm>[0];
}

export const AssetStep1 = ({ categories, subCategories, selectedCategoryId, onCategoryChange, form }: Step1Props) => (
  <div>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Asset Name" name="assetName" rules={[{ required: true }]}>
          <Input placeholder="Input" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
          <Select
            placeholder="Select category"
            onChange={(value: string) => {
              onCategoryChange(value);
              form.setFieldValue('subCategoryId', undefined);
            }}
          >
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Sub Category" name="subCategoryId">
          <Select placeholder="Select sub category" allowClear disabled={!selectedCategoryId}>
            {subCategories.map(sub => (
              <Option key={sub.id} value={sub.id}>{sub.name}</Option>
            ))}
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="OS" name="os" rules={[{ required: true }]}>
          <Select placeholder="Select">
            <Option value="windows">Windows</Option>
            <Option value="macos">MacOS</Option>
            <Option value="linux">Linux</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Asset Tags" name="assetTags">
          <TagSelector placeholder="Select or create tags" showCreateButton />
        </Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Make" name="make"><Input placeholder="Input" /></Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Model" name="model"><Input placeholder="Input" /></Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Serial Number" name="serialNumber"><Input placeholder="Enter serial number" /></Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="UUID" name="uuid"><Input placeholder="Enter UUID" /></Form.Item>
      </Col>
    </Row>

    <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
      <h4>Owner Details</h4>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Owner/Technician" name="ownerTechnician"><Select placeholder="Select" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Owner Tags" name="ownerTags"><Select mode="tags" placeholder="Select" /></Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="End User/Requesters" name="endUserRequesters"><Select mode="multiple" placeholder="Select" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Customer Name" name="customerName"><Select placeholder="Select" /></Form.Item>
        </Col>
      </Row>
      <Form.Item label="Assign Device" name="assignDevice" valuePropName="checked"><Switch /></Form.Item>
    </div>

    <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
      <h4>Location Details</h4>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Base Location" name="baseLocation"><Select placeholder="Select" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Installed Location" name="installedLocation"><Select placeholder="Select" /></Form.Item>
        </Col>
      </Row>
      <Form.Item label="Installed Date" name="installedDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
    </div>
  </div>
);

export const AssetStep2 = () => (
  <div>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="OS" name="osType">
          <Select placeholder="Select">
            <Option value="windows11">Windows 11</Option>
            <Option value="windows10">Windows 10</Option>
            <Option value="macos">MacOS</Option>
          </Select>
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="OS Name" name="osName"><Input placeholder="Input" /></Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="OS Version" name="osVersion"><Input placeholder="Input" /></Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="OS Install Date" name="osInstallDate"><Input placeholder="Input" /></Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="OS Install By" name="osInstallBy"><Input placeholder="Input" /></Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Build Number" name="buildNumber"><Input placeholder="Input" /></Form.Item>
      </Col>
    </Row>
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="Product ID" name="productId"><Input placeholder="Input" /></Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Product Key" name="productKey"><Input placeholder="Input" /></Form.Item>
      </Col>
    </Row>
    <Form.Item label="Virtual Number" name="virtualNumber"><Input placeholder="Input" /></Form.Item>
  </div>
);

export const AssetStep3 = () => (
  <div>
    <div style={{ marginBottom: 16 }}>
      <h4>Common Properties</h4>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Status" name="status">
            <Select placeholder="Select">
              <Option value="In Use">In Use</Option>
              <Option value="Available">Available</Option>
              <Option value="Under Maintenance">Under Maintenance</Option>
              <Option value="Retired">Retired</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Criticality" name="criticality">
            <Select placeholder="Select">
              <Option value="Critical">Critical</Option>
              <Option value="High">High</Option>
              <Option value="Medium">Medium</Option>
              <Option value="Low">Low</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Service Status" name="serviceStatus">
            <Select placeholder="Select">
              <Option value="Active">Active</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Decommissioned">Decommissioned</Option>
            </Select>
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Operational Status" name="operationalStatus">
            <Select placeholder="Select" disabled>
              <Option value="Connected">Connected</Option>
              <Option value="Disconnected">Disconnected</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>

    <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
      <h4>Cost Properties</h4>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Invoice No." name="invoiceNo"><Input placeholder="Enter invoice number" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Part No." name="partNo"><Input placeholder="Enter part no." /></Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Cost" name="cost"><Input placeholder="Enter Cost" type="number" addonAfter="INR" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Purchase Date" name="purchaseDate"><DatePicker style={{ width: '100%' }} placeholder="Select purchase date" /></Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="Current Value" name="currentValue"><Input placeholder="Enter current value" type="number" /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Salvage Value" name="salvageValue"><Input placeholder="Enter salvage value" type="number" /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Depreciation Type" name="depreciationType">
            <Select placeholder="Select type" allowClear>
              <Select.Option value="Straight Line">Straight Line</Select.Option>
              <Select.Option value="Double Declining Balance">Double Declining Balance</Select.Option>
              <Select.Option value="Sum of Years Digits">Sum of Years Digits</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Currency" name="currency">
            <Select placeholder="Select currency" allowClear>
              <Select.Option value="USD">USD</Select.Option>
              <Select.Option value="INR">INR</Select.Option>
              <Select.Option value="EUR">EUR</Select.Option>
              <Select.Option value="GBP">GBP</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
    </div>

    <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
      <h4>Procurement Properties</h4>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Vendor" name="vendor"><Input placeholder="Enter vendor name" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Purchase Order No." name="purchaseOrderNumber"><Input placeholder="Enter PO number" /></Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item label="Warranty In Years" name="warrantyYears"><Input type="number" placeholder="0" addonAfter="in years" /></Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="& Months" name="warrantyMonths"><Input type="number" placeholder="0" addonAfter="in months" /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Warranty Expiry Date" name="warrantyExpiryDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="AMC Vendor" name="amcVendor"><Input placeholder="Enter AMC vendor" /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="AMC Cost" name="amcCost"><Input placeholder="Enter AMC cost" type="number" /></Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="AMC Expiry Date" name="amcExpiryDate"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="End of Life" name="endOfLife"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="End of Support" name="endOfSupport"><DatePicker style={{ width: '100%' }} /></Form.Item>
        </Col>
      </Row>
    </div>
  </div>
);
