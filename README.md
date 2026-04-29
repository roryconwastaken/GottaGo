# GottaGO

A real-time job dispatch platform built with Go microservices and React. Customers post standby jobs with a set duration, operators accept and complete them, and payments are calculated automatically based on actual time worked.

---

## Project Structure

```
GottaGO/
├── cmd/
│   ├── api-gateway/          # JWT auth, user registration/login, reverse proxy to all services
│   ├── location-svc/         # Stores operator GPS positions in Redis, exposes gRPC geo queries
│   ├── matching-svc/         # Manages job offers, operator matching, accept/reject/cancel chain
│   ├── trip-svc/             # Trip state machine (matched → in_progress → completed/cancelled)
│   ├── notification-svc/     # WebSocket hub, forwards NATS events to connected clients
│   └── payment-svc/          # Fare calculation, mock payment processor, receipt history
├── web/                      # React frontend
│   └── src/
│       ├── lib/              # store, api, websocket, location ping
│       ├── components/       # Layout, AuthLayout, AuthUI
│       └── pages/
│           ├── customer/     # Home, Waiting, Active, Done, NoOperators
│           └── operator/     # Home, Incoming, Active, Done
├── proto/                    # Shared gRPC proto definitions
├── docker-compose.yml        # Postgres :5433, Redis :6379, NATS :4222
└── README.md
```

---

## Prerequisites

- Go 1.21+
- Node.js 18+
- Docker Desktop

---

## Getting Started

### 1. Start infrastructure

```bash
cd GottaGO
docker compose up -d
```

### 2. Start backend services

Open a separate terminal for each service:

```bash
cd cmd/api-gateway     && go run .
cd cmd/location-svc    && go run .
cd cmd/matching-svc    && go run .
cd cmd/trip-svc        && go run .
cd cmd/notification-svc && go run .
cd cmd/payment-svc     && go run .
```

### 3. Start the frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## End-to-End Flow

```
Operator goes online → pings GPS every 3s
  Customer sets duration → requests a job
    Operator receives 30s offer window
      Operator accepts → trip created
        Operator starts job → timer begins
          Operator completes job → actual fare calculated
            Payment processed → receipt pushed to both
```

### Testing manually

1. Register a **customer** account and a separate **operator** account
2. Open two browser tabs - sign into each account
3. **Operator tab** - tap the power button to go online
4. **Customer tab** - set a duration and tap **Find Operator**
5. **Operator tab** - a 30-second offer window appears, tap **Accept Job**
6. Both sides navigate automatically via WebSocket events
7. **Operator tab** - tap **Start Job** when at the customer's location
8. **Operator tab** - tap **Complete Job** when done
9. Both sides receive a detailed receipt

---

## Pricing

| Component | Amount |
|---|---|
| Base fare | SGD 5.00 (covers first 5 min) |
| Additional time | SGD 1.00 / min after 5 min |
| Late fee | SGD 3.00 if actual time exceeds booked time |
| Minimum fare | SGD 5.00 |

The fare shown at booking is an **estimate** based on the requested duration. The actual charge is calculated from real elapsed time when the operator marks the job complete.


