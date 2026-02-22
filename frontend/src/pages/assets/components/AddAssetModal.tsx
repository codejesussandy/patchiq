import { useState, useEffect } from 'react';
import { App, Modal, Steps, Form, Button } from 'antd';
import dayjs from 'dayjs';
import { useCategories, useCreateAsset, useUpdateAsset } from '../../../hooks/useAssets';
import type { Asset } from '../../../types/asset.types';
import { sanitizeHTML } from '../../../utils/sanitize';
import { validateAndSanitize } from '../../../utils/validation';
import { AssetStep1, AssetStep2, AssetStep3 } from './AddAssetModalSteps';

interface AddAssetModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode?: 'add' | 'edit';
  asset?: Asset | null;
}

export const AddAssetModal = ({ visible, onClose, onSuccess, mode = 'add', asset }: AddAssetModalProps) => {
  const { message } = App.useApp();
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>();

  const { data: categoriesData } = useCategories();
  const categories = categoriesData || [];
  const createAssetMutation = useCreateAsset();
  const updateAssetMutation = useUpdateAsset();

  const subCategories = categories.find((c: { id: string; subCategories?: { id: string; name: string }[] }) => c.id === selectedCategoryId)?.subCategories || [];

  useEffect(() => {
    if (visible && mode === 'edit' && asset) {
      const assetData = asset as Asset & Record<string, unknown>;
      if (assetData.categoryId) {
        setSelectedCategoryId(assetData.categoryId as string);
      }
      const formValues = {
        assetName: asset.name,
        categoryId: assetData.categoryId,
        subCategoryId: assetData.subCategoryId,
        os: asset.osType,
        assetTags: assetData.tagIds || [],
        make: asset.manufacturer,
        model: asset.model,
        serialNumber: asset.serialNumber,
        uuid: assetData.uuid,
        ownerTechnician: assetData.ownerName,
        ownerTags: assetData.ownerTags || [],
        endUserRequesters: assetData.endUserRequesters || [],
        customerName: assetData.customerName,
        assignDevice: assetData.assignDevice,
        baseLocation: assetData.baseLocation || asset.location?.base?.address,
        installedLocation: assetData.installedLocation,
        installedDate: assetData.installedDate ? dayjs(assetData.installedDate) : undefined,
        hostname: asset.hostname,
        ipAddress: asset.ipAddress,
        macAddress: asset.macAddress,
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
        vendor: asset.procurement?.vendor,
        purchaseOrderNumber: asset.procurement?.purchaseOrderNumber,
        amcVendor: asset.procurement?.amcVendor,
        amcCost: asset.procurement?.amcCost,
        amcExpiryDate: asset.procurement?.amcExpiryDate ? dayjs(asset.procurement.amcExpiryDate) : undefined,
        endOfLife: asset.procurement?.endOfLife ? dayjs(asset.procurement.endOfLife) : undefined,
        endOfSupport: asset.procurement?.endOfSupport ? dayjs(asset.procurement.endOfSupport) : undefined,
        currency: asset.cost?.currency,
        currentValue: asset.cost?.currentCost,
        salvageValue: asset.cost?.salvageValue,
        depreciationType: asset.cost?.depreciationType,
      };
      form.setFieldsValue(formValues);
    } else if (visible && mode === 'add') {
      form.resetFields();
      setSelectedCategoryId(undefined);
    }
  }, [visible, mode, asset, form]);

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch {
      message.error('Please fill all required fields');
    }
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const values = form.getFieldsValue(true);

      // Validate critical fields before submission
      if (values.assetName) {
        const nameValidation = validateAndSanitize(values.assetName, 'name');
        if (!nameValidation.isValid) {
          message.error(nameValidation.error || 'Invalid asset name');
          setLoading(false);
          return;
        }
      }

      if (values.ownerEmail) {
        const emailValidation = validateAndSanitize(values.ownerEmail, 'email');
        if (!emailValidation.isValid) {
          message.error(emailValidation.error || 'Invalid email address');
          setLoading(false);
          return;
        }
      }

      if (values.hostname) {
        const hostnameValidation = validateAndSanitize(values.hostname, 'hostname');
        if (!hostnameValidation.isValid) {
          message.error(hostnameValidation.error || 'Invalid hostname');
          setLoading(false);
          return;
        }
      }

      // Sanitize all string inputs to prevent XSS
      const transformedData = {
        name: sanitizeHTML(values.assetName),
        categoryId: values.categoryId || undefined,
        subCategoryId: values.subCategoryId || undefined,
        osType: sanitizeHTML(values.os || values.osType),
        osVersion: sanitizeHTML(values.osVersion),
        model: sanitizeHTML(values.model),
        serialNumber: sanitizeHTML(values.serialNumber),
        status: values.status,
        manufacturer: sanitizeHTML(values.make),
        tags: values.assetTags || [],
        hostname: sanitizeHTML(values.hostname),
        ipAddress: values.ipAddress, // Already validated at backend
        macAddress: sanitizeHTML(values.macAddress),
        ownerName: sanitizeHTML(values.ownerTechnician),
        ownerEmail: values.ownerEmail, // Already validated above
        ownerDepartment: sanitizeHTML(values.ownerDepartment),
        vendor: sanitizeHTML(values.vendor),
        purchaseDate: values.purchaseDate?.toISOString?.() || values.purchaseDate,
        warrantyExpiry: values.warrantyExpiryDate?.toISOString?.() || values.warrantyExpiryDate,
        purchaseOrderNumber: sanitizeHTML(values.purchaseOrderNumber),
        purchaseCost: values.cost && !isNaN(parseFloat(values.cost)) ? parseFloat(values.cost) : undefined,
        invoiceNumber: sanitizeHTML(values.invoiceNo),
        currency: sanitizeHTML(values.currency),
        currentValue: values.currentValue && !isNaN(parseFloat(values.currentValue)) ? parseFloat(values.currentValue) : undefined,
        salvageValue: values.salvageValue && !isNaN(parseFloat(values.salvageValue)) ? parseFloat(values.salvageValue) : undefined,
        depreciationType: sanitizeHTML(values.depreciationType),
        amcVendor: sanitizeHTML(values.amcVendor),
        amcCost: sanitizeHTML(values.amcCost),
        amcExpiryDate: values.amcExpiryDate?.toISOString?.() || values.amcExpiryDate,
        endOfLife: values.endOfLife?.toISOString?.() || values.endOfLife,
        endOfSupport: values.endOfSupport?.toISOString?.() || values.endOfSupport,
      };

      const cleanedData = Object.fromEntries(
        Object.entries(transformedData).filter(([, v]) => {
          if (Array.isArray(v)) return true;
          return v !== undefined && v !== '';
        })
      );

      if (mode === 'edit' && asset) {
        await updateAssetMutation.mutateAsync({ id: asset.id, data: cleanedData as Partial<Asset> });
        message.success('Asset updated successfully');
      } else {
        await createAssetMutation.mutateAsync(cleanedData as Record<string, unknown>);
        message.success('Asset created successfully');
      }

      form.resetFields();
      setCurrentStep(0);
      onSuccess();
    } catch {
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

  const stepItems = [
    { title: 'Define Assets' },
    { title: 'OS Properties' },
    { title: 'Additional Properties' },
  ];

  return (
    <Modal
      title={mode === 'edit' ? 'Edit Asset' : 'Add New Asset'}
      open={visible}
      onCancel={handleCancel}
      width={900}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button onClick={currentStep > 0 ? () => setCurrentStep(currentStep - 1) : handleCancel}>
            {currentStep > 0 ? 'Back' : 'Cancel'}
          </Button>
          <Button type="primary" onClick={currentStep === stepItems.length - 1 ? handleSubmit : handleNext} loading={loading}>
            {currentStep === stepItems.length - 1 ? (mode === 'edit' ? 'Update Asset' : 'Submit Asset') : 'Next'}
          </Button>
        </div>
      }
    >
      <Steps current={currentStep} items={stepItems} style={{ marginBottom: 24 }} />
      <Form form={form} layout="vertical" preserve={true} name="addAssetForm">
        <div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
          <AssetStep1
            categories={categories}
            subCategories={subCategories}
            selectedCategoryId={selectedCategoryId}
            onCategoryChange={setSelectedCategoryId}
            form={form}
          />
        </div>
        <div style={{ display: currentStep === 1 ? 'block' : 'none' }}><AssetStep2 /></div>
        <div style={{ display: currentStep === 2 ? 'block' : 'none' }}><AssetStep3 /></div>
      </Form>
    </Modal>
  );
};
