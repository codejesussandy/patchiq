import { useState } from 'react';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import { Form, Input, Button, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const { Title, Text, Link } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch {
      // Error is handled in AuthContext with message.error
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    navigate('/forgot-password');
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
            Welcome to InventIQ
          </Title>
          <Text className="login-subtitle">
            Enter your details to sign in your account
          </Text>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="login-form"
            requiredMark={false}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' },
              ]}
            >
              <Input
                size="large"
                placeholder="sharma@mail.com"
                autoComplete="email"
              />
            </Form.Item>

            <Form.Item
              label="Password"
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
              ]}
            >
              <Input.Password
                size="large"
                placeholder="Password"
                autoComplete="current-password"
                iconRender={(visible) =>
                  visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
                }
              />
            </Form.Item>

            <div className="forgot-password-wrapper">
              <Link onClick={handleForgotPassword} className="forgot-password-link">
                Forgot password
              </Link>
            </div>

            <Form.Item className="login-button-wrapper">
              <Button
                type="primary"
                htmlType="submit"
                size="large"
                loading={loading}
                block
                className="login-button"
              >
                Log in
              </Button>
            </Form.Item>
          </Form>
        </div>
      </div>
    </div>
  );
};
