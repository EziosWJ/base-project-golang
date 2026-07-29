package cn.ezios.baseapi.modules.system.dict.service.impl;

import cn.ezios.baseapi.common.enums.ResponseCode;
import cn.ezios.baseapi.common.exception.BusinessException;
import cn.ezios.baseapi.common.model.BatchIdsRequest;
import cn.ezios.baseapi.common.model.PageResult;
import cn.ezios.baseapi.common.model.StatusUpdateRequest;
import cn.ezios.baseapi.modules.system.dict.dto.DictDataPageQuery;
import cn.ezios.baseapi.modules.system.dict.dto.DictDataSaveRequest;
import cn.ezios.baseapi.modules.system.dict.dto.DictTypePageQuery;
import cn.ezios.baseapi.modules.system.dict.dto.DictTypeSaveRequest;
import cn.ezios.baseapi.modules.system.dict.entity.SysDictData;
import cn.ezios.baseapi.modules.system.dict.entity.SysDictType;
import cn.ezios.baseapi.modules.system.dict.mapper.SysDictDataMapper;
import cn.ezios.baseapi.modules.system.dict.mapper.SysDictTypeMapper;
import cn.ezios.baseapi.modules.system.dict.service.DictService;
import cn.ezios.baseapi.modules.system.dict.vo.DictDataVO;
import cn.ezios.baseapi.modules.system.dict.vo.DictItemVO;
import cn.ezios.baseapi.modules.system.dict.vo.DictTypeVO;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.BeanUtils;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
public class DictServiceImpl implements DictService {

    private static final int STATUS_ENABLED = 1;
    private static final int BUILTIN = 1;

    private final SysDictTypeMapper dictTypeMapper;
    private final SysDictDataMapper dictDataMapper;

    public DictServiceImpl(SysDictTypeMapper dictTypeMapper, SysDictDataMapper dictDataMapper) {
        this.dictTypeMapper = dictTypeMapper;
        this.dictDataMapper = dictDataMapper;
    }

    @Override
    public PageResult<DictTypeVO> typePage(DictTypePageQuery query) {
        Page<SysDictType> page = dictTypeMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysDictType>()
                        .like(StringUtils.hasText(query.getDictName()), SysDictType::getDictName, query.getDictName())
                        .like(StringUtils.hasText(query.getDictCode()), SysDictType::getDictCode, query.getDictCode())
                        .eq(query.getStatus() != null, SysDictType::getStatus, query.getStatus())
                        .orderByAsc(SysDictType::getSortOrder)
                        .orderByAsc(SysDictType::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toTypeVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public DictTypeVO typeDetail(Long id) {
        return toTypeVO(requireType(id));
    }

    @Override
    public void createType(DictTypeSaveRequest request) {
        ensureDictCodeUnique(request.getDictCode(), null);
        SysDictType type = new SysDictType();
        BeanUtils.copyProperties(request, type);
        type.setStatus(request.getStatus() == null ? STATUS_ENABLED : request.getStatus());
        type.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        type.setIsBuiltin(0);
        dictTypeMapper.insert(type);
    }

    @Override
    public void updateType(Long id, DictTypeSaveRequest request) {
        SysDictType existing = requireType(id);
        if (Objects.equals(existing.getIsBuiltin(), BUILTIN)
                && !Objects.equals(existing.getDictCode(), request.getDictCode())) {
            throw new BusinessException("内置字典类型禁止修改编码");
        }
        ensureDictCodeUnique(request.getDictCode(), id);
        SysDictType type = new SysDictType();
        BeanUtils.copyProperties(request, type);
        type.setId(id);
        dictTypeMapper.updateById(type);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteType(Long id) {
        SysDictType type = requireType(id);
        if (Objects.equals(type.getIsBuiltin(), BUILTIN)) {
            throw new BusinessException("内置字典类型禁止删除");
        }
        if (dictDataMapper.selectCount(new LambdaQueryWrapper<SysDictData>().eq(SysDictData::getDictTypeId, id)) > 0) {
            throw new BusinessException("字典类型下存在字典数据，禁止删除");
        }
        dictTypeMapper.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteTypeBatch(BatchIdsRequest request) {
        for (Long id : request.getIds()) {
            deleteType(id);
        }
    }

    @Override
    public void updateTypeStatus(Long id, StatusUpdateRequest request) {
        requireType(id);
        SysDictType type = new SysDictType();
        type.setId(id);
        type.setStatus(request.getStatus());
        dictTypeMapper.updateById(type);
    }

    @Override
    public PageResult<DictDataVO> dataPage(DictDataPageQuery query) {
        Long typeId = query.getDictTypeId();
        if (typeId == null && StringUtils.hasText(query.getDictCode())) {
            SysDictType type = dictTypeMapper.selectOne(new LambdaQueryWrapper<SysDictType>()
                    .eq(SysDictType::getDictCode, query.getDictCode())
                    .last("LIMIT 1"));
            typeId = type == null ? -1L : type.getId();
        }
        Page<SysDictData> page = dictDataMapper.selectPage(Page.of(query.getPage(), query.getPageSize()),
                new LambdaQueryWrapper<SysDictData>()
                        .eq(typeId != null, SysDictData::getDictTypeId, typeId)
                        .like(StringUtils.hasText(query.getDictLabel()), SysDictData::getDictLabel, query.getDictLabel())
                        .like(StringUtils.hasText(query.getDictValue()), SysDictData::getDictValue, query.getDictValue())
                        .orderByAsc(SysDictData::getSortOrder)
                        .orderByAsc(SysDictData::getId));
        return new PageResult<>(page.getRecords().stream().map(this::toDataVO).toList(),
                page.getTotal(), query.getPage(), query.getPageSize());
    }

    @Override
    public DictDataVO dataDetail(Long id) {
        return toDataVO(requireData(id));
    }

    @Override
    public void createData(DictDataSaveRequest request) {
        requireType(request.getDictTypeId());
        ensureDictValueUnique(request.getDictTypeId(), request.getDictValue(), null);
        SysDictData data = new SysDictData();
        BeanUtils.copyProperties(request, data);
        data.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        dictDataMapper.insert(data);
    }

    @Override
    public void updateData(Long id, DictDataSaveRequest request) {
        requireData(id);
        requireType(request.getDictTypeId());
        ensureDictValueUnique(request.getDictTypeId(), request.getDictValue(), id);
        SysDictData data = new SysDictData();
        BeanUtils.copyProperties(request, data);
        data.setId(id);
        dictDataMapper.updateById(data);
    }

    @Override
    public void deleteData(Long id) {
        requireData(id);
        dictDataMapper.deleteById(id);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void deleteDataBatch(BatchIdsRequest request) {
        for (Long id : request.getIds()) {
            deleteData(id);
        }
    }

    @Override
    public List<DictItemVO> items(String dictCode) {
        SysDictType type = dictTypeMapper.selectOne(new LambdaQueryWrapper<SysDictType>()
                .eq(SysDictType::getDictCode, dictCode)
                .eq(SysDictType::getStatus, STATUS_ENABLED)
                .last("LIMIT 1"));
        if (type == null) {
            return List.of();
        }
        return dictDataMapper.selectList(new LambdaQueryWrapper<SysDictData>()
                        .eq(SysDictData::getDictTypeId, type.getId())
                        .orderByAsc(SysDictData::getSortOrder)
                        .orderByAsc(SysDictData::getId))
                .stream()
                .map(data -> {
                    DictItemVO vo = new DictItemVO();
                    vo.setLabel(data.getDictLabel());
                    vo.setValue(data.getDictValue());
                    vo.setSortOrder(data.getSortOrder());
                    return vo;
                })
                .toList();
    }

    private SysDictType requireType(Long id) {
        SysDictType type = dictTypeMapper.selectById(id);
        if (type == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return type;
    }

    private SysDictData requireData(Long id) {
        SysDictData data = dictDataMapper.selectById(id);
        if (data == null) {
            throw new BusinessException(ResponseCode.NOT_FOUND);
        }
        return data;
    }

    private void ensureDictCodeUnique(String dictCode, Long excludeId) {
        Long count = dictTypeMapper.selectCount(new LambdaQueryWrapper<SysDictType>()
                .eq(SysDictType::getDictCode, dictCode)
                .ne(excludeId != null, SysDictType::getId, excludeId));
        if (count > 0) {
            throw new BusinessException("字典编码已存在");
        }
    }

    private void ensureDictValueUnique(Long dictTypeId, String dictValue, Long excludeId) {
        Long count = dictDataMapper.selectCount(new LambdaQueryWrapper<SysDictData>()
                .eq(SysDictData::getDictTypeId, dictTypeId)
                .eq(SysDictData::getDictValue, dictValue)
                .ne(excludeId != null, SysDictData::getId, excludeId));
        if (count > 0) {
            throw new BusinessException("字典值已存在");
        }
    }

    private DictTypeVO toTypeVO(SysDictType type) {
        DictTypeVO vo = new DictTypeVO();
        BeanUtils.copyProperties(type, vo);
        return vo;
    }

    private DictDataVO toDataVO(SysDictData data) {
        DictDataVO vo = new DictDataVO();
        BeanUtils.copyProperties(data, vo);
        SysDictType type = dictTypeMapper.selectById(data.getDictTypeId());
        if (type != null) {
            vo.setDictCode(type.getDictCode());
        }
        return vo;
    }
}
