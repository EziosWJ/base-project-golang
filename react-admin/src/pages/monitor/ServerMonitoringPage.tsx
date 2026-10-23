import { useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { RefreshCw } from 'lucide-react';
import { Line } from '@ant-design/charts';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { formatBytes, formatDateTime, formatDuration } from '../../utils/format';
import { getMonitorHistory, getMonitorSnapshot } from '../../features/monitoring/api';
import type { MonitorResource, Region } from '../../types/monitoring';

const RESOURCE_OPTIONS: Array<{ value: MonitorResource; label: string }> = [
  { value: 'cpu', label: 'CPU' },
  { value: 'memory', label: '内存' },
  { value: 'filesystem', label: '文件系统' },
  { value: 'disk', label: '磁盘 I/O' },
  { value: 'network', label: '网络' },
  { value: 'gpu', label: 'GPU' },
];

function regionBadge(region: Region<unknown>) {
  const color =
    region.status === 'ok' ? 'success' : region.status === 'stale' ? 'warning' : 'default';
  const label =
    region.status === 'ok'
      ? '正常'
      : region.status === 'stale'
        ? '数据过期'
        : region.status === 'collecting'
          ? '采集中'
          : region.status;
  return <Tag color={color}>{label}</Tag>;
}

function RegionHint({ region }: { region: Region<unknown> }) {
  if (region.status === 'ok' && !region.partial) return null;
  return (
    <Alert
      style={{ marginBottom: 12 }}
      type={region.status === 'error' ? 'error' : 'warning'}
      showIcon
      title={region.message || `采集状态：${region.status}`}
    />
  );
}

export default function ServerMonitoringPage() {
  const [resource, setResource] = useState<MonitorResource>('cpu');
  const [device, setDevice] = useState('');

  const snapshot = useQuery({
    queryKey: queryKeys.monitoring.snapshot(),
    queryFn: () => getMonitorSnapshot(),
    refetchInterval: 15_000,
  });

  const devices = useMemo(() => {
    const data = snapshot.data;
    if (!data) return [{ value: '', label: '总体' }];
    if (resource === 'filesystem') {
      return (data.filesystems.data ?? []).map((item) => ({
        value: item.id,
        label: item.mountpoint,
      }));
    }
    if (resource === 'disk') {
      return (data.disks.data ?? []).map((item) => ({ value: item.id, label: item.id }));
    }
    if (resource === 'network') {
      return (data.network.data ?? []).map((item) => ({ value: item.id, label: item.id }));
    }
    if (resource === 'gpu') {
      return (data.gpu.data ?? []).map((item) => ({
        value: item.id,
        label: item.name || item.id,
      }));
    }
    return [{ value: '', label: '总体' }];
  }, [snapshot.data, resource]);

  const activeDevice = devices.some((item) => item.value === device)
    ? device
    : (devices[0]?.value ?? '');

  const history = useQuery({
    queryKey: queryKeys.monitoring.history(resource, activeDevice),
    queryFn: ({ signal }) => getMonitorHistory(resource, activeDevice, signal),
    enabled: snapshot.isSuccess,
  });

  const chartData = useMemo(() => {
    const points = history.data?.points ?? [];
    const rows: Array<{ time: string; metric: string; value: number }> = [];
    for (const point of points) {
      for (const [metric, value] of Object.entries(point.values)) {
        if (value === null || value === undefined) continue;
        rows.push({
          time: formatDateTime(point.collectedAt),
          metric,
          value: Number(value.toFixed(2)),
        });
      }
    }
    return rows;
  }, [history.data]);

  const host = snapshot.data?.host;
  const cpu = snapshot.data?.cpu;
  const memory = snapshot.data?.memory;

  if (snapshot.isLoading) {
    return (
      <Card>
        <Typography.Text type="secondary">正在加载服务器监控数据…</Typography.Text>
      </Card>
    );
  }

  if (snapshot.error) {
    return (
      <Card>
        <Alert
          type="error"
          showIcon
          title="监控数据加载失败"
          description={getErrorMessage(snapshot.error)}
          action={
            <Button size="small" onClick={() => void snapshot.refetch()}>
              重试
            </Button>
          }
        />
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="服务器监控"
        description="通过 Go 采集器读取主机资源快照与短期历史。数据受监控配置与采集器运行状态影响。"
        meta={
          snapshot.data && (
            <Space size={8} wrap>
              <Tag color="processing">{snapshot.data.sourceId}</Tag>
              <Typography.Text type="secondary">
                采样时间 {formatDateTime(snapshot.data.sampledAt)}
              </Typography.Text>
            </Space>
          )
        }
        extra={
          <Button
            icon={<RefreshCw size={16} />}
            loading={snapshot.isFetching}
            onClick={() => {
              void snapshot.refetch();
              void history.refetch();
            }}
          >
            刷新
          </Button>
        }
      />

      {snapshot.data && snapshot.data.warnings.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          title={`${snapshot.data.warnings.length} 项采集告警`}
          description={snapshot.data.warnings
            .map((warning) => `${warning.resource}/${warning.device}：${warning.message}`)
            .join('；')}
        />
      )}

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} xl={6}>
          <Card title="主机" extra={host ? regionBadge(host) : null}>
            {host?.data ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="主机名">{host.data.hostname}</Descriptions.Item>
                <Descriptions.Item label="系统">{host.data.os}</Descriptions.Item>
                <Descriptions.Item label="内核">{host.data.kernel}</Descriptions.Item>
                <Descriptions.Item label="运行时长">
                  {formatDuration(host.data.uptimeSeconds)}
                </Descriptions.Item>
              </Descriptions>
            ) : (
              <Typography.Text type="secondary">{host?.message || '暂无数据'}</Typography.Text>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card title="CPU" extra={cpu ? regionBadge(cpu) : null}>
            {cpu?.data ? (
              <>
                <Statistic
                  title="使用率"
                  value={cpu.data.usagePercent ?? 0}
                  precision={1}
                  suffix="%"
                />
                <Progress percent={Math.round(cpu.data.usagePercent ?? 0)} showInfo={false} />
                <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                  <Descriptions.Item label="型号">{cpu.data.model || '—'}</Descriptions.Item>
                  <Descriptions.Item label="核心">
                    {cpu.data.logicalCores} 逻辑 / {cpu.data.physicalCores} 物理
                  </Descriptions.Item>
                  <Descriptions.Item label="负载">
                    {[cpu.data.load1, cpu.data.load5, cpu.data.load15]
                      .map((value) => (value === null ? '—' : value.toFixed(2)))
                      .join(' / ')}
                  </Descriptions.Item>
                </Descriptions>
              </>
            ) : (
              <Typography.Text type="secondary">{cpu?.message || '暂无数据'}</Typography.Text>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card title="内存" extra={memory ? regionBadge(memory) : null}>
            {memory?.data ? (
              <>
                <Statistic
                  title="使用率"
                  value={memory.data.usagePercent}
                  precision={1}
                  suffix="%"
                />
                <Progress percent={Math.round(memory.data.usagePercent)} showInfo={false} />
                <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
                  <Descriptions.Item label="已用">{formatBytes(memory.data.usedBytes)}</Descriptions.Item>
                  <Descriptions.Item label="总量">{formatBytes(memory.data.totalBytes)}</Descriptions.Item>
                  <Descriptions.Item label="交换分区">
                    {memory.data.swapUnsupported
                      ? '不支持'
                      : `${formatBytes(memory.data.swapUsedBytes)} / ${formatBytes(memory.data.swapTotalBytes)}`}
                  </Descriptions.Item>
                </Descriptions>
              </>
            ) : (
              <Typography.Text type="secondary">{memory?.message || '暂无数据'}</Typography.Text>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12} xl={6}>
          <Card title="进程 Top" extra={snapshot.data ? regionBadge(snapshot.data.processes) : null}>
            {snapshot.data?.processes.data ? (
              <Table
                size="small"
                rowKey="pid"
                pagination={false}
                dataSource={snapshot.data.processes.data.cpu.slice(0, 5)}
                columns={[
                  { title: '进程', dataIndex: 'name', ellipsis: true },
                  { title: 'PID', dataIndex: 'pid', width: 70 },
                  {
                    title: 'CPU',
                    dataIndex: 'cpuPercent',
                    width: 70,
                    render: (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`),
                  },
                ]}
              />
            ) : (
              <Typography.Text type="secondary">
                {snapshot.data?.processes.message || '暂无数据'}
              </Typography.Text>
            )}
          </Card>
        </Col>
      </Row>

      <Card title="资源趋势" style={{ marginTop: 16 }}>
        <Space wrap style={{ marginBottom: 16 }}>
          <Select
            value={resource}
            style={{ width: 140 }}
            options={RESOURCE_OPTIONS}
            onChange={(value: MonitorResource) => {
              setResource(value);
              setDevice('');
            }}
          />
          <Select
            value={activeDevice}
            style={{ width: 200 }}
            options={devices}
            onChange={setDevice}
          />
          <Typography.Text type="secondary">
            {history.data ? `窗口 ${history.data.windowSeconds} 秒 · ${chartData.length} 个数据点` : ''}
          </Typography.Text>
        </Space>
        {history.isLoading ? (
          <Typography.Text type="secondary">加载趋势数据…</Typography.Text>
        ) : history.error ? (
          <Alert type="error" showIcon title={getErrorMessage(history.error)} />
        ) : chartData.length === 0 ? (
          <Typography.Text type="secondary">当前资源暂时没有可用的历史数据。</Typography.Text>
        ) : (
          <Line
            data={chartData}
            xField="time"
            yField="value"
            colorField="metric"
            height={300}
            axis={{ x: { title: false }, y: { title: false } }}
            legend={{ color: { position: 'top' } }}
          />
        )}
      </Card>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={12}>
          <Card title="文件系统" extra={snapshot.data ? regionBadge(snapshot.data.filesystems) : null}>
            {snapshot.data && <RegionHint region={snapshot.data.filesystems} />}
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={snapshot.data?.filesystems.data ?? []}
              locale={{ emptyText: snapshot.data?.filesystems.message || '暂无数据' }}
              columns={[
                { title: '挂载点', dataIndex: 'mountpoint', ellipsis: true },
                { title: '类型', dataIndex: 'type', width: 90 },
                {
                  title: '使用率',
                  dataIndex: 'usagePercent',
                  width: 150,
                  render: (value: number | null) => (
                    <Progress percent={Math.round(value ?? 0)} size="small" />
                  ),
                },
                {
                  title: '已用 / 总量',
                  key: 'bytes',
                  width: 170,
                  render: (_, record) =>
                    `${formatBytes(record.usedBytes)} / ${formatBytes(record.totalBytes)}`,
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="网络接口" extra={snapshot.data ? regionBadge(snapshot.data.network) : null}>
            {snapshot.data && <RegionHint region={snapshot.data.network} />}
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={snapshot.data?.network.data ?? []}
              locale={{ emptyText: snapshot.data?.network.message || '暂无数据' }}
              columns={[
                {
                  title: '接口',
                  dataIndex: 'id',
                  width: 120,
                  render: (value: string, record) => (
                    <Space size={4}>
                      <span>{value}</span>
                      {record.loopback && <Tag>lo</Tag>}
                    </Space>
                  ),
                },
                {
                  title: '地址',
                  dataIndex: 'addresses',
                  ellipsis: true,
                  render: (value: Array<{ ip: string; prefixLength: number }> | null) =>
                    value?.length
                      ? value.map((item) => `${item.ip}/${item.prefixLength}`).join(', ')
                      : record(messageOf(snapshot.data?.network.message)),
                },
                {
                  title: '接收速率',
                  dataIndex: 'receiveBytesPerSecond',
                  width: 110,
                  render: (value: number | null) =>
                    value === null ? '—' : `${formatBytes(value)}/s`,
                },
                {
                  title: '发送速率',
                  dataIndex: 'transmitBytesPerSecond',
                  width: 110,
                  render: (value: number | null) =>
                    value === null ? '—' : `${formatBytes(value)}/s`,
                },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="磁盘 I/O" extra={snapshot.data ? regionBadge(snapshot.data.disks) : null}>
            {snapshot.data && <RegionHint region={snapshot.data.disks} />}
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={snapshot.data?.disks.data ?? []}
              locale={{ emptyText: snapshot.data?.disks.message || '暂无数据' }}
              columns={[
                { title: '设备', dataIndex: 'id' },
                {
                  title: '读取',
                  dataIndex: 'readBytesPerSecond',
                  render: (value: number | null) => (value === null ? '—' : `${formatBytes(value)}/s`),
                },
                {
                  title: '写入',
                  dataIndex: 'writeBytesPerSecond',
                  render: (value: number | null) => (value === null ? '—' : `${formatBytes(value)}/s`),
                },
                { title: '读 IOPS', dataIndex: 'readIops', width: 90 },
                { title: '写 IOPS', dataIndex: 'writeIops', width: 90 },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} xl={12}>
          <Card title="GPU" extra={snapshot.data ? regionBadge(snapshot.data.gpu) : null}>
            {snapshot.data && <RegionHint region={snapshot.data.gpu} />}
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              dataSource={snapshot.data?.gpu.data ?? []}
              locale={{ emptyText: snapshot.data?.gpu.message || '未检测到 GPU' }}
              columns={[
                { title: '设备', dataIndex: 'name', ellipsis: true },
                {
                  title: '使用率',
                  dataIndex: 'usagePercent',
                  width: 90,
                  render: (value: number | null) => (value === null ? '—' : `${value.toFixed(1)}%`),
                },
                {
                  title: '显存',
                  key: 'memory',
                  width: 160,
                  render: (_, record) =>
                    record.memoryTotalBytes === null
                      ? '—'
                      : `${formatBytes(record.memoryUsedBytes ?? 0)} / ${formatBytes(record.memoryTotalBytes)}`,
                },
                {
                  title: '温度',
                  dataIndex: 'temperatureCelsius',
                  width: 90,
                  render: (value: number | null) => (value === null ? '—' : `${value.toFixed(0)} ℃`),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function messageOf(message: string | undefined): string {
  return message || '—';
}

function record(value: string | undefined): string {
  return value || '—';
}
