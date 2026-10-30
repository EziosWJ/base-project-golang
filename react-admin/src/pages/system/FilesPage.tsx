import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  App,
  Button,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  Upload,
  type UploadFile,
} from 'antd';
import { Download, Eye, Plus, RefreshCw, Trash2, Upload as UploadIcon } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Key } from 'react';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FilterBar } from '../../components/admin/FilterBar';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { statusOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { formatBytes, formatDateTime } from '../../utils/format';
import { downloadBlob } from '../../utils/download';
import { useListState } from '../../hooks/useListState';
import {
  batchDeleteFiles,
  deleteFile,
  downloadFile,
  getFileBlob,
  getFileLink,
  getFilePage,
  updateFile,
  updateFileStatus,
  uploadFiles,
} from '../../features/system/api';
import type { FileRecord } from '../../types/system';

interface FileEditValues {
  businessModule?: string;
  remark?: string;
}

interface FilePreviewState {
  record: FileRecord;
  url: string;
  text?: string;
  error?: string;
}

const FILTER_KEYS = ['originalName', 'businessModule', 'status'] as const;

export default function FilesPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [editForm] = Form.useForm<FileEditValues>();
  const listState = useListState({ filterKeys: FILTER_KEYS });

  const [nameDraft, setNameDraft] = useState(listState.filters.originalName ?? '');
  const [moduleDraft, setModuleDraft] = useState(listState.filters.businessModule ?? '');
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [editing, setEditing] = useState<FileRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [previewState, setPreviewState] = useState<FilePreviewState | null>(null);
  const previewRequest = useRef<AbortController | null>(null);
  const previewObjectUrl = useRef('');

  const list = useQuery({
    queryKey: queryKeys.files.list(listState.query),
    queryFn: () => getFilePage(listState.query),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.files.all });

  const editMutation = useMutation({
    mutationFn: (values: FileEditValues) => updateFile(editing?.id as number, values),
    onSuccess: () => {
      message.success('文件信息已更新');
      setEditOpen(false);
      setEditing(null);
      void invalidate();
    },
    onError: (error) => { applyServerFieldErrors(editForm, error); }
  });

  const deleteMutation = useMutation({
    mutationFn: deleteFile,
    onSuccess: () => {
      message.success('文件已删除');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const batchDeleteMutation = useMutation({
    mutationFn: batchDeleteFiles,
    onSuccess: () => {
      message.success('已批量删除');
      setSelectedRowKeys([]);
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateFileStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      void invalidate();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const handleUpload = async () => {
    const files = fileList
      .map((item) => item.originFileObj)
      .filter((file): file is NonNullable<typeof file> => Boolean(file));
    if (files.length === 0) {
      message.warning('请先选择文件');
      return;
    }
    setUploading(true);
    setUploadResult(null);
    try {
      const result = await uploadFiles(files as File[]);
      const failed = result.failed ?? [];
      const succeeded = result.succeeded?.length ?? 0;
      setUploadResult(
        failed.length === 0
          ? `已上传 ${succeeded} 个文件。`
          : `成功 ${succeeded} 个，失败 ${failed.length} 个：${failed
              .map((item) => `${item.fileName}（${item.message}）`)
              .join('；')}`,
      );
      if (failed.length === 0) {
        message.success('上传完成');
        setFileList([]);
        setUploadOpen(false);
        void invalidate();
      } else {
        void invalidate();
      }
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const download = async (record: FileRecord) => {
    try {
      const blob = await downloadFile(record.id);
      downloadBlob(blob, record.originalName);
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const releasePreview = () => {
    previewRequest.current?.abort();
    previewRequest.current = null;
    if (previewObjectUrl.current) {
      URL.revokeObjectURL(previewObjectUrl.current);
      previewObjectUrl.current = '';
    }
  };

  useEffect(() => releasePreview, []);

  const closePreview = () => {
    releasePreview();
    setPreviewState(null);
  };

  const handlePreviewError = () => {
    setPreviewState((current) =>
      current ? { ...current, error: '文件加载失败，请重试' } : current,
    );
  };

  const previewFile = async (record: FileRecord) => {
    releasePreview();
    const controller = new AbortController();
    previewRequest.current = controller;
    try {
      const link = await getFileLink(record.id, 'inline', controller.signal);
      if (controller.signal.aborted) return;
      const isText = record.mimeType.startsWith('text/');
      let url = link.url;
      let text: string | undefined;
      if (!link.direct || isText) {
        const blob = await getFileBlob(link.url, controller.signal);
        if (controller.signal.aborted) return;
        const objectUrl = URL.createObjectURL(blob);
        previewObjectUrl.current = objectUrl;
        url = objectUrl;
        if (isText) text = (await blob.text()).slice(0, 20_000);
      }
      if (controller.signal.aborted) return;
      setPreviewState({ record, url, text });
    } catch (error) {
      if (!controller.signal.aborted) message.error(getErrorMessage(error));
    }
  };

  const openEdit = (record: FileRecord) => {
    setEditing(record);
    editForm.resetFields();
    editForm.setFieldsValue({
      businessModule: record.businessModule ?? undefined,
      remark: record.remark ?? undefined,
    });
    setEditOpen(true);
  };

  const columns: DataTableColumns<FileRecord> = [
    {
      title: '文件名',
      dataIndex: 'originalName',
      ellipsis: true,
      render: (value: string, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{value}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.mimeType}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'fileSize',
      width: 100,
      render: (value: number) => formatBytes(value),
    },
    {
      title: '业务模块',
      dataIndex: 'businessModule',
      width: 130,
      render: (value: string | null) => value || '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: 0 | 1, record) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={value === 1}
            onChange={(checked) =>
              statusMutation.mutate({ id: record.id, status: checked ? 1 : 0 })
            }
          />
          <StatusTag status={value} />
        </Space>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'createTime',
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      hideInSettings: true,
      render: (_, record) => (
        <Space size={0} wrap className="table-actions">
          <Button type="link" size="small" icon={<Eye size={14} />} onClick={() => void previewFile(record)}>
            预览
          </Button>
          <Button
            type="link"
            size="small"
            icon={<Download size={14} />}
            onClick={() => void download(record)}
          >
            下载
          </Button>
          <Button type="link" size="small" onClick={() => openEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            onClick={() =>
              modal.confirm({
                title: `删除文件「${record.originalName}」？`,
                content: '文件记录将被删除，物理对象保留。',
                okButtonProps: { danger: true },
                onOk: () => deleteMutation.mutateAsync(record.id),
              })
            }
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="文件管理"
        description="文件通过鉴权接口获取访问链接后下载与预览；上传大小与数量受后端策略限制。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={() => setUploadOpen(true)}>
            上传文件
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          listState.setFilters({
            originalName: nameDraft.trim(),
            businessModule: moduleDraft.trim(),
          })
        }
        onReset={() => {
          setNameDraft('');
          setModuleDraft('');
          listState.reset();
        }}
        loading={list.isFetching}
        summary={<Typography.Text type="secondary">共 {list.data?.total ?? 0} 个文件</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="文件名"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          style={{ width: 190 }}
        />
        <Input
          allowClear
          placeholder="业务模块"
          value={moduleDraft}
          onChange={(event) => setModuleDraft(event.target.value)}
          style={{ width: 150 }}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 110 }}
          value={listState.filters.status ? Number(listState.filters.status) : undefined}
          onChange={(value) => listState.setFilter('status', value)}
          options={statusOptions}
        />
      </FilterBar>

      <DataTable<FileRecord>
        tableId="system-files"
        tableLabel="文件列表"
        rowKey="id"
        columns={columns}
        dataSource={list.data?.items ?? []}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => void list.refetch()}
        pagination={{
          current: listState.page,
          pageSize: listState.pageSize,
          total: list.data?.total ?? 0,
          onChange: (page, pageSize) =>
            pageSize !== listState.pageSize
              ? listState.setPageSize(pageSize)
              : listState.setPage(page),
        }}
        rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
        toolbar={
          <Button icon={<RefreshCw size={15} />} onClick={() => void list.refetch()}>
            刷新
          </Button>
        }
        batchActions={({ clear }) => (
          <Button
            danger
            size="small"
            icon={<Trash2 size={14} />}
            onClick={() =>
              modal.confirm({
                title: `删除选中的 ${selectedRowKeys.length} 个文件？`,
                okButtonProps: { danger: true },
                onOk: async () => {
                  await batchDeleteMutation.mutateAsync(selectedRowKeys.map(Number));
                  clear();
                },
              })
            }
          >
            批量删除
          </Button>
        )}
      />

      <Modal
        open={uploadOpen}
        title="上传文件"
        onCancel={() => {
          setUploadOpen(false);
          setUploadResult(null);
        }}
        onOk={() => void handleUpload()}
        okText="开始上传"
        confirmLoading={uploading}
        width={560}
        destroyOnHidden
      >
        <Upload.Dragger
          multiple
          maxCount={10}
          fileList={fileList}
          beforeUpload={(file) => {
            const tooLarge = file.size > 20 * 1024 * 1024;
            if (tooLarge) {
              message.error(`${file.name} 超过 20 MB`);
              return Upload.LIST_IGNORE;
            }
            return false;
          }}
          onChange={({ fileList: next }) => setFileList(next.slice(0, 10))}
        >
          <p className="ant-upload-drag-icon">
            <UploadIcon size={28} style={{ color: 'var(--ant-color-primary)' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域</p>
          <p className="ant-upload-hint">最多 10 个文件，单个不超过 20 MB；后端仍会执行最终策略校验。</p>
        </Upload.Dragger>
        {uploadResult && (
          <Alert style={{ marginTop: 12 }} type="info" showIcon title="上传结果" description={uploadResult} />
        )}
      </Modal>

      <Modal
        open={Boolean(previewState)}
        title={previewState?.record.originalName}
        onCancel={closePreview}
        footer={<Button onClick={closePreview}>关闭</Button>}
        width={900}
        destroyOnHidden
      >
        {previewState?.error ? (
          <Alert type="error" showIcon title={previewState.error} />
        ) : previewState?.text !== undefined ? (
          <pre style={{ maxHeight: '60vh', overflow: 'auto', whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {previewState.text}
          </pre>
        ) : previewState && previewState.record.mimeType.startsWith('image/') ? (
          <img
            src={previewState.url}
            onError={handlePreviewError}
            alt={previewState.record.originalName}
            style={{ maxWidth: '100%', maxHeight: '65vh', display: 'block', margin: '0 auto' }}
          />
        ) : previewState &&
          (previewState.record.mimeType === 'application/pdf' || previewState.record.extension === 'pdf') ? (
          <iframe
            src={previewState.url}
            title={previewState.record.originalName}
            style={{ width: '100%', height: '65vh', border: 0 }}
          />
        ) : (
          <Alert type="info" showIcon title="该文件类型不支持内嵌预览，请使用下载。" />
        )}
      </Modal>

      <FormDrawer<FileEditValues>
        open={editOpen}
        title={editing ? `编辑文件：${editing.originalName}` : '编辑文件'}
        form={editForm}
        onClose={() => {
          setEditOpen(false);
          setEditing(null);
        }}
        onFinish={(values) => editMutation.mutateAsync(values)}
        submitting={editMutation.isPending}
        error={editMutation.error}
      >
        <Form.Item name="businessModule" label="业务模块">
          <Input placeholder="例如：avatar、attachment" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={3} maxLength={200} showCount />
        </Form.Item>
        <Tag color="default">文件名、大小、MIME 与存储路径由后端维护。</Tag>
      </FormDrawer>
    </div>
  );
}
