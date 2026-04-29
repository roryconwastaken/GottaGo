-- +goose Up
ALTER TABLE payments
    ADD COLUMN late_fee_applied BOOLEAN NOT NULL DEFAULT FALSE;

-- +goose Down
ALTER TABLE payments
    DROP COLUMN late_fee_applied;