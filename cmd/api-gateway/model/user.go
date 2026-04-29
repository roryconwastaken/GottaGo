package model

import "time"

// Role defines whether a user is a customer or an operator.
// Typed constant — same reason as Status in trip-svc.
// The compiler catches typos, a plain string wouldn't.
type Role string

const (
	RoleCustomer Role = "customer"
	RoleOperator Role = "operator"
)

// User is the record we store in the users table.
// We never store the raw password — only the bcrypt hash.
type User struct {
	ID           string    `db:"id"            json:"id"`
	Email        string    `db:"email"         json:"email"`
	PasswordHash string    `db:"password_hash" json:"-"`
	Role         Role      `db:"role"          json:"role"`
	CreatedAt    time.Time `db:"created_at"    json:"created_at"`
}

// RegisterParams is what we need from the request body to create a user.
type RegisterParams struct {
	Email    string
	Password string
	Role     Role
}

// LoginParams is what we need to verify a user's credentials.
type LoginParams struct {
	Email    string
	Password string
}
