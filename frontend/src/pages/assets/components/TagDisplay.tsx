import React, { useMemo } from 'react';
import { Tag as AntTag, Tooltip, Space } from 'antd';
import type { Tag as TagType } from '../../../types/asset.types';
import { tagService } from '../../../services/tag.service';

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
  const [tags, setTags] = React.useState<Record<string, TagType>>({});
  const [loading, setLoading] = React.useState(false);

  // Fetch tag details on mount or when tagIds change
  React.useEffect(() => {
    if (tagIds.length === 0) {
      setTags({});
      return;
    }

    setLoading(true);
    tagService
      .getTags()
      .then((allTags) => {
        const tagMap: Record<string, TagType> = {};
        allTags.forEach((tag) => {
          tagMap[tag.id] = tag;
        });
        setTags(tagMap);
      })
      .catch(() => {
        // Tags will remain empty on error
      })
      .finally(() => setLoading(false));
  }, [tagIds]);

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
              fontSize: size === 'small' ? '11px' : size === 'large' ? '14px' : '12px',
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
