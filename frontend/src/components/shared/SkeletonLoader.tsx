import { Card, Skeleton, Space } from 'antd';

/**
 * Table skeleton loader
 */
export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => {
  return (
    <div>
      {Array.from({ length: rows }).map((_, index) => (
        <Card key={index} style={{ marginBottom: 8 }} bodyStyle={{ padding: 16 }}>
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
      ))}
    </div>
  );
};

/**
 * Card skeleton loader
 */
export const CardSkeleton = ({ count = 1 }: { count?: number }) => {
  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {Array.from({ length: count }).map((_, index) => (
        <Card key={index}>
          <Skeleton active />
        </Card>
      ))}
    </Space>
  );
};

/**
 * List skeleton loader
 */
export const ListSkeleton = ({ items = 5 }: { items?: number }) => {
  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      {Array.from({ length: items }).map((_, index) => (
        <Skeleton key={index} active avatar paragraph={{ rows: 1 }} />
      ))}
    </Space>
  );
};

/**
 * Detail page skeleton loader
 */
export const DetailSkeleton = () => {
  return (
    <div>
      <Skeleton active title paragraph={{ rows: 2 }} style={{ marginBottom: 24 }} />
      <Card style={{ marginBottom: 16 }}>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
      <Card>
        <Skeleton active paragraph={{ rows: 4 }} />
      </Card>
    </div>
  );
};

/**
 * Dashboard skeleton loader
 */
export const DashboardSkeleton = () => {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index}>
            <Skeleton active paragraph={{ rows: 1 }} />
          </Card>
        ))}
      </div>
      <Card>
        <Skeleton active paragraph={{ rows: 6 }} />
      </Card>
    </div>
  );
};
