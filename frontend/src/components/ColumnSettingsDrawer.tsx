import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  HolderOutlined,
  SearchOutlined,
  UndoOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  VerticalLeftOutlined,
  VerticalRightOutlined,
} from '@ant-design/icons';
// Note: This component uses dynamic storageKey prop for table column configurations.
// For standard keys, see @/constants/storage.constants
// Dynamic keys like 'column-config-${tableName}' are passed as props.
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MenuProps } from 'antd';
import {
  Drawer,
  Checkbox,
  Button,
  Space,
  Typography,
  Input,
  Slider,
  Divider,
  Tooltip,
  Dropdown,
} from 'antd';

const { Text } = Typography;

export interface ColumnConfig {
  key: string;
  title: string;
  visible: boolean;
  pinned?: 'left' | 'right' | false;
  required?: boolean;
  width?: number;
  group?: string;
}

export interface ColumnPreset {
  name: string;
  description: string;
  columns: string[]; // Keys of columns to show
}

interface ColumnSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  columns: ColumnConfig[];
  onColumnsChange: (columns: ColumnConfig[]) => void;
  defaultColumns: ColumnConfig[];
  storageKey?: string;
  presets?: ColumnPreset[];
}

interface SortableItemProps {
  column: ColumnConfig;
  onToggleVisibility: (key: string) => void;
  onCyclePin: (key: string) => void;
  onWidthChange: (key: string, width: number) => void;
  onMoveUp: (key: string) => void;
  onMoveDown: (key: string) => void;
  isFirst: boolean;
  isLast: boolean;
  showWidthSlider?: boolean;
  isHiddenSection?: boolean;
}

const PinIcon = ({ pinned }: { pinned?: 'left' | 'right' | false }) => {
  if (pinned === 'left') {
    return <VerticalRightOutlined style={{ color: '#1890ff' }} />;
  }
  if (pinned === 'right') {
    return <VerticalLeftOutlined style={{ color: '#1890ff' }} />;
  }
  return <VerticalRightOutlined style={{ color: '#999' }} />;
};

const getPinTooltip = (pinned?: 'left' | 'right' | false) => {
  if (pinned === 'left') return 'Pinned left (click to pin right)';
  if (pinned === 'right') return 'Pinned right (click to unpin)';
  return 'Click to pin left';
};

const SortableItem = ({
  column,
  onToggleVisibility,
  onCyclePin,
  onWidthChange,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  showWidthSlider = false,
  isHiddenSection = false,
}: SortableItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.key });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        display: 'flex',
        flexDirection: 'column',
        padding: '10px 12px',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: isDragging ? '#fafafa' : 'white',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#999', display: 'flex', alignItems: 'center' }}
        >
          <HolderOutlined />
        </span>

        <Checkbox
          checked={column.visible}
          disabled={column.required}
          onChange={() => onToggleVisibility(column.key)}
        />

        <Text
          style={{
            flex: 1,
            color: column.visible ? 'inherit' : '#999',
          }}
        >
          {column.title}
        </Text>

        {!isHiddenSection && (
          <>
            <Space size={4}>
              <Tooltip title="Move up">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowUpOutlined />}
                  disabled={isFirst}
                  onClick={() => onMoveUp(column.key)}
                />
              </Tooltip>
              <Tooltip title="Move down">
                <Button
                  type="text"
                  size="small"
                  icon={<ArrowDownOutlined />}
                  disabled={isLast}
                  onClick={() => onMoveDown(column.key)}
                />
              </Tooltip>
            </Space>

            <Tooltip title={getPinTooltip(column.pinned)}>
              <Button
                type="text"
                size="small"
                icon={<PinIcon pinned={column.pinned} />}
                onClick={() => onCyclePin(column.key)}
              />
            </Tooltip>
          </>
        )}
      </div>

      {showWidthSlider && column.visible && !isHiddenSection && (
        <div style={{ marginTop: 8, marginLeft: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Text type="secondary" style={{ fontSize: 12, minWidth: 40 }}>
            Width:
          </Text>
          <Slider
            min={50}
            max={400}
            value={column.width || 150}
            onChange={(value) => onWidthChange(column.key, value)}
            style={{ flex: 1, margin: 0 }}
          />
          <Text type="secondary" style={{ fontSize: 12, minWidth: 40 }}>
            {column.width || 150}px
          </Text>
        </div>
      )}
    </div>
  );
};

const DragOverlayItem = ({ column }: { column: ColumnConfig }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 12px',
      backgroundColor: 'white',
      border: '1px solid #1890ff',
      borderRadius: 4,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      gap: 8,
    }}
  >
    <HolderOutlined style={{ color: '#999' }} />
    <Checkbox checked={column.visible} disabled />
    <Text>{column.title}</Text>
  </div>
);

// Default presets
const defaultPresets: ColumnPreset[] = [
  {
    name: 'Compact',
    description: 'Essential columns only',
    columns: ['name', 'status', 'action'],
  },
  {
    name: 'Detailed',
    description: 'All columns visible',
    columns: [], // Empty means all
  },
  {
    name: 'Status Focus',
    description: 'Status-related columns',
    columns: ['name', 'operationalStatus', 'status', 'operationalStatusSince', 'operationalStatusDuration', 'action'],
  },
];

export const ColumnSettingsDrawer = ({
  open,
  onClose,
  columns,
  onColumnsChange,
  defaultColumns,
  storageKey = 'columnSettings',
  presets = defaultPresets,
}: ColumnSettingsDrawerProps) => {
  const [localColumns, setLocalColumns] = useState<ColumnConfig[]>(columns);
  const [searchText, setSearchText] = useState('');
  const [history, setHistory] = useState<ColumnConfig[][]>([]);
  const [showWidthSliders, setShowWidthSliders] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect -- sync external prop to local state */
  useEffect(() => {
    setLocalColumns(columns);
    setHistory([]);
  }, [columns, open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const saveToHistory = useCallback(() => {
    setHistory((prev) => [...prev.slice(-9), localColumns]);
  }, [localColumns]);

  const handleUndo = () => {
    if (history.length > 0) {
      const previousState = history[history.length - 1];
      setLocalColumns(previousState);
      setHistory((prev) => prev.slice(0, -1));
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
      saveToHistory();
      setLocalColumns((items) => {
        const oldIndex = items.findIndex((item) => item.key === active.id);
        const newIndex = items.findIndex((item) => item.key === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleToggleVisibility = (key: string) => {
    saveToHistory();
    setLocalColumns((items) =>
      items.map((item) =>
        item.key === key ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const handleCyclePin = (key: string) => {
    saveToHistory();
    setLocalColumns((items) =>
      items.map((item) => {
        if (item.key !== key) return item;
        // Cycle: false -> 'left' -> 'right' -> false
        let newPinned: 'left' | 'right' | false;
        if (!item.pinned) {
          newPinned = 'left';
        } else if (item.pinned === 'left') {
          newPinned = 'right';
        } else {
          newPinned = false;
        }
        return { ...item, pinned: newPinned };
      })
    );
  };

  const handleWidthChange = (key: string, width: number) => {
    setLocalColumns((items) =>
      items.map((item) =>
        item.key === key ? { ...item, width } : item
      )
    );
  };

  const handleMoveUp = (key: string) => {
    saveToHistory();
    setLocalColumns((items) => {
      const index = items.findIndex((item) => item.key === key);
      if (index > 0) {
        return arrayMove(items, index, index - 1);
      }
      return items;
    });
  };

  const handleMoveDown = (key: string) => {
    saveToHistory();
    setLocalColumns((items) => {
      const index = items.findIndex((item) => item.key === key);
      if (index < items.length - 1) {
        return arrayMove(items, index, index + 1);
      }
      return items;
    });
  };

  const handleReset = () => {
    saveToHistory();
    setLocalColumns(defaultColumns);
  };

  const handleSelectAll = () => {
    saveToHistory();
    setLocalColumns((items) =>
      items.map((item) => ({ ...item, visible: true }))
    );
  };

  const handleDeselectAll = () => {
    saveToHistory();
    setLocalColumns((items) =>
      items.map((item) =>
        item.required ? item : { ...item, visible: false }
      )
    );
  };

  const handleUnpinAll = () => {
    saveToHistory();
    setLocalColumns((items) =>
      items.map((item) => ({ ...item, pinned: false }))
    );
  };

  const handleApplyPreset = (preset: ColumnPreset) => {
    saveToHistory();
    if (preset.columns.length === 0) {
      // "Detailed" - show all
      setLocalColumns((items) =>
        items.map((item) => ({ ...item, visible: true }))
      );
    } else {
      setLocalColumns((items) =>
        items.map((item) => ({
          ...item,
          visible: preset.columns.includes(item.key) || !!item.required,
        }))
      );
    }
  };

  const handleApply = () => {
    // Save to localStorage
    if (storageKey) {
      localStorage.setItem(storageKey, JSON.stringify(localColumns));
    }
    onColumnsChange(localColumns);
    onClose();
  };

  // Filter columns by search
  const filteredColumns = useMemo(() => {
    if (!searchText) return localColumns;
    return localColumns.filter((col) =>
      col.title.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [localColumns, searchText]);

  // Separate columns into sections
  const pinnedLeftColumns = useMemo(
    () => filteredColumns.filter((col) => col.pinned === 'left' && col.visible),
    [filteredColumns]
  );

  const pinnedRightColumns = useMemo(
    () => filteredColumns.filter((col) => col.pinned === 'right' && col.visible),
    [filteredColumns]
  );

  const visibleColumns = useMemo(
    () => filteredColumns.filter((col) => col.visible && !col.pinned),
    [filteredColumns]
  );

  const hiddenColumns = useMemo(
    () => filteredColumns.filter((col) => !col.visible),
    [filteredColumns]
  );

  const activeColumn = activeId
    ? localColumns.find((col) => col.key === activeId)
    : null;

  const visibleCount = localColumns.filter((col) => col.visible).length;
  const pinnedCount = localColumns.filter((col) => col.pinned).length;
  const totalCount = localColumns.length;

  const presetMenuItems: MenuProps['items'] = presets.map((preset) => ({
    key: preset.name,
    label: (
      <div>
        <div style={{ fontWeight: 500 }}>{preset.name}</div>
        <div style={{ fontSize: 12, color: '#999' }}>{preset.description}</div>
      </div>
    ),
    onClick: () => handleApplyPreset(preset),
  }));

  const renderSection = (
    title: string,
    sectionColumns: ColumnConfig[],
    isHiddenSection = false
  ) => {
    if (sectionColumns.length === 0) return null;

    return (
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            padding: '8px 12px',
            backgroundColor: '#fafafa',
            borderRadius: '4px 4px 0 0',
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <Text strong style={{ fontSize: 12, textTransform: 'uppercase', color: '#666' }}>
            {title} ({sectionColumns.length})
          </Text>
        </div>
        <div style={{ border: '1px solid #f0f0f0', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
          <SortableContext
            items={sectionColumns.map((col) => col.key)}
            strategy={verticalListSortingStrategy}
          >
            {sectionColumns.map((column, index) => (
              <SortableItem
                key={column.key}
                column={column}
                onToggleVisibility={handleToggleVisibility}
                onCyclePin={handleCyclePin}
                onWidthChange={handleWidthChange}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
                isFirst={index === 0}
                isLast={index === sectionColumns.length - 1}
                showWidthSlider={showWidthSliders}
                isHiddenSection={isHiddenSection}
              />
            ))}
          </SortableContext>
        </div>
      </div>
    );
  };

  return (
    <Drawer
      title="Column Settings"
      placement="right"
      styles={{ wrapper: { width: 420 } }}
      open={open}
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>
            <Button onClick={handleReset}>Reset</Button>
            <Tooltip title={history.length === 0 ? 'No changes to undo' : 'Undo last change'}>
              <Button
                icon={<UndoOutlined />}
                onClick={handleUndo}
                disabled={history.length === 0}
              />
            </Tooltip>
          </Space>
          <Space>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="primary" onClick={handleApply}>
              Apply
            </Button>
          </Space>
        </div>
      }
    >
      {/* Search */}
      <Input
        placeholder="Search columns..."
        prefix={<SearchOutlined />}
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{ marginBottom: 12 }}
        allowClear
      />

      {/* Stats and Quick Actions */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            {visibleCount} visible, {pinnedCount} pinned, {totalCount - visibleCount} hidden
          </Text>
          <Dropdown menu={{ items: presetMenuItems }} trigger={['click']}>
            <Button size="small">Presets</Button>
          </Dropdown>
        </div>
        <Space wrap size={[4, 4]}>
          <Button size="small" type="link" onClick={handleSelectAll} style={{ padding: '0 4px' }}>
            Select All
          </Button>
          <Button size="small" type="link" onClick={handleDeselectAll} style={{ padding: '0 4px' }}>
            Deselect All
          </Button>
          <Button size="small" type="link" onClick={handleUnpinAll} style={{ padding: '0 4px' }}>
            Unpin All
          </Button>
          <Button
            size="small"
            type="link"
            onClick={() => setShowWidthSliders(!showWidthSliders)}
            style={{ padding: '0 4px' }}
          >
            {showWidthSliders ? 'Hide Widths' : 'Adjust Widths'}
          </Button>
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Instructions */}
      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
        Drag to reorder. Use arrows or keyboard. Click pin icon to cycle: left → right → unpinned.
      </Text>

      {/* Column Sections */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        {renderSection('Pinned Left', pinnedLeftColumns)}
        {renderSection('Pinned Right', pinnedRightColumns)}
        {renderSection('Visible Columns', visibleColumns)}
        {renderSection('Hidden Columns', hiddenColumns, true)}

        <DragOverlay>
          {activeColumn ? <DragOverlayItem column={activeColumn} /> : null}
        </DragOverlay>
      </DndContext>

      {filteredColumns.length === 0 && searchText && (
        <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
          No columns match "{searchText}"
        </div>
      )}
    </Drawer>
  );
};

// Helper hook for loading saved column config
// eslint-disable-next-line react-refresh/only-export-components
export const useColumnConfig = (
  defaultColumns: ColumnConfig[],
  storageKey: string
): [ColumnConfig[], (columns: ColumnConfig[]) => void] => {
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as ColumnConfig[];
        // Merge with defaults to handle new columns
        const mergedColumns = defaultColumns.map((defaultCol) => {
          const savedCol = parsed.find((c) => c.key === defaultCol.key);
          return savedCol ? { ...defaultCol, ...savedCol } : defaultCol;
        });
        // Add any saved columns that might have been removed from defaults
        return mergedColumns;
      } catch {
        return defaultColumns;
      }
    }
    return defaultColumns;
  });

  const handleColumnsChange = (columns: ColumnConfig[]) => {
    setColumnConfig(columns);
    localStorage.setItem(storageKey, JSON.stringify(columns));
  };

  return [columnConfig, handleColumnsChange];
};
