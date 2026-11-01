package stubs

import (
	"context"
	"encoding/json"

	"github.com/dogmatiq/dogma"
)

// ProcessRootStub is a test implementation of [dogma.ProcessRoot].
type ProcessRootStub struct {
	Value                          any                    `json:"value,omitempty"`
	ProcessInstanceDescriptionFunc func(bool) string      `json:"-"`
	MarshalBinaryFunc              func() ([]byte, error) `json:"-"`
	UnmarshalBinaryFunc            func([]byte) error     `json:"-"`
}

// ProcessInstanceDescription returns a human-readable description of the
// process instance's current state.
func (r *ProcessRootStub) ProcessInstanceDescription(ended bool) string {
	if r.ProcessInstanceDescriptionFunc != nil {
		return r.ProcessInstanceDescriptionFunc(ended)
	}
	return ""
}

// MarshalBinary implements [encoding.BinaryMarshaler].
func (r *ProcessRootStub) MarshalBinary() ([]byte, error) {
	if r.MarshalBinaryFunc != nil {
		return r.MarshalBinaryFunc()
	}
	return json.Marshal(r)
}

// UnmarshalBinary implements [encoding.BinaryUnmarshaler].
func (r *ProcessRootStub) UnmarshalBinary(data []byte) error {
	if r.UnmarshalBinaryFunc != nil {
		return r.UnmarshalBinaryFunc(data)
	}
	return json.Unmarshal(data, r)
}

var _ dogma.ProcessRoot = &ProcessRootStub{}

// ProcessMessageHandlerStub is a test implementation of
// [dogma.ProcessMessageHandler].
type ProcessMessageHandlerStub[R dogma.ProcessRoot] struct {
	NewFunc                  func() R
	ConfigureFunc            func(dogma.ProcessConfigurer)
	RouteEventToInstanceFunc func(context.Context, dogma.Event) (string, bool, error)
	HandleEventFunc          func(context.Context, R, dogma.ProcessEventScope[R], dogma.Event) error
	HandleDeadlineFunc       func(context.Context, R, dogma.ProcessDeadlineScope[R], dogma.Deadline) error
}

var _ dogma.ProcessMessageHandler[*ProcessRootStub] = &ProcessMessageHandlerStub[*ProcessRootStub]{}

// Configure describes the handler's configuration to the engine.
func (h *ProcessMessageHandlerStub[R]) Configure(c dogma.ProcessConfigurer) {
	if h.ConfigureFunc != nil {
		h.ConfigureFunc(c)
	}
}

// New returns a process root instance in its initial state.
func (h *ProcessMessageHandlerStub[R]) New() R {
	if h.NewFunc != nil {
		return h.NewFunc()
	}
	return newRoot[R]()
}

// RouteEventToInstance returns the ID of the instance that handles a specific
// event.
func (h *ProcessMessageHandlerStub[R]) RouteEventToInstance(
	ctx context.Context,
	e dogma.Event,
) (string, bool, error) {
	if h.RouteEventToInstanceFunc == nil {
		panic(dogma.UnexpectedMessage)
	}
	return h.RouteEventToInstanceFunc(ctx, e)
}

// HandleEvent begins or continues the process in response to an event.
func (h *ProcessMessageHandlerStub[R]) HandleEvent(
	ctx context.Context,
	r R,
	s dogma.ProcessEventScope[R],
	e dogma.Event,
) error {
	if h.HandleEventFunc != nil {
		return h.HandleEventFunc(ctx, r, s, e)
	}
	return nil
}

// HandleDeadline continues the process when a deadline is reached.
func (h *ProcessMessageHandlerStub[R]) HandleDeadline(
	ctx context.Context,
	r R,
	s dogma.ProcessDeadlineScope[R],
	d dogma.Deadline,
) error {
	if h.HandleDeadlineFunc != nil {
		return h.HandleDeadlineFunc(ctx, r, s, d)
	}
	return nil
}
