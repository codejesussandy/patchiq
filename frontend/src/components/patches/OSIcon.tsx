import { WindowsOutlined, AppleOutlined } from '@ant-design/icons';

type OSIconProps = {
  os: string;
};

export const OSIcon = ({ os }: OSIconProps) => {
  const getIcon = () => {
    switch (os) {
      case 'Windows':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <WindowsOutlined style={{ color: '#0078d4', fontSize: '16px' }} />
            <span>Windows</span>
          </span>
        );
      case 'MacOS':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <AppleOutlined style={{ color: '#000', fontSize: '16px' }} />
            <span>MacOS</span>
          </span>
        );
      case 'Ubuntu':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: '#E95420', fontWeight: 'bold', fontSize: '14px' }}>●</span>
            <span>Ubuntu</span>
          </span>
        );
      case 'Linux':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '14px' }}>🐧</span>
            <span>Linux</span>
          </span>
        );
      default:
        return <span>{os}</span>;
    }
  };

  return <>{getIcon()}</>;
};
