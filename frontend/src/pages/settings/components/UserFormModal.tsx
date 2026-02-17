import { useState } from 'react';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import {
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Upload,
  Divider,
  Alert,
  Row,
  Col,
  Button,
} from 'antd';
import type { FormInstance } from 'antd';
import { validateEmail } from '../../../utils/validation';

const { Dragger } = Upload;

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt?: string;
  password?: string;
  timezone?: string;
  organizationId?: string;
  organizationName?: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  roleId?: string;
  roleName?: string;
  loginAllowed?: boolean;
  endpointAssignmentAllowed?: boolean;
  avatar?: string;
  status?: string;
  isSuperAdmin?: boolean;
  isSystem?: boolean;
}

interface UserFormModalProps {
  open: boolean;
  mode: 'view' | 'edit' | 'create';
  editingUser: User | null;
  form: FormInstance;
  organizations: Array<{ id: string; name: string }>;
  departments: Array<{ id: string; name: string }>;
  roles: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: () => void;
  onSwitchToEdit: () => void;
  onFileChange: (file: unknown) => void;
}

export const UserFormModal = ({
  open,
  mode,
  editingUser,
  form,
  organizations,
  departments,
  roles,
  branches,
  onClose,
  onSubmit,
  onSwitchToEdit,
  onFileChange,
}: UserFormModalProps) => {
  const isSuperAdminUser = editingUser?.isSuperAdmin || editingUser?.isSystem;
  const [emailCharCount, setEmailCharCount] = useState(0);
  const [emailError, setEmailError] = useState<string | null>(null);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmailCharCount(value.length);
    const error = validateEmail(value);
    setEmailError(error);
  };

  return (
    <Modal
      title={mode === 'create' ? 'Create User' : mode === 'edit' ? 'Edit User' : 'View User'}
      open={open}
      onCancel={onClose}
      width={700}
      footer={
        mode !== 'view' ? [
          <Button key="cancel" onClick={onClose}>
            Cancel
          </Button>,
          <Button key="submit" type="primary" onClick={onSubmit}>
            {mode === 'create' ? 'Create' : 'Update'} User
          </Button>,
        ] : [
          <Button key="close" onClick={onClose}>
            Close
          </Button>,
          !isSuperAdminUser && (
            <Button key="edit" type="primary" onClick={onSwitchToEdit}>
              Edit
            </Button>
          ),
        ]
      }
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="First Name" name="firstName" rules={[{ required: true, message: 'Please enter first name' }]}>
              <Input placeholder="First Name" disabled={mode === 'view'} maxLength={255} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Last Name" name="lastName" rules={[{ required: true, message: 'Please enter last name' }]}>
              <Input placeholder="Last Name" disabled={mode === 'view'} maxLength={255} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="Email (used as username)"
              name="email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter valid email' },
              ]}
              help={
                <>
                  {emailError && <span style={{ color: '#ff4d4f', display: 'block' }}>{emailError}</span>}
                  <span style={{ fontSize: '12px', color: '#999' }}>{emailCharCount}/255 characters</span>
                </>
              }
              validateStatus={emailError ? 'error' : ''}
            >
              <Input
                disabled={mode === 'view'}
                placeholder="user@example.com"
                maxLength={255}
                onChange={handleEmailChange}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Phone" name="phone">
              <Input disabled={mode === 'view'} placeholder="Enter phone" />
            </Form.Item>
          </Col>
        </Row>

        {mode !== 'view' && (
          <>
            <Divider>Password</Divider>
            <Alert
              message="Password Requirements"
              description="Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Password"
                  name="password"
                  rules={mode === 'create' ? [
                    { required: true, message: 'Please enter password' },
                    { min: 8, message: 'Password must be at least 8 characters' },
                    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, message: 'Must include uppercase, lowercase, number, and special character' },
                  ] : [
                    { min: 8, message: 'Password must be at least 8 characters' },
                    { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])/, message: 'Must include uppercase, lowercase, number, and special character' },
                  ]}
                >
                  <Input.Password placeholder="Enter password" iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="Confirm Password"
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={mode === 'create' ? [
                    { required: true, message: 'Please confirm password' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ] : [
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject(new Error('Passwords do not match'));
                      },
                    }),
                  ]}
                >
                  <Input.Password placeholder="Confirm password" iconRender={(visible) => (visible ? <EyeOutlined /> : <EyeInvisibleOutlined />)} />
                </Form.Item>
              </Col>
            </Row>
          </>
        )}

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Timezone" name="timezone">
              <Select
                placeholder="Please Select"
                disabled={mode === 'view'}
                options={[
                  { label: 'UTC', value: 'UTC' },
                  { label: 'IST (India Standard Time)', value: 'IST' },
                  { label: 'EST', value: 'EST' },
                  { label: 'PST', value: 'PST' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={12} />
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>Login Allowed</div>
              <Form.Item name="loginAllowed" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch disabled={mode === 'view'} />
              </Form.Item>
            </div>
          </Col>
          <Col span={12}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ marginBottom: '8px', fontWeight: 500 }}>Endpoint Assignment Allowed</div>
              <Form.Item name="endpointAssignmentAllowed" valuePropName="checked" style={{ marginBottom: 0 }}>
                <Switch disabled={mode === 'view'} />
              </Form.Item>
            </div>
          </Col>
        </Row>

        {mode !== 'view' && (
          <>
            <Divider>Avatar</Divider>
            <Form.Item>
              <Dragger
                maxCount={1}
                accept=".png,.jpg,.jpeg,.gif"
                onChange={(info) => {
                  onFileChange(info.fileList.length > 0 ? info.fileList[0] : null);
                }}
              >
                <p style={{ fontSize: '16px', marginBottom: 0 }}>
                  <InboxOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
                </p>
                <p>Click or drag file to this area to upload</p>
                <p style={{ color: '#999', fontSize: '12px' }}>Support for a single upload</p>
              </Dragger>
            </Form.Item>
          </>
        )}

        <Divider>Organization & Role</Divider>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Organization" name="organizationId" rules={[{ required: true, message: 'Please select an organization' }]}>
              <Select
                placeholder="Select Organization"
                disabled={mode === 'view'}
                options={organizations.map((org) => ({ label: org.name, value: org.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Role" name="roleId" rules={[{ required: true, message: 'Please select a role' }]}>
              <Select
                placeholder="Select Role"
                disabled={mode === 'view'}
                options={roles.map((role) => ({ label: role.name, value: role.id }))}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="Branch/Location" name="branchId">
              <Select
                placeholder="Select Branch/Location"
                disabled={mode === 'view'}
                allowClear
                options={branches.map((branch) => ({ label: branch.name, value: branch.id }))}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Department" name="departmentId">
              <Select
                placeholder="Select Department"
                disabled={mode === 'view'}
                allowClear
                options={departments.map((dept) => ({ label: dept.name, value: dept.id }))}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};
