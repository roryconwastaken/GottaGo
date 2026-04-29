-- +goose Up
ALTER TABLE trips
    ADD COLUMN started_at   TIMESTAMPTZ,
    ADD COLUMN completed_at TIMESTAMPTZ;

-- +goose Down
ALTER TABLE trips
    DROP COLUMN started_at,
    DROP COLUMN completed_at;