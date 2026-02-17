import type { CSSProperties } from 'react';

interface LogoProps {
  style?: CSSProperties;
  size?: 'small' | 'medium' | 'large';
}

export const Logo = ({ style, size = 'medium' }: LogoProps) => {
  const sizes = {
    small: { width: 24, height: 24, fontSize: 16 },
    medium: { width: 32, height: 32, fontSize: 16 },
    large: { width: 40, height: 40, fontSize: 20 },
  };

  const { width, height, fontSize } = sizes[size];

  return (
    <div
      style={{
        width,
        height,
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontWeight: 'bold',
        fontSize,
        flexShrink: 0,
        ...style,
      }}
    >
      P
    </div>
  );
};
