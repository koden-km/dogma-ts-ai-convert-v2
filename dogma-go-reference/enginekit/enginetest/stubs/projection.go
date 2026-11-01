package stubs

import (
	"context"
	"time"

	"github.com/dogmatiq/dogma"
)

// ProjectionMessageHandlerStub is a test implementation of
// [dogma.ProjectionMessageHandler].
type ProjectionMessageHandlerStub struct {
	ConfigureFunc        func(dogma.ProjectionConfigurer)
	HandleEventFunc      func(context.Context, dogma.ProjectionEventScope, dogma.Event) (uint64, error)
	CheckpointOffsetFunc func(context.Context, string) (uint64, error)
	CompactFunc          func(context.Context, dogma.ProjectionCompactScope) error
	ResetFunc            func(context.Context, dogma.ProjectionResetScope) error
}

var _ dogma.ProjectionMessageHandler = (*ProjectionMessageHandlerStub)(nil)

// Configure describes the handler's configuration to the engine.
func (h *ProjectionMessageHandlerStub) Configure(c dogma.ProjectionConfigurer) {
	if h.ConfigureFunc != nil {
		h.ConfigureFunc(c)
	}
}

// HandleEvent updates the projection to reflect the occurrence of an event.
func (h *ProjectionMessageHandlerStub) HandleEvent(
	ctx context.Context,
	s dogma.ProjectionEventScope,
	e dogma.Event,
) (uint64, error) {
	if h.HandleEventFunc != nil {
		return h.HandleEventFunc(ctx, s, e)
	}
	return s.Offset() + 1, nil
}

// CheckpointOffset returns the offset at which the handler expects to
// resume handling events from a specific stream.
func (h *ProjectionMessageHandlerStub) CheckpointOffset(
	ctx context.Context,
	id string,
) (uint64, error) {
	if h.CheckpointOffsetFunc != nil {
		return h.CheckpointOffsetFunc(ctx, id)
	}
	return 0, nil
}

// Compact attempts to reduce the size of the projection.
func (h *ProjectionMessageHandlerStub) Compact(
	ctx context.Context,
	s dogma.ProjectionCompactScope,
) error {
	if h.CompactFunc != nil {
		return h.CompactFunc(ctx, s)
	}
	return nil
}

// Reset clears all projection data and checkpoint offsets such that the
// projection data is rebuilt by handling all historical events.
func (h *ProjectionMessageHandlerStub) Reset(
	ctx context.Context,
	s dogma.ProjectionResetScope,
) error {
	if h.ResetFunc != nil {
		return h.ResetFunc(ctx, s)
	}
	return nil
}

// ProjectionEventScopeStub is a test implementation of
// [dogma.ProjectionEventScope].
type ProjectionEventScopeStub struct {
	NowFunc              func() time.Time
	LogFunc              func(format string, args ...any)
	RecordedAtFunc       func() time.Time
	StreamIDFunc         func() string
	OffsetFunc           func() uint64
	CheckpointOffsetFunc func() uint64
}

var _ dogma.ProjectionEventScope = (*ProjectionEventScopeStub)(nil)

// Now returns the current local time according to the engine.
func (s *ProjectionEventScopeStub) Now() time.Time {
	if s.NowFunc != nil {
		return s.NowFunc()
	}
	return time.Now()
}

// Log records an informational message using [fmt.Printf]-style formatting.
func (s *ProjectionEventScopeStub) Log(format string, args ...any) {
	if s.LogFunc != nil {
		s.LogFunc(format, args...)
	}
}

// RecordedAt returns the time at which the [Event] occurred.
func (s *ProjectionEventScopeStub) RecordedAt() time.Time {
	if s.RecordedAtFunc != nil {
		return s.RecordedAtFunc()
	}
	return time.Now()
}

// StreamID returns the RFC 9562 UUID that identifies the event stream to
// which the [Event] belongs.
func (s *ProjectionEventScopeStub) StreamID() string {
	if s.StreamIDFunc != nil {
		return s.StreamIDFunc()
	}
	return "6d1e805f-1760-409f-b1eb-e14983ec3f68"
}

// Offset returns the event's zero-based offset within the stream.
func (s *ProjectionEventScopeStub) Offset() uint64 {
	if s.OffsetFunc != nil {
		return s.OffsetFunc()
	}
	return 0
}

// CheckpointOffset returns the offset from which the handler should resume
// handling events from this stream, according to the engine.
//
// It may be lower than the incoming event's offset when the stream contains
// event types that the handler doesn't consume.
func (s *ProjectionEventScopeStub) CheckpointOffset() uint64 {
	if s.CheckpointOffsetFunc != nil {
		return s.CheckpointOffsetFunc()
	}
	return 0
}

// ProjectionCompactScopeStub is a test implementation of
// [dogma.ProjectionCompactScope].
type ProjectionCompactScopeStub struct {
	NowFunc func() time.Time
	LogFunc func(format string, args ...any)
}

var _ dogma.ProjectionCompactScope = (*ProjectionCompactScopeStub)(nil)

// Now returns the current local time according to the engine.
func (s *ProjectionCompactScopeStub) Now() time.Time {
	if s.NowFunc != nil {
		return s.NowFunc()
	}
	return time.Now()
}

// Log records an informational message using [fmt.Printf]-style formatting.
func (s *ProjectionCompactScopeStub) Log(format string, args ...any) {
	if s.LogFunc != nil {
		s.LogFunc(format, args...)
	}
}

// ProjectionResetScopeStub is a test implementation of
// [dogma.ProjectionResetScope].
type ProjectionResetScopeStub struct {
	NowFunc func() time.Time
	LogFunc func(format string, args ...any)
}

var _ dogma.ProjectionResetScope = (*ProjectionResetScopeStub)(nil)

// Now returns the current local time according to the engine.
func (s *ProjectionResetScopeStub) Now() time.Time {
	if s.NowFunc != nil {
		return s.NowFunc()
	}
	return time.Now()
}

// Log records an informational message using [fmt.Printf]-style formatting.
func (s *ProjectionResetScopeStub) Log(format string, args ...any) {
	if s.LogFunc != nil {
		s.LogFunc(format, args...)
	}
}
