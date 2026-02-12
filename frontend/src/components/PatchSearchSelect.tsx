import React, { useState, useEffect } from 'react';
import { Select, Spin } from 'antd';
import type { SelectProps } from 'antd';
import { usePatches } from '@/hooks/usePatches';
import type { Patch } from '@/types/patch.types';

interface PatchSearchSelectProps {
  value?: string;
  onChange: (patchId: string, patch?: Patch) => void;
  placeholder?: string;
  excludeIds?: string[];
  disabled?: boolean;
  style?: React.CSSProperties;
}

export const PatchSearchSelect: React.FC<PatchSearchSelectProps> = ({
  value,
  onChange,
  placeholder = 'Search by patch title, ID, or KB number...',
  excludeIds = [],
  disabled = false,
  style,
}) => {
  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce search input (500ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchText]);

  // Fetch patches with search filter
  const { data, isLoading } = usePatches({
    search: debouncedSearch,
    limit: 20,
    includeSuperseded: true, // Show all patches in search
  });

  const patches = data?.data || [];

  // Filter out excluded IDs
  const filteredPatches = patches.filter(
    (patch) => !excludeIds.includes(patch.id)
  );

  const options: SelectProps['options'] = filteredPatches.map((patch) => ({
    value: patch.id,
    label: (
      <div>
        <div style={{ fontWeight: 500 }}>
          {patch.title || patch.software}
          {patch.kbNumber && (
            <span style={{ marginLeft: 8, color: '#8c8c8c' }}>
              ({patch.kbNumber})
            </span>
          )}
        </div>
        <div style={{ fontSize: '12px', color: '#8c8c8c' }}>
          {patch.patchId} • {patch.severity}
        </div>
      </div>
    ),
    patch, // Store full patch object for onChange
  }));

  return (
    <Select
      showSearch
      value={value}
      placeholder={placeholder}
      defaultActiveFirstOption={false}
      suffixIcon={isLoading ? <Spin size="small" /> : undefined}
      filterOption={false}
      onSearch={setSearchText}
      onChange={(selectedValue) => {
        const selectedOption = options.find((opt) => opt.value === selectedValue);
        onChange(selectedValue, selectedOption?.patch as Patch | undefined);
      }}
      notFoundContent={
        isLoading ? <Spin size="small" /> : searchText.length < 2 ? 'Type at least 2 characters to search' : 'No patches found'
      }
      options={options}
      disabled={disabled}
      style={{ width: '100%', ...style }}
    />
  );
};
