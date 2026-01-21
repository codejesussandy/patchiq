import React from 'react';
import { Select, Tag as AntTag, Space, Spin, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { Tag as TagType } from '../../../types/asset.types';
import { tagService } from '../../../services/tag.service';
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
  const [tags, setTags] = React.useState<TagType[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [modalVisible, setModalVisible] = React.useState(false);

  // Fetch all tags on mount
  React.useEffect(() => {
    fetchTags();
  }, []);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const allTags = await tagService.getTags();
      // Ensure tags is always an array to prevent .map() errors
      setTags(Array.isArray(allTags) ? allTags : []);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      setTags([]); // Reset to empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchValue: string) => {
    if (searchValue.trim().length === 0) {
      await fetchTags();
      return;
    }

    try {
      const results = await tagService.searchTags(searchValue);
      // Ensure results is always an array
      setTags(Array.isArray(results) ? results : []);
    } catch (error) {
      console.error('Failed to search tags:', error);
      setTags([]); // Reset to empty array on error
    }
  };

  const handleTagCreated = async (newTag: TagType) => {
    setTags([...tags, newTag]);
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
          <span style={{ fontSize: '12px', color: '#666' }}>({tag.description})</span>
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
