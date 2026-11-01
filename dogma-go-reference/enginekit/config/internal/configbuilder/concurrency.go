package configbuilder

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/optional"
)

// ConcurrencyPreference returns a new [config.ConcurrencyPreference] as configured by fn.
func ConcurrencyPreference(fn func(*ConcurrencyPreferenceBuilder)) *config.ConcurrencyPreference {
	x := &ConcurrencyPreferenceBuilder{}
	fn(x)
	return x.Done()
}

// ConcurrencyPreferenceBuilder is a builders that can configure a value of type T.
type ConcurrencyPreferenceBuilder struct {
	target config.ConcurrencyPreference
}

// Value sets the value of the target [config.ConcurrencyPreference].
func (b *ConcurrencyPreferenceBuilder) Value(v dogma.ConcurrencyPreference) {
	b.target.Value = optional.Some(v)
}

// Partial marks the compomnent as partially configured.
func (b *ConcurrencyPreferenceBuilder) Partial() {
	b.target.IsPartial = true
}

// Speculative marks the component as speculative.
func (b *ConcurrencyPreferenceBuilder) Speculative() {
	b.target.IsSpeculative = true
}

// Done completes the configuration of the flag.
func (b *ConcurrencyPreferenceBuilder) Done() *config.ConcurrencyPreference {
	return &b.target
}
