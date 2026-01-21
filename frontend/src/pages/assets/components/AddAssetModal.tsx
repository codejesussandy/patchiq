import { Modal, Steps, Form, Input, Select, Button, Row, Col, DatePicker, Switch, message } from 'antd';
import { useState, useEffect } from 'react';
import type { Asset } from '../../../types/asset.types';
import { assetService } from '../../../services/asset.service';
import TagSelector from './TagSelector';
import dayjs from 'dayjs';

const { Option } = Select;

interface AddAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'add' | 'edit';
  asset?: Asset | null;
}

export const AddAssetModal = ({ visible, onClose, onSuccess, mode = 'add', asset }: AddAssetModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

   // Pre-populate form when editing
   useEffect(() => {
     if (visible && mode === 'edit' && asset) {
       const assetData = asset as any;
        form.setFieldsValue({
          assetName: asset.name,
          category: assetData.category,
          os: assetData.os,
          assetTags: assetData.assetTags || [],
          make: assetData.make,
          model: asset.model,
          serialNumber: asset.serialNumber,
          uuid: assetData.uuid,
          ownerTechnician: assetData.ownerTechnician,
          ownerTags: assetData.ownerTags || [],
          endUserRequesters: assetData.endUserRequesters || [],
          customerName: assetData.customerName,
          assignDevice: assetData.assignDevice,
          baseLocation: assetData.baseLocation || asset.location?.base?.address,
          installedLocation: assetData.installedLocation,
          installedDate: assetData.installedDate ? dayjs(assetData.installedDate) : undefined,
          osType: asset.osType,
          osName: assetData.osName || asset.osType,
          osVersion: asset.osVersion,
          osInstallDate: assetData.osInstallDate,
          osInstallBy: assetData.osInstallBy,
          buildNumber: assetData.buildNumber || asset.osBuild,
          productId: assetData.productId,
          productKey: assetData.productKey,
          virtualNumber: assetData.virtualNumber,
          status: asset.status,
          criticality: assetData.criticality,
          serviceStatus: assetData.serviceStatus,
          operationalStatus: asset.operationalStatus,
          invoiceNo: asset.cost?.invoiceNumber,
          partNo: assetData.partNo,
          cost: asset.cost?.cost,
          purchaseDate: asset.cost?.purchaseDate ? dayjs(asset.cost.purchaseDate) : undefined,
          warrantyYears: assetData.warrantyYears,
          warrantyMonths: assetData.warrantyMonths,
          warrantyExpiryDate: asset.procurement?.warrantyExpiryDate ? dayjs(asset.procurement.warrantyExpiryDate) : undefined,
        });
     }
   }, [visible, mode, asset, form]);

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch (error) {
      message.error('Please fill all required fields');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue();

      // Transform form values to match backend API expectations
      const transformedData = {
        name: values.assetName,
        osType: values.os || values.osType,
        osVersion: values.osVersion,
        category: values.category,
        model: values.model,
        serialNumber: values.serialNumber,
        status: values.status || 'Available',
        operationalStatus: values.operationalStatus || 'Disconnected',
        // Include other fields as needed
        manufacturer: values.make,
        tags: values.assetTags || [],
      };

       if (mode === 'edit' && asset) {
         await assetService.updateAsset(asset.id, transformedData as any);
         message.success('Asset updated successfully');
       } else {
         await assetService.createAsset(transformedData as any);
         message.success('Asset created successfully');
       }

      form.resetFields();
      setCurrentStep(0);
      onSuccess();
    } catch (error) {
      console.error('Asset creation error:', error);
      message.error(mode === 'edit' ? 'Failed to update asset' : 'Failed to create asset');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCurrentStep(0);
    onClose();
  };

  const renderStep1 = () => (
    <div>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Asset Name" name="assetName" rules={[{ required: true }]}>
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Category" name="category" rules={[{ required: true }]}>
            <Select placeholder="Select">
              <Option value="computer">Computer</Option>
              <Option value="laptop">Laptop</Option>
              <Option value="server">Server</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
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
          <Form.Item label="Make" name="make">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Model" name="model">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Serial Number" name="serialNumber">
            <Input placeholder="Enter serial number" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="UUID" name="uuid">
            <Input placeholder="Enter UUID" />
          </Form.Item>
        </Col>
      </Row>

      <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h4>Owner Details</h4>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Owner/Technician" name="ownerTechnician">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Owner Tags" name="ownerTags">
              <Select mode="tags" placeholder="Select" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="End User/Requesters" name="endUserRequesters">
              <Select mode="multiple" placeholder="Select" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Customer Name" name="customerName">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Assign Device" name="assignDevice" valuePropName="checked">
          <Switch />
        </Form.Item>
      </div>

      <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h4>Location Details</h4>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Base Location" name="baseLocation">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Installed Location" name="installedLocation">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Installed Date" name="installedDate">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
      </div>
    </div>
  );

  const renderStep2 = () => (
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
          <Form.Item label="OS Name" name="osName">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="OS Version" name="osVersion">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="OS Install Date" name="osInstallDate">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="OS Install By" name="osInstallBy">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Build Number" name="buildNumber">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Product ID" name="productId">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Product Key" name="productKey">
            <Input placeholder="Input" />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Virtual Number" name="virtualNumber">
        <Input placeholder="Input" />
      </Form.Item>
    </div>
  );

  const renderStep3 = () => (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h4>Common Properties</h4>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Status" name="status">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Criticality" name="criticality">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Service Status" name="serviceStatus">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Operational Status" name="operationalStatus">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div style={{ marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h4>Cost Properties</h4>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Invoice No." name="invoiceNo">
              <Select placeholder="Select" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Part No." name="partNo">
              <Input placeholder="Enter part no." />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Cost" name="cost">
              <Input placeholder="Enter Cost" addonAfter="INR" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Purchase Date" name="purchaseDate">
              <Input placeholder="Enter purchase date" />
            </Form.Item>
          </Col>
        </Row>
      </div>

      <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        <h4>Procurement Properties</h4>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="Warranty In Years" name="warrantyYears">
              <Input type="number" placeholder="0" addonAfter="in years" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item label="& Months" name="warrantyMonths">
              <Input type="number" placeholder="0" addonAfter="in months" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Warranty Expiry Date" name="warrantyExpiryDate">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      </div>
    </div>
  );

  const stepItems = [
    { title: 'Define Assets' },
    { title: 'OS Properties' },
    { title: 'Additional Properties' },
  ];

  const stepContent = [renderStep1(), renderStep2(), renderStep3()];

  return (
    <Modal
      title={mode === 'edit' ? 'Edit Asset' : 'Add New Asset'}
      open={visible}
      onCancel={handleCancel}
      width={900}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={currentStep > 0 ? handlePrevious : handleCancel}>
            {currentStep > 0 ? 'Back' : 'Cancel'}
          </Button>
          <Button
            type="primary"
            onClick={currentStep === stepItems.length - 1 ? handleSubmit : handleNext}
            loading={loading}
          >
            {currentStep === stepItems.length - 1 ? (mode === 'edit' ? 'Update Asset' : 'Submit Asset') : 'Next'}
          </Button>
        </div>
      }
    >
      <Steps current={currentStep} items={stepItems} style={{ marginBottom: 24 }} />
      <Form form={form} layout="vertical">
        {stepContent[currentStep]}
      </Form>
    </Modal>
  );
};
