package store

import (
	"context"
	"fmt"

	"github.com/jmoiron/sqlx"
	_ "github.com/lib/pq"
	"github.com/yourname/gotta-go/api-gateway/model"
	"golang.org/x/crypto/bcrypt"
)

// PostgresStore holds our connection to Postgres.
type PostgresStore struct {
	db *sqlx.DB
}

// New connects to Postgres and verifies the connection is alive.
func New(connStr string) (*PostgresStore, error) {
	db, err := sqlx.Connect("postgres", connStr)
	if err != nil {
		return nil, fmt.Errorf("postgres connect failed: %w", err)
	}
	return &PostgresStore{db: db}, nil
}

// CreateUser registers a new user.
// It hashes the password before storing — the raw password
// never touches the database.
func (s *PostgresStore) CreateUser(ctx context.Context, p model.RegisterParams) (model.User, error) {
	// bcrypt turns "mypassword123" into a long unreadable hash.
	// Cost 12 means it runs 2^12 = 4096 hashing rounds — slow enough
	// to make brute-force attacks impractical, fast enough for a login.
	hash, err := bcrypt.GenerateFromPassword([]byte(p.Password), 12)
	if err != nil {
		return model.User{}, fmt.Errorf("hash failed: %w", err)
	}

	query := `
		INSERT INTO users (id, email, password_hash, role)
		VALUES (gen_random_uuid(), :email, :password_hash, :role)
		RETURNING *`

	rows, err := s.db.NamedQueryContext(ctx, query, map[string]any{
		"email":         p.Email,
		"password_hash": string(hash),
		"role":          p.Role,
	})
	if err != nil {
		return model.User{}, fmt.Errorf("CreateUser failed: %w", err)
	}
	defer rows.Close()

	var user model.User
	if rows.Next() {
		if err := rows.StructScan(&user); err != nil {
			return model.User{}, fmt.Errorf("scan failed: %w", err)
		}
	}

	return user, nil
}

// GetUserByEmail looks up a user by their email address.
// Used during login to find the account before checking the password.
func (s *PostgresStore) GetUserByEmail(ctx context.Context, email string) (model.User, error) {
	var user model.User
	err := s.db.GetContext(ctx, &user,
		`SELECT * FROM users WHERE email = $1`, email)
	if err != nil {
		return model.User{}, fmt.Errorf("GetUserByEmail failed: %w", err)
	}
	return user, nil
}

// CheckPassword verifies that a plain password matches the stored hash.
// Returns nil if the password is correct, an error if not.
// We keep this here so password logic never leaks into handlers.
func CheckPassword(hash, password string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
}
