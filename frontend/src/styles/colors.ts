export const colors = {
  primary: '#1890ff',
  primaryHover: '#40a9ff',
  primaryActive: '#096dd9',

  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',

  severity: {
    critical: '#ff4d4f',
    high: '#ff4d4f',
    medium: '#faad14',
    low: '#52c41a',
  },

  gray: {
    1: '#141414',
    2: '#262626',
    3: '#434343',
    4: '#595959',
    5: '#8c8c8c',
    6: '#bfbfbf',
    7: '#d9d9d9',
    8: '#f0f0f0',
    9: '#f5f5f5',
    10: '#fafafa',
  },

  black: '#000000',
  white: '#ffffff',
} as const;

export type ColorKey = keyof typeof colors;
