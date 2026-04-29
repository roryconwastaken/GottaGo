package matcher

import (
	"errors"
	"sync"

	"github.com/yourname/gotta-go/matching-svc/client"
	"github.com/yourname/gotta-go/matching-svc/model"
)

var ErrNoOperators = errors.New("no available operators found")

type Matcher struct {
	mu        sync.RWMutex
	operators map[string]*model.OperatorState
}

func New() *Matcher {
	return &Matcher{
		operators: make(map[string]*model.OperatorState),
	}
}

func (m *Matcher) UpsertOperator(state model.OperatorState) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.operators[state.OperatorID] = &state
}

func (m *Matcher) SetAvailability(operatorID string, available bool) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if o, ok := m.operators[operatorID]; ok {
		o.Available = available
	}
}

func (m *Matcher) FindBest(nearby []client.NearbyOperator) (model.MatchResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	for _, o := range nearby {
		state, known := m.operators[o.OperatorID]

		if !known || state.Available {
			return model.MatchResult{
				OperatorID:  o.OperatorID,
				OperatorLat: o.Lat,
				OperatorLng: o.Lng,
				DistanceKm:  o.DistanceKm,
			}, nil
		}
	}

	return model.MatchResult{}, ErrNoOperators
}

// FindBestExcluding works like FindBest but skips any operator
// in the excluded list. Used when re-matching after a rejection.
func (m *Matcher) FindBestExcluding(nearby []client.NearbyOperator, excluded []string) (model.MatchResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	// Build a quick lookup set for excluded operators.
	skip := make(map[string]bool, len(excluded))
	for _, id := range excluded {
		skip[id] = true
	}

	for _, o := range nearby {
		// Skip operators who already rejected this job.
		if skip[o.OperatorID] {
			continue
		}

		state, known := m.operators[o.OperatorID]
		if !known || state.Available {
			return model.MatchResult{
				OperatorID:  o.OperatorID,
				OperatorLat: o.Lat,
				OperatorLng: o.Lng,
				DistanceKm:  o.DistanceKm,
			}, nil
		}
	}

	return model.MatchResult{}, ErrNoOperators
}