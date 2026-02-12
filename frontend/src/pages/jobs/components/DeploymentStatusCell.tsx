export function DeploymentStatusCell({
  current,
  total,
  backgroundColor,
}: {
  current: number;
  total: number;
  backgroundColor: string;
}) {
  return (
    <div
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        backgroundColor,
        textAlign: 'center',
        minWidth: 50,
      }}
    >
      {current}/{total}
    </div>
  );
}
