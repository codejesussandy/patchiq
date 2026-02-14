import type { ReactNode } from 'react';
import { MoreOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: (info: { domEvent: React.MouseEvent }) => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  ariaLabel?: string;
  size?: 'small' | 'middle' | 'large';
  buttonType?: 'text' | 'default';
}

export const ActionMenu = ({
  items,
  ariaLabel = 'More actions',
  size = 'small',
  buttonType = 'text',
}: ActionMenuProps) => {
  const menuItems: MenuProps['items'] = items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: item.icon,
    danger: item.danger,
    disabled: item.disabled,
    onClick: item.onClick,
  }));

  return (
    <Dropdown menu={{ items: menuItems }} trigger={['click']}>
      <Button
        type={buttonType}
        size={size}
        icon={<MoreOutlined />}
        aria-label={ariaLabel}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      />
    </Dropdown>
  );
};
