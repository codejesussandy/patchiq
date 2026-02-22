import { useState } from 'react';
import type { CSSProperties } from 'react';
import { useBrandingSettings } from '../hooks/useSettings';

interface LogoProps {
  style?: CSSProperties;
  size?: 'small' | 'medium' | 'large';
}

export const Logo = ({ style, size = 'medium' }: LogoProps) => {
  const { data: branding } = useBrandingSettings();
  const [imgError, setImgError] = useState(false);

  const sizes = {
    small: { width: 24, height: 24, fontSize: 16 },
    medium: { width: 32, height: 32, fontSize: 16 },
    large: { width: 40, height: 40, fontSize: 20 },
  };

  const { width, height, fontSize } = sizes[size];
  const logoUrl = branding?.logoUrl as string | undefined;

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt="Company logo"
        onError={() => setImgError(true)}
        style={{
          width,
          height,
          objectFit: 'contain',
          borderRadius: '4px',
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }

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
