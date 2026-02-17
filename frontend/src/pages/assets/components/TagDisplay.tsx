import React, { useMemo } from 'react';
import { Tag as AntTag, Tooltip, Space } from 'antd';
import { useTags } from '../../../hooks/useAssets';
import type { Tag as TagType } from '../../../types/asset.types';

interface TagDisplayProps {
  tagIds: string[];
  maxVisible?: number;
  size?: 'small' | 'default' | 'large';
  clickable?: boolean;
  onTagClick?: (tagId: string) => void;
}

const TagDisplay: React.FC<TagDisplayProps> = ({
  tagIds = [],
  maxVisible = 3,
  size = 'default',
  clickable = false,
  onTagClick,
}) => {
  const { data: allTags, isLoading: loading } = useTags();

  const tags: Record<string, TagType> = useMemo(() => {
    if (!allTags || tagIds.length === 0) return {};
    const tagMap: Record<string, TagType> = {};
    allTags.forEach((tag: TagType) => {
      tagMap[tag.id] = tag;
    });
    return tagMap;
  }, [allTags, tagIds]);

  // Memoize visible and hidden tags
  const { visibleTagIds, hiddenCount } = useMemo(() => {
    const visible = tagIds.slice(0, maxVisible);
    const hidden = Math.max(0, tagIds.length - maxVisible);
    return {
      visibleTagIds: visible,
      hiddenCount: hidden,
    };
  }, [tagIds, maxVisible]);

  if (loading) {
    return <span>Loading...</span>;
  }

  if (tagIds.length === 0) {
    return <span style={{ color: '#999' }}>No tags</span>;
  }

  return (
    <Space size="small" wrap>
      {visibleTagIds.map((tagId) => {
        const tag = tags[tagId];
        if (!tag) return null;

        const tagElement = (
          <AntTag
            key={tagId}
            color={tag.color || 'blue'}
            style={{
              cursor: clickable ? 'pointer' : 'default',
              fontSize: size === 'small' ? '11px' : size === 'large' ? '14px' : '16px',
              padding: size === 'small' ? '2px 6px' : size === 'large' ? '6px 12px' : '4px 8px',
            }}
            onClick={() => {
              if (clickable && onTagClick) {
                onTagClick(tagId);
              }
            }}
          >
            {tag.icon && <span>{tag.icon} </span>}
            {tag.name}
          </AntTag>
        );

        if (tag.description) {
          return (
            <Tooltip key={tagId} title={tag.description}>
              {tagElement}
            </Tooltip>
          );
        }
        return tagElement;
      })}

      {hiddenCount > 0 && (
        <Tooltip
          title={
            <div>
              {tagIds.slice(maxVisible).map((tagId) => {
                const tag = tags[tagId];
                return tag ? (
                  <div key={tagId}>
                    <strong>{tag.name}</strong>
                    {tag.description && <div style={{ fontSize: '11px' }}>{tag.description}</div>}
                  </div>
                ) : null;
              })}
            </div>
          }
        >
          <AntTag style={{ cursor: 'default' }}>+{hiddenCount} more</AntTag>
        </Tooltip>
      )}
    </Space>
  );
};

export default TagDisplay;
