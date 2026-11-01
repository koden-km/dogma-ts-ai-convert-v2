package telemetry

import (
	noopmetric "go.opentelemetry.io/otel/metric/noop"
	nooptrace "go.opentelemetry.io/otel/trace/noop"

	"github.com/dogmatiq/spruce"
)

// TestingT is the subset of [testing.TB] that is used by the test provider.
type TestingT interface {
	Helper()
	Log(...any)
}

// NewTestProvider returns a [Provider] that records logs to t.
func NewTestProvider(t TestingT) *Provider {
	t.Helper()

	return &Provider{
		TracerProvider: nooptrace.NewTracerProvider(),
		MeterProvider:  noopmetric.NewMeterProvider(),
		LoggerProvider: &slogProvider{
			Target: spruce.NewTestLogger(t),
		},
	}
}
