package fare

import (
	"math"
	"strconv"
	"time"
)

// Pricing structure — all amounts in SGD.
const (
	FlatRateMinutes = 5    // first 5 minutes charged at flat rate
	FlatRateAmount  = 5.00 // SGD 5.00 for the first 5 minutes
	RatePerMin      = 1.00 // SGD 1.00 per minute after the first 5
	MinimumFare     = 5.00 // minimum is the flat rate itself
	LateFee         = 3.00 // SGD 3.00 added if actual > booked duration
)

// Calculate works out the actual fare from real start
// and end timestamps plus the originally booked duration.
//
// Pricing:
//   SGD 5.00 flat for the first 5 minutes
//   + SGD 1.00 per minute after that
//   + SGD 3.00 late fee if actual minutes exceed booked minutes
//
// Examples:
//   booked 30 min, actual 25 min → SGD 25.00 (no late fee)
//   booked 30 min, actual 30 min → SGD 30.00 (no late fee)
//   booked 30 min, actual 31 min → SGD 34.00 (31.00 + 3.00 late fee)
//   booked 5 min,  actual 3 min  → SGD 5.00  (minimum, no late fee)
func Calculate(startedAt, completedAt time.Time, bookedMinutes int) (amount float64, actualMinutes float64, lateFeeApplied bool) {
	duration := completedAt.Sub(startedAt)

	// Round up to nearest minute.
	actualMinutes = math.Ceil(duration.Minutes())
	if actualMinutes < 1 {
		actualMinutes = 1
	}

	// Base fare from actual time worked.
	if actualMinutes <= FlatRateMinutes {
		amount = FlatRateAmount
	} else {
		extraMinutes := actualMinutes - FlatRateMinutes
		amount = FlatRateAmount + (extraMinutes * RatePerMin)
	}

	// Apply late fee if operator ran over the booked duration.
	if actualMinutes > float64(bookedMinutes) {
		amount += LateFee
		lateFeeApplied = true
	}

	// Round to 2 decimal places.
	amount = math.Round(amount*100) / 100

	return amount, actualMinutes, lateFeeApplied
}

// Preview returns the estimated fare shown to the customer
// at booking time based on their requested duration.
// Also shows what the late fee would be if they run over.
func Preview(bookedMinutes int) (amount float64, breakdown string) {
	if bookedMinutes < 1 {
		bookedMinutes = 1
	}

	if bookedMinutes <= FlatRateMinutes {
		amount = FlatRateAmount
	} else {
		extraMinutes := float64(bookedMinutes - FlatRateMinutes)
		amount = FlatRateAmount + (extraMinutes * RatePerMin)
	}

	amount = math.Round(amount*100) / 100

	if bookedMinutes <= FlatRateMinutes {
		breakdown = "SGD " + strconv.FormatFloat(FlatRateAmount, 'f', 2, 64) +
			" flat rate (first 5 min)" +
			" + SGD " + strconv.FormatFloat(LateFee, 'f', 2, 64) +
			" late fee if exceeded"
	} else {
		extra := bookedMinutes - FlatRateMinutes
		breakdown = "SGD " + strconv.FormatFloat(FlatRateAmount, 'f', 2, 64) +
			" flat (first 5 min) + " + strconv.Itoa(extra) +
			" min × SGD " + strconv.FormatFloat(RatePerMin, 'f', 2, 64) +
			" = SGD " + strconv.FormatFloat(amount, 'f', 2, 64) +
			" + SGD " + strconv.FormatFloat(LateFee, 'f', 2, 64) +
			" late fee if exceeded"
	}

	return amount, breakdown
}