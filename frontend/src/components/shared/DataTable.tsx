import { useMemo } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Table, Input, Empty } from 'antd';
import type { ColumnType, TableProps } from 'antd/es/table';
import type { ExpandableConfig, TableRowSelection } from 'antd/es/table/interface';
import { useDebouncedSearch } from '../../hooks/useDebouncedSearch';

export interface DataTableColumn<T> extends ColumnType<T> {
  hideable?: boolean;
  defaultHidden?: boolean;
  sortKey?: string;
}

export interface DataTablePagination {
  current?: number;
  pageSize?: number;
  total?: number;
  onChange?: (page: number, pageSize: number) => void;
  showSizeChanger?: boolean;
  showTotal?: (total: number, range: [number, number]) => React.ReactNode;
  pageSizeOptions?: string[] | number[];
  showQuickJumper?: boolean;
  size?: 'default' | 'small';
}

export interface DataTableProps<T = any> {
  data: T[] | undefined;
  loading?: boolean;
  columns: DataTableColumn<T>[];

  pagination?: DataTablePagination | false;

  sortable?: boolean;
  defaultSort?: { field: string; order: 'asc' | 'desc' };
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;

  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (value: string) => void;
  searchValue?: string;
  filterBar?: React.ReactNode;

  selectable?: boolean;
  selectedRowKeys?: React.Key[];
  onSelectionChange?: (keys: React.Key[], rows: T[]) => void;
  rowSelection?: TableRowSelection<T>;

  toolbar?: React.ReactNode;
  rowActions?: (record: T) => React.ReactNode;

  columnSettingsEnabled?: boolean;
  tableId?: string;

  scroll?: { x?: number | string; y?: number | string };
  size?: 'small' | 'middle' | 'large';
  rowKey?: string | ((record: T) => string);
  expandable?: ExpandableConfig<T>;
  onRow?: (record: T, index?: number) => React.HTMLAttributes<HTMLElement>;
  onRowClick?: (record: T) => void;
  style?: React.CSSProperties;
  className?: string;
  bordered?: boolean;
  showHeader?: boolean;
  footer?: TableProps<T>['footer'];
  title?: TableProps<T>['title'];
  summary?: TableProps<T>['summary'];
  components?: TableProps<T>['components'];
  locale?: TableProps<T>['locale'];
  onChange?: TableProps<T>['onChange'];
  rowClassName?: string | ((record: T, index: number) => string);
  sticky?: boolean | { offsetHeader?: number };
}

export function DataTable<T = any>({
  data,
  loading = false,
  columns,
  pagination,
  searchable = false,
  searchPlaceholder = 'Search...',
  onSearch,
  searchValue,
  filterBar,
  selectable = false,
  selectedRowKeys,
  onSelectionChange,
  rowSelection: customRowSelection,
  toolbar,
  rowActions,
  scroll,
  size,
  rowKey = 'id',
  expandable,
  onRow,
  onRowClick,
  style,
  className,
  bordered,
  showHeader,
  footer,
  title,
  summary,
  components,
  locale,
  onChange,
  rowClassName,
  sticky,
}: DataTableProps<T>) {
  const search = useDebouncedSearch();

  const isControlledSearch = searchValue !== undefined;
  const displaySearchValue = isControlledSearch ? searchValue : search.value;

  const handleSearchChange = (value: string) => {
    if (!isControlledSearch) {
      search.setValue(value);
    }
    onSearch?.(value);
  };

  const visibleColumns = useMemo(() => {
    let cols = columns.filter((col) => !col.defaultHidden);

    if (rowActions) {
      cols = [
        ...cols,
        {
          title: '',
          key: '__actions',
          width: 50,
          align: 'right' as const,
          render: (_: unknown, record: T) => rowActions(record),
        },
      ];
    }

    return cols;
  }, [columns, rowActions]);

  const baseRowSelection = customRowSelection || (selectable
    ? {
        selectedRowKeys: selectedRowKeys || [],
        onChange: (keys: React.Key[], rows: T[]) => {
          onSelectionChange?.(keys, rows);
        },
      }
    : undefined);

  const rowSelection = baseRowSelection
    ? { ...baseRowSelection, columnWidth: 32 }
    : undefined;

  const tablePagination =
    pagination === false
      ? false
      : pagination
        ? {
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '30', '50', '100'],
            showTotal: (total: number, range: [number, number]) =>
              `showing ${range[0]}-${range[1]} of ${total} items`,
            ...pagination,
          }
        : undefined;

  const hasToolbarArea = searchable || filterBar || toolbar;

  return (
    <div className={className} style={style}>
      {hasToolbarArea && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          {searchable && (
            <Input
              placeholder={searchPlaceholder}
              prefix={<SearchOutlined />}
              style={{ maxWidth: 320 }}
              value={displaySearchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              allowClear
              onClear={() => {
                if (!isControlledSearch) {
                  search.clear();
                }
                onSearch?.('');
              }}
            />
          )}
          {filterBar}
          {toolbar && (
            <div style={{ marginLeft: 'auto' }}>
              {toolbar}
            </div>
          )}
        </div>
      )}

      <Table<T>
        columns={visibleColumns}
        dataSource={data}
        loading={loading}
        rowKey={rowKey}
        rowSelection={rowSelection}
        pagination={tablePagination}
        scroll={scroll ?? { x: 'max-content' }}
        size={size}
        expandable={expandable}
        onRow={(record, index) => {
          const customProps = onRow?.(record, index) || {};
          return {
            ...customProps,
            tabIndex: 0,
            onClick: (e) => {
              customProps.onClick?.(e);
              onRowClick?.(record);
            },
            onKeyDown: (e) => {
              customProps.onKeyDown?.(e);
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onRowClick?.(record);
              }
            },
            style: {
              ...customProps.style,
              cursor: onRowClick ? 'pointer' : customProps.style?.cursor,
            },
          };
        }}
        bordered={bordered}
        showHeader={showHeader}
        footer={footer}
        title={title}
        summary={summary}
        components={components}
        onChange={onChange}
        rowClassName={rowClassName}
        sticky={sticky}
        locale={
          locale ?? {
            emptyText: <Empty description="No data found" />,
          }
        }
      />
    </div>
  );
}
