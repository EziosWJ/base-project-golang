-- +goose Up
ALTER TABLE sys_file ADD COLUMN storage_type VARCHAR(16) NOT NULL DEFAULT 'local'
    CHECK (storage_type IN ('local', 's3'));

-- +goose Down
ALTER TABLE sys_file DROP COLUMN storage_type;
