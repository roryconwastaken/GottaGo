-- +goose Up
ALTER TABLE trips
    ADD COLUMN duration_minutes INTEGER NOT NULL DEFAULT 30,
    ADD COLUMN fare             NUMERIC(10, 2) NOT NULL DEFAULT 0.00;

-- +goose Down
ALTER TABLE trips
    DROP COLUMN duration_minutes,
    DROP COLUMN fare;