package stubs

import (
	"encoding/json"
	"fmt"

	"github.com/dogmatiq/dogma"
)

// AggregateRootStub is a test implementation of [dogma.AggregateRoot].
type AggregateRootStub struct {
	AppliedEvents                    []dogma.Event
	ApplyEventFunc                   func(dogma.Event)
	AggregateInstanceDescriptionFunc func() string
	MarshalBinaryFunc                func() ([]byte, error)
	UnmarshalBinaryFunc              func([]byte) error
}

var _ dogma.AggregateRoot = &AggregateRootStub{}

// AggregateInstanceDescription returns a human-readable description of the
// aggregate instance's current state.
func (r *AggregateRootStub) AggregateInstanceDescription() string {
	if r.AggregateInstanceDescriptionFunc != nil {
		return r.AggregateInstanceDescriptionFunc()
	}
	return ""
}

// ApplyEvent updates aggregate instance to reflect the occurrence of an event.
func (r *AggregateRootStub) ApplyEvent(e dogma.Event) {
	r.AppliedEvents = append(r.AppliedEvents, e)

	if r.ApplyEventFunc != nil {
		r.ApplyEventFunc(e)
	}
}

// MarshalBinary implements [encoding.BinaryMarshaler].
func (r *AggregateRootStub) MarshalBinary() ([]byte, error) {
	if r.MarshalBinaryFunc != nil {
		return r.MarshalBinaryFunc()
	}

	type envelope struct {
		TypeID string `json:"type_id"`
		Data   []byte `json:"data"`
	}

	var envelopes []envelope
	for _, ev := range r.AppliedEvents {
		mt, ok := dogma.RegisteredMessageTypeOf(ev)
		if !ok {
			return nil, fmt.Errorf("event type %T is not registered", ev)
		}

		data, err := ev.MarshalBinary()
		if err != nil {
			return nil, err
		}

		envelopes = append(
			envelopes,
			envelope{mt.ID(), data},
		)
	}

	return json.Marshal(envelopes)
}

// UnmarshalBinary implements [encoding.BinaryUnmarshaler].
func (r *AggregateRootStub) UnmarshalBinary(data []byte) error {
	if r.UnmarshalBinaryFunc != nil {
		return r.UnmarshalBinaryFunc(data)
	}

	type envelope struct {
		TypeID string `json:"type_id"`
		Data   []byte `json:"data"`
	}

	var envelopes []envelope
	if err := json.Unmarshal(data, &envelopes); err != nil {
		return err
	}

	r.AppliedEvents = nil
	for _, env := range envelopes {
		mt, ok := dogma.RegisteredMessageTypeByID(env.TypeID)
		if !ok {
			return fmt.Errorf("unknown message type ID: %s", env.TypeID)
		}

		ev, ok := mt.New().(dogma.Event)
		if !ok {
			return fmt.Errorf("message type %s is not a dogma.Event", env.TypeID)
		}

		if err := ev.UnmarshalBinary(env.Data); err != nil {
			return err
		}

		r.AppliedEvents = append(r.AppliedEvents, ev)
	}

	return nil
}

// AggregateMessageHandlerStub is a test implementation of
// [dogma.AggregateMessageHandler].
type AggregateMessageHandlerStub[R dogma.AggregateRoot] struct {
	NewFunc                    func() R
	ConfigureFunc              func(dogma.AggregateConfigurer)
	RouteCommandToInstanceFunc func(dogma.Command) string
	HandleCommandFunc          func(R, dogma.AggregateCommandScope[R], dogma.Command)
}

var _ dogma.AggregateMessageHandler[*AggregateRootStub] = &AggregateMessageHandlerStub[*AggregateRootStub]{}

// Configure describes the handler's configuration to the engine.
func (h *AggregateMessageHandlerStub[R]) Configure(c dogma.AggregateConfigurer) {
	if h.ConfigureFunc != nil {
		h.ConfigureFunc(c)
	}
}

// New returns an aggregate root instance in its initial state.
func (h *AggregateMessageHandlerStub[R]) New() R {
	if h.NewFunc != nil {
		return h.NewFunc()
	}
	return newRoot[R]()
}

// RouteCommandToInstance returns the ID of the instance that handles a specific
// command.
func (h *AggregateMessageHandlerStub[R]) RouteCommandToInstance(c dogma.Command) string {
	if h.RouteCommandToInstanceFunc == nil {
		panic(dogma.UnexpectedMessage)
	}
	return h.RouteCommandToInstanceFunc(c)
}

// HandleCommand executes business logic in response to a command.
func (h *AggregateMessageHandlerStub[R]) HandleCommand(
	r R,
	s dogma.AggregateCommandScope[R],
	c dogma.Command,
) {
	if h.HandleCommandFunc != nil {
		h.HandleCommandFunc(r, s, c)
	}
}
