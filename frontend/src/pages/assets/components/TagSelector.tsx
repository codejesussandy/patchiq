import React from 'react';
import { PlusOutlined } from '@ant-design/icons';
import { Select, Tag as AntTag, Space, Spin, Button } from 'antd';
import { useTags } from '../../../hooks/useAssets';
import { tagService } from '../../../services/tag.service';
import type { Tag as TagType } from '../../../types/asset.types';
import CreateTagModal from './CreateTagModal';

interface TagSelectorProps {
  value?: string[];
  onChange?: (tagIds: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  showCreateButton?: boolean;
}

const TagSelector: React.FC<TagSelectorProps> = ({
  value = [],
  onChange,
  placeholder = 'Select or create tags',
  disabled = false,
  maxTags = 20,
  showCreateButton = false,
}) => {
  const { data: tagsData, isLoading: loading } = useTags();
  const [searchResults, setSearchResults] = React.useState<TagType[] | null>(null);
  const [modalVisible, setModalVisible] = React.useState(false);

  // Use search results if available, otherwise fall back to all tags from React Query
  const tags: TagType[] = searchResults ?? (Array.isArray(tagsData) ? tagsData : []);

  const handleSearch = async (searchValue: string) => {
    if (searchValue.trim().length === 0) {
      setSearchResults(null); // Reset to use React Query data
      return;
    }

    try {
      const results = await tagService.searchTags(searchValue);
      setSearchResults(Array.isArray(results) ? results : []);
    } catch {
      setSearchResults([]);
    }
  };

  const handleTagCreated = async (newTag: TagType) => {
    setSearchResults(null); // Reset to let React Query refetch
    if (onChange) {
      const updatedValues = [...value, newTag.id];
      onChange(updatedValues);
    }
    setModalVisible(false);
  };

  const handleChange = (selectedValues: string[]) => {
    if (selectedValues.length > maxTags) {
      return;
    }
    if (onChange) {
      onChange(selectedValues);
    }
  };

  const options = tags.map((tag) => ({
    label: (
      <Space size="small">
        {tag.color && (
          <AntTag color={tag.color} style={{ marginRight: 0 }}>
            {tag.icon && <span>{tag.icon} </span>}
            {tag.name}
          </AntTag>
        )}
        {!tag.color && `${tag.icon ? tag.icon + ' ' : ''}${tag.name}`}
        {tag.description && (
          <span style={{ fontSize: '16px', color: '#666' }}>({tag.description})</span>
        )}
      </Space>
    ),
    value: tag.id,
    label_text: tag.name, // For filtering
  }));

  return (
    <>
      <Select
        mode="multiple"
        loading={loading}
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onSearch={handleSearch}
        disabled={disabled || (value.length >= maxTags)}
        options={options}
        filterOption={(input, option) => {
          const label = option?.['label_text'] || '';
          return label.toLowerCase().includes(input.toLowerCase());
        }}
        notFoundContent={
          loading ? <Spin size="small" /> : <div style={{ color: '#999' }}>No tags found</div>
        }
        style={{ width: '100%' }}
        maxTagCount="responsive"
        tagRender={(props) => {
          const tag = tags.find((t) => t.id === props.value);
          if (!tag) return <AntTag>{props.label}</AntTag>;
          return (
            <AntTag
              color={tag.color || 'blue'}
              closable={props.closable}
              onClose={props.onClose}
              style={{ marginRight: 3 }}
            >
              {tag.icon && <span>{tag.icon} </span>}
              {tag.name}
            </AntTag>
          );
        }}
      />

      {showCreateButton && (
        <div style={{ marginTop: 8 }}>
          <Button
            type="dashed"
            size="small"
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
            block
          >
            Create New Tag
          </Button>
        </div>
      )}

      <CreateTagModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handleTagCreated}
      />
    </>
  );
};

export default TagSelector;
