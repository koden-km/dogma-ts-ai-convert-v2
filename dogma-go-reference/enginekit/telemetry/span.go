package telemetry

import (
	"context"
	"slices"

	"go.opentelemetry.io/otel/trace"
)

// Span represents a single named and timed operation of a workflow.
type Span struct {
	underlying trace.Span
	attrs      []Attr
	end        func()
}

// StartSpan starts a new span and records the operation to the recorder's
// operation counter and "in-flight" gauge instruments.
func (r *Recorder) StartSpan(
	ctx context.Context,
	name string,
	attrs ...Attr,
) (context.Context, *Span) {
	ctx, underlying := r.tracer.Start(
		ctx,
		name,
		trace.WithAttributes(r.attrKVs.ToSlice()...),
		trace.WithAttributes(asAttrKeyValues(attrs)...),
	)

	op := String("operation", name)
	r.operationCount(ctx, 1, op)
	r.operationsInFlightCount(ctx, 1, op)

	span := &Span{
		underlying,
		slices.Clone(attrs),
		func() { r.operationsInFlightCount(ctx, -1, op) },
	}

	return context.WithValue(ctx, contextKey{}, span), span
}

// End completes the span and decrements the "in-flight" gauge instrument.
func (s *Span) End() {
	s.end()
	s.underlying.End()
}

// SetAttributes adds the given attributes to the underlying OpenTelemetry span
// and any future log messages.
func (s *Span) SetAttributes(attrs ...Attr) {
next:
	for _, attr := range attrs {
		for i, x := range s.attrs {
			if x.key == attr.key {
				s.attrs[i] = attr
				continue next
			}
		}

		s.attrs = append(s.attrs, attr)
	}

	s.underlying.SetAttributes(asAttrKeyValues(attrs)...)
}

type contextKey struct{}
