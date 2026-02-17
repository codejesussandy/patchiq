import { useState, useEffect } from 'react';
import { App, Modal, Button, Space, Form, Steps } from 'antd';
import dayjs from 'dayjs';
import { useSearchParams } from 'react-router-dom';
import { useTags } from '../../../hooks/useAssets';
import { useCreatePatch, useUpdatePatch } from '../../../hooks/usePatches';
import { useCveSuggestions } from '../../../hooks/useVulnerabilities';
import { patchService, type Patch, type AffectedSoftware } from '../../../services/patch.service';
import { sanitizeHTML } from '../../../utils/sanitize';
import { AffectedProductsStep } from './AffectedProductsStep';
import { PatchFormFields } from './PatchFormFields';

interface PatchCreateEditModalProps {
  open: boolean;
  editingPatch: Patch | null;
  initialValues?: Record<string, unknown>;
  onClose: () => void;
}

export const PatchCreateEditModal = ({ open, editingPatch, initialValues, onClose }: PatchCreateEditModalProps) => {
  const { message } = App.useApp();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm();
  const createPatchMutation = useCreatePatch();
  const updatePatchMutation = useUpdatePatch();
  const { data: tags = [] } = useTags();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [affectedProducts, setAffectedProducts] = useState<AffectedSoftware[]>([]);
  const [createdPatchId, setCreatedPatchId] = useState<string | null>(null);

  // CVE auto-suggest
  const [cveSoftwareQuery, setCveSoftwareQuery] = useState('');
  const [cveVendorQuery, setCveVendorQuery] = useState('');
  const { data: cveSuggestions = [] } = useCveSuggestions(cveSoftwareQuery, cveVendorQuery);

  // Auto-populate from search params
  useEffect(() => {
    if (!open) return;
    if (editingPatch) {
      form.setFieldsValue({
        software: editingPatch.software, platform: editingPatch.platform || editingPatch.os, vendor: editingPatch.vendor,
        product: editingPatch.product, description: editingPatch.description, severity: editingPatch.severity,
        category: editingPatch.category, bulletinId: editingPatch.bulletinId, kbNumber: editingPatch.kbNumber,
        publishedAt: editingPatch.publishedAt ? dayjs(editingPatch.publishedAt) : undefined,
        rebootRequired: editingPatch.rebootRequired ?? false, supportUninstallation: editingPatch.supportUninstallation ?? false,
        architecture: editingPatch.architecture, referenceUrl: editingPatch.referenceUrl,
        languagesSupported: editingPatch.languagesSupported || [], tags: editingPatch.tags || [], cveNumbers: editingPatch.cveNumbers || [],
      });
      setCreatedPatchId(editingPatch.id);
    } else {
      form.resetFields();
      setCreatedPatchId(null);
      // Apply initial values from template or search params
      const cve = searchParams.get('cve');
      const severity = searchParams.get('severity');
      if (initialValues) {
        setTimeout(() => form.setFieldsValue(initialValues), 100);
      } else if (cve || severity) {
        setTimeout(() => {
          const values: Record<string, unknown> = {};
          if (cve) values.cveNumbers = [cve];
          if (severity) values.severity = severity;
          form.setFieldsValue(values);
        }, 100);
      }
    }
    setStep(0);
    setAffectedProducts([]);
  }, [open, editingPatch]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    form.resetFields();
    setStep(0);
    setCreatedPatchId(null);
    setAffectedProducts([]);
    onClose();
  };

  const handleNext = async () => {
    if (step === 0) {
      try {
        await form.validateFields();
        setSaving(true);
        const values = form.getFieldsValue();
        // Sanitize all string inputs to prevent XSS
        const payload = {
          software: sanitizeHTML(values.software), platform: sanitizeHTML(values.platform), os: sanitizeHTML(values.platform),
          vendor: values.vendor ? sanitizeHTML(values.vendor) : undefined, product: values.product ? sanitizeHTML(values.product) : undefined,
          description: values.description ? sanitizeHTML(values.description) : undefined, severity: values.severity, category: values.category,
          bulletinId: values.bulletinId ? sanitizeHTML(values.bulletinId) : undefined, kbNumber: values.kbNumber ? sanitizeHTML(values.kbNumber) : undefined,
          publishedAt: values.publishedAt?.format('YYYY-MM-DD') || undefined,
          rebootRequired: values.rebootRequired ?? false, supportUninstallation: values.supportUninstallation ?? false,
          architecture: values.architecture || undefined, referenceUrl: values.referenceUrl || undefined,
          languagesSupported: values.languagesSupported || [], tags: values.tags || [], cveNumbers: values.cveNumbers || [],
        };
        if (editingPatch) {
          await updatePatchMutation.mutateAsync({ id: editingPatch.id, data: payload });
          const products = await patchService.getAffectedSoftwares(editingPatch.id);
          setAffectedProducts(products);
          setCreatedPatchId(editingPatch.id);
        } else if (createdPatchId) {
          await updatePatchMutation.mutateAsync({ id: createdPatchId, data: payload });
          const products = await patchService.getAffectedSoftwares(createdPatchId);
          setAffectedProducts(products);
        } else {
          const created = await createPatchMutation.mutateAsync(payload);
          setCreatedPatchId(created.id);
          message.success('Patch created. Now add affected products.');
        }
        setStep(1);
      } catch (error) {
        if ((error as { errorFields?: unknown }).errorFields) return;
        message.error('Failed to save patch');
      } finally {
        setSaving(false);
      }
    } else {
      handleClose();
    }
  };

  const isEditing = !!editingPatch;
  const activePatchId = editingPatch?.id || createdPatchId;

  return (
    <Modal title={isEditing ? 'Edit Patch' : 'Create Patch'} open={open} onCancel={handleClose} width={800}
      footer={<div style={{ display: 'flex', justifyContent: 'space-between' }}>
        {step > 0 ? <Button onClick={() => setStep(0)}>Back</Button> : <div />}
        <Space>
          <Button onClick={handleClose}>Cancel</Button>
          <Button type="primary" loading={saving} onClick={handleNext}>{step === 0 ? 'Next' : 'Done'}</Button>
        </Space>
      </div>}
    >
      <Steps current={step} style={{ marginBottom: 24 }} items={[{ title: 'Define Patch' }, { title: 'Affected Products' }]} />
      {step === 0 ? (
        <PatchFormFields form={form} tags={tags} cveSuggestions={cveSuggestions}
          onCveFocus={(software?: string, vendor?: string) => { setCveSoftwareQuery(software || ''); setCveVendorQuery(vendor || ''); }} />
      ) : (
        <AffectedProductsStep patchId={activePatchId} affectedProducts={affectedProducts} setAffectedProducts={setAffectedProducts} />
      )}
    </Modal>
  );
};

