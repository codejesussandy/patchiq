import { useState } from 'react';
import { Form, Input, Button, Typography, Select, Space } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const { Title, Text } = Typography;

interface OnboardingFormValues {
  name: string;
  contactNumber: string;
  countryCode: string;
  password: string;
  confirmPassword: string;
}

export const UserOnboarding = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { completeOnboarding } = useAuth();

  const handleSubmit = async (values: OnboardingFormValues) => {
    setLoading(true);
    try {
      const fullContactNumber = `${values.countryCode}${values.contactNumber}`;
      await completeOnboarding(values.name, fullContactNumber, values.password, values.confirmPassword);
      navigate('/dashboard');
    } catch (error) {
      // Error is handled in AuthContext with message.error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <svg
          className="wave-svg"
          viewBox="0 0 1440 800"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#E3F2FD" />
              <stop offset="50%" stopColor="#BBDEFB" />
              <stop offset="100%" stopColor="#90CAF9" />
            </linearGradient>
          </defs>
          <path
            fill="url(#gradient1)"
            d="M0,224L48,240C96,256,192,288,288,277.3C384,267,480,213,576,213.3C672,213,768,267,864,272C960,277,1056,235,1152,213.3C1248,192,1344,192,1392,192L1440,192L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
            opacity="0.3"
          />
          <path
            fill="url(#gradient1)"
            d="M0,384L48,394.7C96,405,192,427,288,416C384,405,480,363,576,330.7C672,299,768,277,864,282.7C960,288,1056,320,1152,320C1248,320,1344,288,1392,272L1440,256L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
            opacity="0.5"
          />
          <path
            fill="url(#gradient1)"
            d="M0,544L48,554.7C96,565,192,587,288,592C384,597,480,587,576,560C672,533,768,491,864,480C960,469,1056,491,1152,501.3C1248,512,1344,512,1392,512L1440,512L1440,800L1392,800C1344,800,1248,800,1152,800C1056,800,960,800,864,800C768,800,672,800,576,800C480,800,384,800,288,800C192,800,96,800,48,800L0,800Z"
          />
        </svg>
      </div>

      <div className="login-card">
        <div className="login-form-wrapper">
          <Title level={2} className="login-title">
            Account Setup
          </Title>
          <Text className="login-subtitle">
            Enter your details to complete onboarding
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="login-form"
          >
            <Form.Item
              label="Your Name"
              name="name"
              rules={[
                { required: true, message: 'Please enter your name' },
                { min: 2, message: 'Name must be at least 2 characters' },
              ]}
            >
              <Input
                size="large"
                placeholder="Enter name"
                autoComplete="name"
              />
            </Form.Item>

            <Form.Item label="Contact Number">
              <Space.Compact style={{ width: '100%' }}>
                <Form.Item
                  name="countryCode"
                  noStyle
                  initialValue="+91"
                >
                  <Select
                    size="large"
                    style={{ width: '30%' }}
                  >
                    <Select.Option value="+91">+91</Select.Option>
                    <Select.Option value="+1">+1</Select.Option>
                    <Select.Option value="+44">+44</Select.Option>
                    <Select.Option value="+61">+61</Select.Option>
                  </Select>
                </Form.Item>
                <Form.Item
                  name="contactNumber"
                  noStyle
                  rules={[
                    { pattern: /^[0-9]{10}$/, message: 'Please enter a valid 10-digit number' },
                  ]}
                >
                  <Input
                    size="large"
                    placeholder="00 000 00000"
                    style={{ width: '70%' }}
                    autoComplete="tel"
                  />
                </Form.Item>
              </Space.Compact>
            </Form.Item>

            <Form.Item
              label="New Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 8, message: 'Password must be at least 8 characters' },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="••••••••"
                autoComplete="new-password"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item
              label="Confirm password"
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                size="large"
                placeholder="••••••••"
                autoComplete="new-password"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <Form.Item className="login-button-wrapper" style={{ marginTop: '32px' }}>
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                className="login-button"
                icon={<ArrowRightOutlined />}
                iconPlacement="end"
              >
                Setup Account
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};
