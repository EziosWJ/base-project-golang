import { useEffect, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import { Plus, RefreshCw } from 'lucide-react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '../../components/PageHeader/PageHeader';
import { FilterBar } from '../../components/admin/FilterBar';
import { DataTable, type DataTableColumns } from '../../components/DataTable/DataTable';
import { FormDrawer } from '../../components/FormDrawer/FormDrawer';
import { StatusTag } from '../../components/StatusTag/StatusTag';
import { statusOptions } from '../../config/options';
import { queryKeys } from '../../lib/query/keys';
import { getErrorMessage } from '../../lib/api/errors';
import { applyServerFieldErrors } from '../../lib/forms';
import { useListState } from '../../hooks/useListState';
import {
  createDictData,
  createDictType,
  deleteDictData,
  deleteDictType,
  getDictDataPage,
  getDictTypePage,
  updateDictData,
  updateDictType,
  updateDictTypeStatus,
} from '../../features/system/api';
import type { DictDataRecord, DictTypeRecord } from '../../types/system';

interface TypeFormValues {
  dictName: string;
  dictCode: string;
  status: 0 | 1;
  sortOrder: number;
  remark?: string;
}

interface DataFormValues {
  dictLabel: string;
  dictValue: string;
  sortOrder: number;
  remark?: string;
}

const TYPE_FILTER_KEYS = ['dictName', 'dictCode', 'status'] as const;

export default function DictsPage() {
  const { message, modal } = App.useApp();
  const queryClient = useQueryClient();
  const [typeForm] = Form.useForm<TypeFormValues>();
  const [dataForm] = Form.useForm<DataFormValues>();
  const typeState = useListState({ filterKeys: TYPE_FILTER_KEYS });

  const [nameDraft, setNameDraft] = useState(typeState.filters.dictName ?? '');
  const [codeDraft, setCodeDraft] = useState(typeState.filters.dictCode ?? '');
  const [selectedType, setSelectedType] = useState<DictTypeRecord | null>(null);
  const [typeEditing, setTypeEditing] = useState<DictTypeRecord | null>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [dataEditing, setDataEditing] = useState<DictDataRecord | null>(null);
  const [dataOpen, setDataOpen] = useState(false);
  const [dataPage, setDataPage] = useState(1);
  const [dataPageSize, setDataPageSize] = useState(10);
  const [labelDraft, setLabelDraft] = useState('');

  const types = useQuery({
    queryKey: queryKeys.dicts.types(typeState.query),
    queryFn: () => getDictTypePage(typeState.query),
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!selectedType && types.data?.items.length) setSelectedType(types.data.items[0]);
  }, [types.data, selectedType]);

  const dataList = useQuery({
    queryKey: queryKeys.dicts.data({
      page: dataPage,
      pageSize: dataPageSize,
      dictTypeId: selectedType?.id,
      dictLabel: labelDraft || undefined,
    }),
    queryFn: () =>
      getDictDataPage({
        page: dataPage,
        pageSize: dataPageSize,
        dictTypeId: selectedType?.id,
        dictLabel: labelDraft || undefined,
      }),
    enabled: Boolean(selectedType),
    placeholderData: keepPreviousData,
  });

  const invalidateTypes = () =>
    void queryClient.invalidateQueries({ queryKey: queryKeys.dicts.all });

  const typeSave = useMutation({
    mutationFn: (values: TypeFormValues) =>
      typeEditing ? updateDictType(typeEditing.id, values) : createDictType(values),
    onSuccess: () => {
      message.success(typeEditing ? '字典类型已更新' : '字典类型已创建');
      setTypeOpen(false);
      setTypeEditing(null);
      invalidateTypes();
    },
    onError: (error) => { applyServerFieldErrors(typeForm, error); }
  });

  const typeStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 0 | 1 }) => updateDictTypeStatus(id, status),
    onSuccess: () => {
      message.success('状态已更新');
      invalidateTypes();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const dataSave = useMutation({
    mutationFn: (values: DataFormValues) => {
      if (!selectedType) throw new Error('请先选择字典类型');
      const payload = { ...values, dictTypeId: selectedType.id };
      return dataEditing ? updateDictData(dataEditing.id, payload) : createDictData(payload);
    },
    onSuccess: () => {
      message.success(dataEditing ? '字典数据已更新' : '字典数据已创建');
      setDataOpen(false);
      setDataEditing(null);
      invalidateTypes();
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openTypeCreate = () => {
    setTypeEditing(null);
    typeForm.resetFields();
    typeForm.setFieldsValue({ status: 1, sortOrder: 1 });
    setTypeOpen(true);
  };

  const openTypeEdit = (record: DictTypeRecord) => {
    setTypeEditing(record);
    typeForm.resetFields();
    typeForm.setFieldsValue({
      dictName: record.dictName,
      dictCode: record.dictCode,
      status: record.status,
      sortOrder: record.sortOrder,
      remark: record.remark ?? undefined,
    });
    setTypeOpen(true);
  };

  const openDataCreate = () => {
    setDataEditing(null);
    dataForm.resetFields();
    dataForm.setFieldsValue({ sortOrder: 1 });
    setDataOpen(true);
  };

  const openDataEdit = (record: DictDataRecord) => {
    setDataEditing(record);
    dataForm.resetFields();
    dataForm.setFieldsValue({
      dictLabel: record.dictLabel,
      dictValue: record.dictValue,
      sortOrder: record.sortOrder,
      remark: record.remark ?? undefined,
    });
    setDataOpen(true);
  };

  const typeColumns: DataTableColumns<DictTypeRecord> = [
    {
      title: '字典名称',
      dataIndex: 'dictName',
      render: (value: string, record) => (
        <Space size={6}>
          <Typography.Text strong>{value}</Typography.Text>
          {record.isBuiltin === 1 && <Tag color="gold">内置</Tag>}
        </Space>
      ),
    },
    {
      title: '字典编码',
      dataIndex: 'dictCode',
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 70 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (value: 0 | 1, record) => (
        <Space size={6}>
          <Switch
            size="small"
            checked={value === 1}
            disabled={record.isBuiltin === 1}
            onChange={(checked) =>
              typeStatus.mutate({ id: record.id, status: checked ? 1 : 0 })
            }
          />
          <StatusTag status={value} />
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 190,
      hideInSettings: true,
      render: (_, record) => (
        <Space size={0} className="table-actions">
          <Button type="link" size="small" onClick={() => setSelectedType(record)}>
            字典数据
          </Button>
          <Button type="link" size="small" onClick={() => openTypeEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            disabled={record.isBuiltin === 1}
            onClick={() =>
              modal.confirm({
                title: `删除字典类型「${record.dictName}」？`,
                content: '包含字典数据或已内置的类型会被服务端拒绝。',
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await deleteDictType(record.id);
                    message.success('字典类型已删除');
                    invalidateTypes();
                  } catch (error) {
                    message.error(getErrorMessage(error));
                  }
                },
              })
            }
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  const dataColumns: DataTableColumns<DictDataRecord> = [
    { title: '标签', dataIndex: 'dictLabel', width: 180 },
    {
      title: '值',
      dataIndex: 'dictValue',
      width: 180,
      render: (value: string) => <Typography.Text code>{value}</Typography.Text>,
    },
    { title: '排序', dataIndex: 'sortOrder', width: 80 },
    { title: '备注', dataIndex: 'remark', render: (value: string | null) => value || '—' },
    {
      title: '操作',
      key: 'actions',
      width: 130,
      hideInSettings: true,
      render: (_, record) => (
        <Space size={0} className="table-actions">
          <Button type="link" size="small" onClick={() => openDataEdit(record)}>
            编辑
          </Button>
          <Button
            type="link"
            size="small"
            danger
            className="table-action-danger"
            onClick={() =>
              modal.confirm({
                title: `删除字典数据「${record.dictLabel}」？`,
                okButtonProps: { danger: true },
                onOk: async () => {
                  try {
                    await deleteDictData(record.id);
                    message.success('字典数据已删除');
                    invalidateTypes();
                  } catch (error) {
                    message.error(getErrorMessage(error));
                  }
                },
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
        title="字典管理"
        description="维护字典类型与字典数据。业务下拉选项可直接使用字典编码获取。"
        extra={
          <Button type="primary" icon={<Plus size={16} />} onClick={openTypeCreate}>
            新建字典类型
          </Button>
        }
      />

      <FilterBar
        onSearch={() =>
          typeState.setFilters({ dictName: nameDraft.trim(), dictCode: codeDraft.trim() })
        }
        onReset={() => {
          setNameDraft('');
          setCodeDraft('');
          typeState.reset();
        }}
        loading={types.isFetching}
        summary={<Typography.Text type="secondary">共 {types.data?.total ?? 0} 个字典类型</Typography.Text>}
      >
        <Input
          allowClear
          placeholder="字典名称"
          value={nameDraft}
          onChange={(event) => setNameDraft(event.target.value)}
          style={{ width: 170 }}
        />
        <Input
          allowClear
          placeholder="字典编码"
          value={codeDraft}
          onChange={(event) => setCodeDraft(event.target.value)}
          style={{ width: 170 }}
        />
        <Select
          allowClear
          placeholder="状态"
          style={{ width: 110 }}
          value={typeState.filters.status ? Number(typeState.filters.status) : undefined}
          onChange={(value) => typeState.setFilter('status', value)}
          options={statusOptions}
        />
      </FilterBar>

      <Card
        title="字典类型"
        style={{ marginBottom: 16 }}
        extra={
          <Button
            size="small"
            icon={<RefreshCw size={14} />}
            onClick={() => void types.refetch()}
          >
            刷新
          </Button>
        }
      >
        <DataTable<DictTypeRecord>
          tableId="system-dict-types"
          tableLabel="字典类型列表"
          rowKey="id"
          columns={typeColumns}
          dataSource={types.data?.items ?? []}
          loading={types.isLoading}
          error={types.error}
          onRetry={() => void types.refetch()}
          pagination={{
            current: typeState.page,
            pageSize: typeState.pageSize,
            total: types.data?.total ?? 0,
            onChange: (page, pageSize) =>
              pageSize !== typeState.pageSize
                ? typeState.setPageSize(pageSize)
                : typeState.setPage(page),
          }}
        />
      </Card>

      <Card
        title={
          selectedType
            ? `字典数据 · ${selectedType.dictName}（${selectedType.dictCode}）`
            : '字典数据'
        }
        extra={
          <Space>
            <Input
              allowClear
              placeholder="按标签搜索"
              value={labelDraft}
              onChange={(event) => {
                setLabelDraft(event.target.value);
                setDataPage(1);
              }}
              style={{ width: 180 }}
            />
            <Button type="primary" icon={<Plus size={14} />} disabled={!selectedType} onClick={openDataCreate}>
              新建数据
            </Button>
          </Space>
        }
      >
        {!selectedType ? (
          <Typography.Text type="secondary">请先在上方选择一个字典类型。</Typography.Text>
        ) : (
          <DataTable<DictDataRecord>
            tableId="system-dict-data"
            tableLabel="字典数据列表"
            rowKey="id"
            columns={dataColumns}
            dataSource={dataList.data?.items ?? []}
            loading={dataList.isLoading}
            error={dataList.error}
            onRetry={() => void dataList.refetch()}
            pagination={{
              current: dataPage,
              pageSize: dataPageSize,
              total: dataList.data?.total ?? 0,
              onChange: (page, pageSize) => {
                if (pageSize !== dataPageSize) {
                  setDataPageSize(pageSize);
                  setDataPage(1);
                } else {
                  setDataPage(page);
                }
              },
            }}
          />
        )}
      </Card>

      <FormDrawer<TypeFormValues>
        open={typeOpen}
        title={typeEditing ? `编辑字典类型：${typeEditing.dictName}` : '新建字典类型'}
        form={typeForm}
        onClose={() => {
          setTypeOpen(false);
          setTypeEditing(null);
        }}
        onFinish={(values) => typeSave.mutateAsync(values)}
        submitting={typeSave.isPending}
        error={typeSave.error}
      >
        <Form.Item name="dictName" label="字典名称" rules={[{ required: true, message: '请输入字典名称' }]}>
          <Input />
        </Form.Item>
        <Form.Item
          name="dictCode"
          label="字典编码"
          rules={[
            { required: true, message: '请输入字典编码' },
            { pattern: /^[A-Z][A-Z0-9_]*$/, message: '建议使用大写字母、数字和下划线' },
          ]}
        >
          <Input disabled={typeEditing?.isBuiltin === 1} placeholder="例如：USER_STATUS" />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
          <InputNumber min={0} max={9999} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="status" label="状态" rules={[{ required: true }]}>
          <Select options={statusOptions} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} maxLength={200} showCount />
        </Form.Item>
      </FormDrawer>

      <FormDrawer<DataFormValues>
        open={dataOpen}
        title={dataEditing ? `编辑字典数据：${dataEditing.dictLabel}` : '新建字典数据'}
        form={dataForm}
        onClose={() => {
          setDataOpen(false);
          setDataEditing(null);
        }}
        onFinish={(values) => dataSave.mutateAsync(values)}
        submitting={dataSave.isPending}
        error={dataSave.error}
      >
        <Form.Item name="dictLabel" label="标签" rules={[{ required: true, message: '请输入标签' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="dictValue" label="值" rules={[{ required: true, message: '请输入值' }]}>
          <Input />
        </Form.Item>
        <Form.Item name="sortOrder" label="排序" rules={[{ required: true }]}>
          <InputNumber min={0} max={9999} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} maxLength={200} showCount />
        </Form.Item>
      </FormDrawer>
    </div>
  );
}
