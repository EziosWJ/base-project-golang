package filemgmt

import (
	"context"
	"errors"

	"gorm.io/gorm"
)

type Repository struct{ db *gorm.DB }

var _ Store = (*Repository)(nil)

func NewRepository(db *gorm.DB) *Repository { return &Repository{db: db} }

func (r *Repository) Page(ctx context.Context, q FilePageQuery) (Page[File], error) {
	var p Page[File]
	db := r.db.WithContext(ctx).Model(&File{}).Where("deleted=0")
	if q.OriginalName != "" {
		db = db.Where("original_name LIKE ?", "%"+q.OriginalName+"%")
	}
	if q.BusinessModule != "" {
		db = db.Where("business_module=?", q.BusinessModule)
	}
	if q.MimeType != "" {
		db = db.Where("mime_type LIKE ?", "%"+q.MimeType+"%")
	}
	if q.Status != nil {
		db = db.Where("status=?", *q.Status)
	}
	if err := db.Count(&p.Total).Error; err != nil {
		return p, err
	}
	p.Page, p.PageSize = q.Page, q.PageSize
	err := db.Order("create_time DESC,id DESC").Offset((q.Page - 1) * q.PageSize).Limit(q.PageSize).Find(&p.Records).Error
	return p, err
}

func (r *Repository) Find(ctx context.Context, id int64) (*File, error) {
	var f File
	err := r.db.WithContext(ctx).Where("id=? AND deleted=0", id).Take(&f).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &f, nil
}

func (r *Repository) Create(ctx context.Context, f File) (File, error) {
	err := r.db.WithContext(ctx).Create(&f).Error
	return f, err
}

func (r *Repository) SetAccessURL(ctx context.Context, id int64, accessURL string) error {
	return r.db.WithContext(ctx).Model(&File{}).Where("id=? AND deleted=0", id).Update("access_url", accessURL).Error
}

func (r *Repository) Update(ctx context.Context, id int64, in UpdateInput) error {
	return r.db.WithContext(ctx).Model(&File{}).Where("id=? AND deleted=0", id).Updates(map[string]any{"business_module": in.BusinessModule, "remark": in.Remark}).Error
}

func (r *Repository) Delete(ctx context.Context, id int64) error {
	return r.db.WithContext(ctx).Model(&File{}).Where("id=? AND deleted=0", id).Update("deleted", 1).Error
}

func (r *Repository) SetStatus(ctx context.Context, id int64, status int) error {
	return r.db.WithContext(ctx).Model(&File{}).Where("id=? AND deleted=0", id).Update("status", status).Error
}
