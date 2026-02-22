import { useRef, useEffect, useState, useCallback } from 'react';
import { Spin, Typography, Empty } from 'antd';
import {
  LaptopOutlined,
  BugOutlined,
  ToolOutlined,
  SearchOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { SeverityBadge } from '../patches';

const { Text } = Typography;

interface GlobalSearchModalProps {
  open: boolean;
  onClose: () => void;
}

interface SearchResultItem {
  id: string;
  type: 'asset' | 'patch' | 'vulnerability';
  title: string;
  subtitle: string;
  path: string;
  severity?: string;
}

const CATEGORY_CONFIG = {
  asset: { icon: <LaptopOutlined />, label: 'Assets', color: '#1677ff', bg: '#e6f4ff' },
  patch: { icon: <ToolOutlined />, label: 'Patches', color: '#52c41a', bg: '#f6ffed' },
  vulnerability: { icon: <BugOutlined />, label: 'Vulnerabilities', color: '#ff4d4f', bg: '#fff2f0' },
} as const;

export const GlobalSearchModal = ({ open, onClose }: GlobalSearchModalProps) => {
  const navigate = useNavigate();
  const search = useDebouncedSearch({ delay: 300 });
  const { assets, patches, vulnerabilities, isLoading, totalResults } = useGlobalSearch(search.debouncedValue);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Build flat list
  const allItems: SearchResultItem[] = [];
  assets.forEach((a) =>
    allItems.push({
      id: a.id,
      type: 'asset',
      title: a.name,
      subtitle: [a.ipAddress, a.osType].filter(Boolean).join(' \u00b7 '),
      path: `/assets/${a.id}`,
    }),
  );
  patches.forEach((p) =>
    allItems.push({
      id: p.id,
      type: 'patch',
      title: p.title || p.software,
      subtitle: [p.patchId, p.kbNumber].filter(Boolean).join(' \u00b7 '),
      path: `/patches/${p.id}`,
      severity: p.severity,
    }),
  );
  vulnerabilities.forEach((v) =>
    allItems.push({
      id: v.id,
      type: 'vulnerability',
      title: v.cve,
      subtitle: v.title || v.description?.slice(0, 80) || '',
      path: `/vulnerability/${v.id}`,
      severity: v.severity,
    }),
  );

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      navigate(item.path);
      onClose();
    },
    [navigate, onClose],
  );

  // Focus input on open
  useEffect(() => {
    if (open) {
      search.clear();
      setActiveIndex(-1);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (allItems.length === 0) return;
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < allItems.length - 1 ? prev + 1 : 0;
          scrollToItem(next);
          return next;
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : allItems.length - 1;
          scrollToItem(next);
          return next;
        });
      } else if (e.key === 'Enter' && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(allItems[activeIndex]);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, allItems, activeIndex, handleSelect, onClose]);

  useEffect(() => {
    setActiveIndex(-1);
  }, [search.debouncedValue]);

  const scrollToItem = (index: number) => {
    const container = resultsRef.current;
    if (!container) return;
    const items = container.querySelectorAll('[data-search-item]');
    items[index]?.scrollIntoView({ block: 'nearest' });
  };

  if (!open) return null;

  // Build sections
  const sections: { type: 'asset' | 'patch' | 'vulnerability'; startIndex: number; items: SearchResultItem[] }[] = [];
  let idx = 0;
  if (assets.length > 0) {
    sections.push({ type: 'asset', startIndex: idx, items: allItems.slice(idx, idx + assets.length) });
    idx += assets.length;
  }
  if (patches.length > 0) {
    sections.push({ type: 'patch', startIndex: idx, items: allItems.slice(idx, idx + patches.length) });
    idx += patches.length;
  }
  if (vulnerabilities.length > 0) {
    sections.push({ type: 'vulnerability', startIndex: idx, items: allItems.slice(idx, idx + vulnerabilities.length) });
  }

  const hasQuery = search.debouncedValue.length >= 2;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: 80,
        background: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 560,
          background: '#fff',
          borderRadius: 12,
          boxShadow: '0 24px 48px rgba(0, 0, 0, 0.16), 0 8px 16px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
          animation: 'searchModalIn 0.15s ease-out',
        }}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <SearchOutlined style={{ fontSize: 20, color: '#bfbfbf', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search assets, patches, vulnerabilities..."
            value={search.value}
            onChange={(e) => search.setValue(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 16,
              color: '#262626',
              background: 'transparent',
              lineHeight: '24px',
            }}
          />
          {isLoading && <Spin size="small" />}
          {search.value && !isLoading && (
            <div
              onClick={() => search.clear()}
              style={{
                cursor: 'pointer',
                fontSize: 12,
                color: '#8c8c8c',
                padding: '2px 6px',
                borderRadius: 4,
                border: '1px solid #d9d9d9',
                lineHeight: '16px',
                userSelect: 'none',
              }}
            >
              Clear
            </div>
          )}
        </div>

        {/* Results */}
        <div
          ref={resultsRef}
          style={{
            maxHeight: 400,
            overflowY: 'auto',
          }}
        >
          {!hasQuery && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <SearchOutlined style={{ fontSize: 32, color: '#d9d9d9', marginBottom: 12 }} />
              <div style={{ color: '#8c8c8c', fontSize: 14 }}>
                Type at least 2 characters to search
              </div>
              <div style={{ color: '#bfbfbf', fontSize: 12, marginTop: 4 }}>
                Search across assets, patches, and vulnerabilities
              </div>
            </div>
          )}

          {hasQuery && !isLoading && totalResults === 0 && (
            <div style={{ padding: '32px 20px', textAlign: 'center' }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span style={{ color: '#8c8c8c' }}>
                    No results for "<strong>{search.debouncedValue}</strong>"
                  </span>
                }
              />
            </div>
          )}

          {sections.map((section) => {
            const config = CATEGORY_CONFIG[section.type];
            return (
              <div key={section.type}>
                <div
                  style={{
                    padding: '8px 20px 4px',
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#8c8c8c',
                    textTransform: 'uppercase',
                    letterSpacing: 0.8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    marginTop: 4,
                  }}
                >
                  <span style={{ color: config.color }}>{config.icon}</span>
                  {config.label}
                  <span style={{ fontWeight: 400, fontSize: 11 }}>({section.items.length})</span>
                </div>
                {section.items.map((item, i) => {
                  const itemIndex = section.startIndex + i;
                  const isActive = itemIndex === activeIndex;
                  const itemConfig = CATEGORY_CONFIG[item.type];
                  return (
                    <div
                      key={item.id}
                      data-search-item
                      role="option"
                      aria-selected={isActive}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '10px 20px',
                        cursor: 'pointer',
                        background: isActive ? '#f5f5f5' : 'transparent',
                        transition: 'background 0.1s',
                        borderLeft: isActive ? `3px solid ${itemConfig.color}` : '3px solid transparent',
                      }}
                      onMouseEnter={() => setActiveIndex(itemIndex)}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelect(item);
                      }}
                    >
                      {/* Icon */}
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: itemConfig.bg,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 16,
                          color: itemConfig.color,
                          flexShrink: 0,
                        }}
                      >
                        {itemConfig.icon}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Text strong style={{ fontSize: 13, lineHeight: '20px' }} ellipsis>
                            {item.title}
                          </Text>
                          {item.severity && <SeverityBadge severity={item.severity} showIcon={false} />}
                        </div>
                        {item.subtitle && (
                          <Text type="secondary" style={{ fontSize: 12, lineHeight: '18px' }} ellipsis>
                            {item.subtitle}
                          </Text>
                        )}
                      </div>

                      {/* Arrow on active */}
                      {isActive && (
                        <RightOutlined style={{ fontSize: 10, color: '#bfbfbf', flexShrink: 0 }} />
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer with keyboard hints */}
        <div
          style={{
            padding: '8px 20px',
            borderTop: '1px solid #f0f0f0',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            background: '#fafafa',
          }}
        >
          {[
            { keys: '\u2191\u2193', label: 'navigate' },
            { keys: '\u21b5', label: 'open' },
            { keys: 'esc', label: 'close' },
            { keys: 'Ctrl+K', label: 'toggle' },
          ].map(({ keys, label }) => (
            <div key={keys} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8c8c8c' }}>
              <span
                style={{
                  padding: '1px 5px',
                  borderRadius: 4,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  fontSize: 10,
                  fontFamily: 'monospace',
                  lineHeight: '16px',
                }}
              >
                {keys}
              </span>
              {label}
            </div>
          ))}
          {hasQuery && totalResults > 0 && (
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#8c8c8c' }}>
              {totalResults} result{totalResults !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes searchModalIn {
          from {
            opacity: 0;
            transform: scale(0.96) translateY(-8px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }
      `}</style>
    </div>
  );
};
