-- +goose Up
CREATE TABLE trips (
    id            UUID        PRIMARY KEY,
    customer_id   TEXT        NOT NULL,
    operator_id   TEXT        NOT NULL,
    status        TEXT        NOT NULL DEFAULT 'matched',
    pickup_lat    DOUBLE PRECISION NOT NULL,
    pickup_lng    DOUBLE PRECISION NOT NULL,
    dropoff_lat   DOUBLE PRECISION NOT NULL,
    dropoff_lng   DOUBLE PRECISION NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- +goose Down
DROP TABLE trips;