import type { CSSProperties } from 'react';

interface SparklesIconProps {
  style?: CSSProperties;
  className?: string;
}

export const SparklesIcon = ({ style, className }: SparklesIconProps) => {
  const size = style?.fontSize ?? 16;
  const color = style?.color ?? 'currentColor';

  return (
    <span
      role="img"
      aria-label="sparkles"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        lineHeight: 0,
        ...style,
        fontSize: undefined,
        color: undefined,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M9.5 2L11.3 7.7L17 9.5L11.3 11.3L9.5 17L7.7 11.3L2 9.5L7.7 7.7L9.5 2Z"
          fill={color as string}
        />
        <path
          d="M18 13L19.2 16.8L23 18L19.2 19.2L18 23L16.8 19.2L13 18L16.8 16.8L18 13Z"
          fill={color as string}
          opacity={0.7}
        />
      </svg>
    </span>
  );
};
