-- +goose Up
CREATE TABLE payments (
    id              UUID            PRIMARY KEY,
    trip_id         UUID            NOT NULL UNIQUE,
    customer_id     TEXT            NOT NULL,
    operator_id     TEXT            NOT NULL,
    booked_minutes  INTEGER         NOT NULL,
    actual_minutes  NUMERIC(10, 2)  NOT NULL,
    amount          NUMERIC(10, 2)  NOT NULL,
    currency        TEXT            NOT NULL DEFAULT 'SGD',
    status          TEXT            NOT NULL DEFAULT 'completed',
    transaction_id  TEXT            NOT NULL,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE payments;