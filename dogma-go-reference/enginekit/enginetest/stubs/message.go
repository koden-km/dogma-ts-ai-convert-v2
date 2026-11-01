package stubs

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"regexp"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
)

// CommandStub is a test implementation of [dogma.Command].
type CommandStub[T any] struct {
	Content         T      `json:"content,omitempty"`
	ValidationError string `json:"validation_error,omitempty"`
}

// MessageDescription returns a description of the command.
func (s *CommandStub[T]) MessageDescription() string {
	validity := "valid"
	if s.ValidationError != "" {
		validity = "invalid: " + s.ValidationError
	}
	return fmt.Sprintf(
		"command(%T:%v, %s)",
		s.Content,
		s.Content,
		validity,
	)
}

// Validate returns a non-nil error if s.ValidationError is not empty.
func (s *CommandStub[T]) Validate(dogma.CommandValidationScope) error {
	if s.ValidationError != "" {
		return errors.New(s.ValidationError)
	}
	return nil
}

// MarshalBinary implements [encoding.BinaryMarshaler].
func (s *CommandStub[T]) MarshalBinary() ([]byte, error) {
	return json.Marshal(s)
}

// UnmarshalBinary implements [encoding.BinaryUnmarshaler].
func (s *CommandStub[T]) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, s)
}

// EventStub is a test implementation of [dogma.Event].
type EventStub[T any] struct {
	Content         T      `json:"content,omitempty"`
	ValidationError string `json:"validation_error,omitempty"`
}

// MessageDescription returns a description of the event.
func (s *EventStub[T]) MessageDescription() string {
	validity := "valid"
	if s.ValidationError != "" {
		validity = "invalid: " + s.ValidationError
	}
	return fmt.Sprintf(
		"event(%T:%v, %s)",
		s.Content,
		s.Content,
		validity,
	)
}

// Validate returns a non-nil error if s.ValidationError is not empty.
func (s *EventStub[T]) Validate(dogma.EventValidationScope) error {
	if s.ValidationError != "" {
		return errors.New(s.ValidationError)
	}
	return nil
}

// MarshalBinary implements [encoding.BinaryMarshaler].
func (s *EventStub[T]) MarshalBinary() ([]byte, error) {
	return json.Marshal(s)
}

// UnmarshalBinary implements [encoding.BinaryUnmarshaler].
func (s *EventStub[T]) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, s)
}

// DeadlineStub is a test implementation of [dogma.Deadline].
type DeadlineStub[T any] struct {
	Content         T      `json:"content,omitempty"`
	ValidationError string `json:"validation_error,omitempty"`
}

// MessageDescription returns a description of the deadline message.
func (s *DeadlineStub[T]) MessageDescription() string {
	validity := "valid"
	if s.ValidationError != "" {
		validity = "invalid: " + s.ValidationError
	}
	return fmt.Sprintf(
		"deadline(%T:%v, %s)",
		s.Content,
		s.Content,
		validity,
	)
}

// Validate returns a non-nil error if s.ValidationError is not empty.
func (s *DeadlineStub[T]) Validate(dogma.DeadlineValidationScope) error {
	if s.ValidationError != "" {
		return errors.New(s.ValidationError)
	}
	return nil
}

// MarshalBinary implements [encoding.BinaryMarshaler].
func (s *DeadlineStub[T]) MarshalBinary() ([]byte, error) {
	return json.Marshal(s)
}

// UnmarshalBinary implements [encoding.BinaryUnmarshaler].
func (s *DeadlineStub[T]) UnmarshalBinary(data []byte) error {
	return json.Unmarshal(data, s)
}

type (
	// TypeA is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeA string
	// TypeB is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeB string
	// TypeC is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeC string
	// TypeD is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeD string
	// TypeE is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeE string
	// TypeF is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeF string
	// TypeG is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeG string
	// TypeH is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeH string
	// TypeI is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeI string
	// TypeJ is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeJ string
	// TypeK is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeK string
	// TypeL is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeL string
	// TypeM is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeM string
	// TypeN is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeN string
	// TypeO is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeO string
	// TypeP is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeP string
	// TypeQ is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeQ string
	// TypeR is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeR string
	// TypeS is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeS string
	// TypeT is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeT string
	// TypeU is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeU string
	// TypeV is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeV string
	// TypeW is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeW string
	// TypeX is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeX string
	// TypeY is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeY string
	// TypeZ is a named type used as a type parameter for [CommandStub],
	// [EventStub] and [DeadlineStub] to provide a unique type.
	TypeZ string
)

var (
	// CommandA1 is command of type [TypeA] with content "A1".
	CommandA1 = &CommandStub[TypeA]{Content: "A1"}
	// CommandA2 is command of type [TypeA] with content "A2".
	CommandA2 = &CommandStub[TypeA]{Content: "A2"}
	// CommandA3 is command of type [TypeA] with content "A3".
	CommandA3 = &CommandStub[TypeA]{Content: "A3"}

	// CommandB1 is command of type [TypeB] with content "B1".
	CommandB1 = &CommandStub[TypeB]{Content: "B1"}
	// CommandB2 is command of type [TypeB] with content "B2".
	CommandB2 = &CommandStub[TypeB]{Content: "B2"}
	// CommandB3 is command of type [TypeB] with content "B3".
	CommandB3 = &CommandStub[TypeB]{Content: "B3"}

	// CommandC1 is command of type [TypeC] with content "C1".
	CommandC1 = &CommandStub[TypeC]{Content: "C1"}
	// CommandC2 is command of type [TypeC] with content "C2".
	CommandC2 = &CommandStub[TypeC]{Content: "C2"}
	// CommandC3 is command of type [TypeC] with content "C3".
	CommandC3 = &CommandStub[TypeC]{Content: "C3"}

	// CommandD1 is command of type [TypeD] with content "D1".
	CommandD1 = &CommandStub[TypeD]{Content: "D1"}
	// CommandD2 is command of type [TypeD] with content "D2".
	CommandD2 = &CommandStub[TypeD]{Content: "D2"}
	// CommandD3 is command of type [TypeD] with content "D3".
	CommandD3 = &CommandStub[TypeD]{Content: "D3"}

	// CommandE1 is command of type [TypeE] with content "E1".
	CommandE1 = &CommandStub[TypeE]{Content: "E1"}
	// CommandE2 is command of type [TypeE] with content "E2".
	CommandE2 = &CommandStub[TypeE]{Content: "E2"}
	// CommandE3 is command of type [TypeE] with content "E3".
	CommandE3 = &CommandStub[TypeE]{Content: "E3"}

	// CommandF1 is command of type [TypeF] with content "F1".
	CommandF1 = &CommandStub[TypeF]{Content: "F1"}
	// CommandF2 is command of type [TypeF] with content "F2".
	CommandF2 = &CommandStub[TypeF]{Content: "F2"}
	// CommandF3 is command of type [TypeF] with content "F3".
	CommandF3 = &CommandStub[TypeF]{Content: "F3"}

	// CommandG1 is command of type [TypeG] with content "G1".
	CommandG1 = &CommandStub[TypeG]{Content: "G1"}
	// CommandG2 is command of type [TypeG] with content "G2".
	CommandG2 = &CommandStub[TypeG]{Content: "G2"}
	// CommandG3 is command of type [TypeG] with content "G3".
	CommandG3 = &CommandStub[TypeG]{Content: "G3"}

	// CommandH1 is command of type [TypeH] with content "H1".
	CommandH1 = &CommandStub[TypeH]{Content: "H1"}
	// CommandH2 is command of type [TypeH] with content "H2".
	CommandH2 = &CommandStub[TypeH]{Content: "H2"}
	// CommandH3 is command of type [TypeH] with content "H3".
	CommandH3 = &CommandStub[TypeH]{Content: "H3"}

	// CommandI1 is command of type [TypeI] with content "I1".
	CommandI1 = &CommandStub[TypeI]{Content: "I1"}
	// CommandI2 is command of type [TypeI] with content "I2".
	CommandI2 = &CommandStub[TypeI]{Content: "I2"}
	// CommandI3 is command of type [TypeI] with content "I3".
	CommandI3 = &CommandStub[TypeI]{Content: "I3"}

	// CommandJ1 is command of type [TypeJ] with content "J1".
	CommandJ1 = &CommandStub[TypeJ]{Content: "J1"}
	// CommandJ2 is command of type [TypeJ] with content "J2".
	CommandJ2 = &CommandStub[TypeJ]{Content: "J2"}
	// CommandJ3 is command of type [TypeJ] with content "J3".
	CommandJ3 = &CommandStub[TypeJ]{Content: "J3"}

	// CommandK1 is command of type [TypeK] with content "K1".
	CommandK1 = &CommandStub[TypeK]{Content: "K1"}
	// CommandK2 is command of type [TypeK] with content "K2".
	CommandK2 = &CommandStub[TypeK]{Content: "K2"}
	// CommandK3 is command of type [TypeK] with content "K3".
	CommandK3 = &CommandStub[TypeK]{Content: "K3"}

	// CommandL1 is command of type [TypeL] with content "L1".
	CommandL1 = &CommandStub[TypeL]{Content: "L1"}
	// CommandL2 is command of type [TypeL] with content "L2".
	CommandL2 = &CommandStub[TypeL]{Content: "L2"}
	// CommandL3 is command of type [TypeL] with content "L3".
	CommandL3 = &CommandStub[TypeL]{Content: "L3"}

	// CommandM1 is command of type [TypeM] with content "M1".
	CommandM1 = &CommandStub[TypeM]{Content: "M1"}
	// CommandM2 is command of type [TypeM] with content "M2".
	CommandM2 = &CommandStub[TypeM]{Content: "M2"}
	// CommandM3 is command of type [TypeM] with content "M3".
	CommandM3 = &CommandStub[TypeM]{Content: "M3"}

	// CommandN1 is command of type [TypeN] with content "N1".
	CommandN1 = &CommandStub[TypeN]{Content: "N1"}
	// CommandN2 is command of type [TypeN] with content "N2".
	CommandN2 = &CommandStub[TypeN]{Content: "N2"}
	// CommandN3 is command of type [TypeN] with content "N3".
	CommandN3 = &CommandStub[TypeN]{Content: "N3"}

	// CommandO1 is command of type [TypeO] with content "O1".
	CommandO1 = &CommandStub[TypeO]{Content: "O1"}
	// CommandO2 is command of type [TypeO] with content "O2".
	CommandO2 = &CommandStub[TypeO]{Content: "O2"}
	// CommandO3 is command of type [TypeO] with content "O3".
	CommandO3 = &CommandStub[TypeO]{Content: "O3"}

	// CommandP1 is command of type [TypeP] with content "P1".
	CommandP1 = &CommandStub[TypeP]{Content: "P1"}
	// CommandP2 is command of type [TypeP] with content "P2".
	CommandP2 = &CommandStub[TypeP]{Content: "P2"}
	// CommandP3 is command of type [TypeP] with content "P3".
	CommandP3 = &CommandStub[TypeP]{Content: "P3"}

	// CommandQ1 is command of type [TypeQ] with content "Q1".
	CommandQ1 = &CommandStub[TypeQ]{Content: "Q1"}
	// CommandQ2 is command of type [TypeQ] with content "Q2".
	CommandQ2 = &CommandStub[TypeQ]{Content: "Q2"}
	// CommandQ3 is command of type [TypeQ] with content "Q3".
	CommandQ3 = &CommandStub[TypeQ]{Content: "Q3"}

	// CommandR1 is command of type [TypeR] with content "R1".
	CommandR1 = &CommandStub[TypeR]{Content: "R1"}
	// CommandR2 is command of type [TypeR] with content "R2".
	CommandR2 = &CommandStub[TypeR]{Content: "R2"}
	// CommandR3 is command of type [TypeR] with content "R3".
	CommandR3 = &CommandStub[TypeR]{Content: "R3"}

	// CommandS1 is command of type [TypeS] with content "S1".
	CommandS1 = &CommandStub[TypeS]{Content: "S1"}
	// CommandS2 is command of type [TypeS] with content "S2".
	CommandS2 = &CommandStub[TypeS]{Content: "S2"}
	// CommandS3 is command of type [TypeS] with content "S3".
	CommandS3 = &CommandStub[TypeS]{Content: "S3"}

	// CommandT1 is command of type [TypeT] with content "T1".
	CommandT1 = &CommandStub[TypeT]{Content: "T1"}
	// CommandT2 is command of type [TypeT] with content "T2".
	CommandT2 = &CommandStub[TypeT]{Content: "T2"}
	// CommandT3 is command of type [TypeT] with content "T3".
	CommandT3 = &CommandStub[TypeT]{Content: "T3"}

	// CommandU1 is command of type [TypeU] with content "U1".
	CommandU1 = &CommandStub[TypeU]{Content: "U1"}
	// CommandU2 is command of type [TypeU] with content "U2".
	CommandU2 = &CommandStub[TypeU]{Content: "U2"}
	// CommandU3 is command of type [TypeU] with content "U3".
	CommandU3 = &CommandStub[TypeU]{Content: "U3"}

	// CommandV1 is command of type [TypeV] with content "V1".
	CommandV1 = &CommandStub[TypeV]{Content: "V1"}
	// CommandV2 is command of type [TypeV] with content "V2".
	CommandV2 = &CommandStub[TypeV]{Content: "V2"}
	// CommandV3 is command of type [TypeV] with content "V3".
	CommandV3 = &CommandStub[TypeV]{Content: "V3"}

	// CommandW1 is command of type [TypeW] with content "W1".
	CommandW1 = &CommandStub[TypeW]{Content: "W1"}
	// CommandW2 is command of type [TypeW] with content "W2".
	CommandW2 = &CommandStub[TypeW]{Content: "W2"}
	// CommandW3 is command of type [TypeW] with content "W3".
	CommandW3 = &CommandStub[TypeW]{Content: "W3"}

	// CommandX1 is command of type [TypeX] with content "X1".
	CommandX1 = &CommandStub[TypeX]{Content: "X1"}
	// CommandX2 is command of type [TypeX] with content "X2".
	CommandX2 = &CommandStub[TypeX]{Content: "X2"}
	// CommandX3 is command of type [TypeX] with content "X3".
	CommandX3 = &CommandStub[TypeX]{Content: "X3"}

	// CommandY1 is command of type [TypeY] with content "Y1".
	CommandY1 = &CommandStub[TypeY]{Content: "Y1"}
	// CommandY2 is command of type [TypeY] with content "Y2".
	CommandY2 = &CommandStub[TypeY]{Content: "Y2"}
	// CommandY3 is command of type [TypeY] with content "Y3".
	CommandY3 = &CommandStub[TypeY]{Content: "Y3"}

	// CommandZ1 is command of type [TypeZ] with content "Z1".
	CommandZ1 = &CommandStub[TypeZ]{Content: "Z1"}
	// CommandZ2 is command of type [TypeZ] with content "Z2".
	CommandZ2 = &CommandStub[TypeZ]{Content: "Z2"}
	// CommandZ3 is command of type [TypeZ] with content "Z3".
	CommandZ3 = &CommandStub[TypeZ]{Content: "Z3"}
)

var (
	// EventA1 is event of type [TypeA] with content "A1".
	EventA1 = &EventStub[TypeA]{Content: "A1"}
	// EventA2 is event of type [TypeA] with content "A2".
	EventA2 = &EventStub[TypeA]{Content: "A2"}
	// EventA3 is event of type [TypeA] with content "A3".
	EventA3 = &EventStub[TypeA]{Content: "A3"}

	// EventB1 is event of type [TypeB] with content "B1".
	EventB1 = &EventStub[TypeB]{Content: "B1"}
	// EventB2 is event of type [TypeB] with content "B2".
	EventB2 = &EventStub[TypeB]{Content: "B2"}
	// EventB3 is event of type [TypeB] with content "B3".
	EventB3 = &EventStub[TypeB]{Content: "B3"}

	// EventC1 is event of type [TypeC] with content "C1".
	EventC1 = &EventStub[TypeC]{Content: "C1"}
	// EventC2 is event of type [TypeC] with content "C2".
	EventC2 = &EventStub[TypeC]{Content: "C2"}
	// EventC3 is event of type [TypeC] with content "C3".
	EventC3 = &EventStub[TypeC]{Content: "C3"}

	// EventD1 is event of type [TypeD] with content "D1".
	EventD1 = &EventStub[TypeD]{Content: "D1"}
	// EventD2 is event of type [TypeD] with content "D2".
	EventD2 = &EventStub[TypeD]{Content: "D2"}
	// EventD3 is event of type [TypeD] with content "D3".
	EventD3 = &EventStub[TypeD]{Content: "D3"}

	// EventE1 is event of type [TypeE] with content "E1".
	EventE1 = &EventStub[TypeE]{Content: "E1"}
	// EventE2 is event of type [TypeE] with content "E2".
	EventE2 = &EventStub[TypeE]{Content: "E2"}
	// EventE3 is event of type [TypeE] with content "E3".
	EventE3 = &EventStub[TypeE]{Content: "E3"}

	// EventF1 is event of type [TypeF] with content "F1".
	EventF1 = &EventStub[TypeF]{Content: "F1"}
	// EventF2 is event of type [TypeF] with content "F2".
	EventF2 = &EventStub[TypeF]{Content: "F2"}
	// EventF3 is event of type [TypeF] with content "F3".
	EventF3 = &EventStub[TypeF]{Content: "F3"}

	// EventG1 is event of type [TypeG] with content "G1".
	EventG1 = &EventStub[TypeG]{Content: "G1"}
	// EventG2 is event of type [TypeG] with content "G2".
	EventG2 = &EventStub[TypeG]{Content: "G2"}
	// EventG3 is event of type [TypeG] with content "G3".
	EventG3 = &EventStub[TypeG]{Content: "G3"}

	// EventH1 is event of type [TypeH] with content "H1".
	EventH1 = &EventStub[TypeH]{Content: "H1"}
	// EventH2 is event of type [TypeH] with content "H2".
	EventH2 = &EventStub[TypeH]{Content: "H2"}
	// EventH3 is event of type [TypeH] with content "H3".
	EventH3 = &EventStub[TypeH]{Content: "H3"}

	// EventI1 is event of type [TypeI] with content "I1".
	EventI1 = &EventStub[TypeI]{Content: "I1"}
	// EventI2 is event of type [TypeI] with content "I2".
	EventI2 = &EventStub[TypeI]{Content: "I2"}
	// EventI3 is event of type [TypeI] with content "I3".
	EventI3 = &EventStub[TypeI]{Content: "I3"}

	// EventJ1 is event of type [TypeJ] with content "J1".
	EventJ1 = &EventStub[TypeJ]{Content: "J1"}
	// EventJ2 is event of type [TypeJ] with content "J2".
	EventJ2 = &EventStub[TypeJ]{Content: "J2"}
	// EventJ3 is event of type [TypeJ] with content "J3".
	EventJ3 = &EventStub[TypeJ]{Content: "J3"}

	// EventK1 is event of type [TypeK] with content "K1".
	EventK1 = &EventStub[TypeK]{Content: "K1"}
	// EventK2 is event of type [TypeK] with content "K2".
	EventK2 = &EventStub[TypeK]{Content: "K2"}
	// EventK3 is event of type [TypeK] with content "K3".
	EventK3 = &EventStub[TypeK]{Content: "K3"}

	// EventL1 is event of type [TypeL] with content "L1".
	EventL1 = &EventStub[TypeL]{Content: "L1"}
	// EventL2 is event of type [TypeL] with content "L2".
	EventL2 = &EventStub[TypeL]{Content: "L2"}
	// EventL3 is event of type [TypeL] with content "L3".
	EventL3 = &EventStub[TypeL]{Content: "L3"}

	// EventM1 is event of type [TypeM] with content "M1".
	EventM1 = &EventStub[TypeM]{Content: "M1"}
	// EventM2 is event of type [TypeM] with content "M2".
	EventM2 = &EventStub[TypeM]{Content: "M2"}
	// EventM3 is event of type [TypeM] with content "M3".
	EventM3 = &EventStub[TypeM]{Content: "M3"}

	// EventN1 is event of type [TypeN] with content "N1".
	EventN1 = &EventStub[TypeN]{Content: "N1"}
	// EventN2 is event of type [TypeN] with content "N2".
	EventN2 = &EventStub[TypeN]{Content: "N2"}
	// EventN3 is event of type [TypeN] with content "N3".
	EventN3 = &EventStub[TypeN]{Content: "N3"}

	// EventO1 is event of type [TypeO] with content "O1".
	EventO1 = &EventStub[TypeO]{Content: "O1"}
	// EventO2 is event of type [TypeO] with content "O2".
	EventO2 = &EventStub[TypeO]{Content: "O2"}
	// EventO3 is event of type [TypeO] with content "O3".
	EventO3 = &EventStub[TypeO]{Content: "O3"}

	// EventP1 is event of type [TypeP] with content "P1".
	EventP1 = &EventStub[TypeP]{Content: "P1"}
	// EventP2 is event of type [TypeP] with content "P2".
	EventP2 = &EventStub[TypeP]{Content: "P2"}
	// EventP3 is event of type [TypeP] with content "P3".
	EventP3 = &EventStub[TypeP]{Content: "P3"}

	// EventQ1 is event of type [TypeQ] with content "Q1".
	EventQ1 = &EventStub[TypeQ]{Content: "Q1"}
	// EventQ2 is event of type [TypeQ] with content "Q2".
	EventQ2 = &EventStub[TypeQ]{Content: "Q2"}
	// EventQ3 is event of type [TypeQ] with content "Q3".
	EventQ3 = &EventStub[TypeQ]{Content: "Q3"}

	// EventR1 is event of type [TypeR] with content "R1".
	EventR1 = &EventStub[TypeR]{Content: "R1"}
	// EventR2 is event of type [TypeR] with content "R2".
	EventR2 = &EventStub[TypeR]{Content: "R2"}
	// EventR3 is event of type [TypeR] with content "R3".
	EventR3 = &EventStub[TypeR]{Content: "R3"}

	// EventS1 is event of type [TypeS] with content "S1".
	EventS1 = &EventStub[TypeS]{Content: "S1"}
	// EventS2 is event of type [TypeS] with content "S2".
	EventS2 = &EventStub[TypeS]{Content: "S2"}
	// EventS3 is event of type [TypeS] with content "S3".
	EventS3 = &EventStub[TypeS]{Content: "S3"}

	// EventT1 is event of type [TypeT] with content "T1".
	EventT1 = &EventStub[TypeT]{Content: "T1"}
	// EventT2 is event of type [TypeT] with content "T2".
	EventT2 = &EventStub[TypeT]{Content: "T2"}
	// EventT3 is event of type [TypeT] with content "T3".
	EventT3 = &EventStub[TypeT]{Content: "T3"}

	// EventU1 is event of type [TypeU] with content "U1".
	EventU1 = &EventStub[TypeU]{Content: "U1"}
	// EventU2 is event of type [TypeU] with content "U2".
	EventU2 = &EventStub[TypeU]{Content: "U2"}
	// EventU3 is event of type [TypeU] with content "U3".
	EventU3 = &EventStub[TypeU]{Content: "U3"}

	// EventV1 is event of type [TypeV] with content "V1".
	EventV1 = &EventStub[TypeV]{Content: "V1"}
	// EventV2 is event of type [TypeV] with content "V2".
	EventV2 = &EventStub[TypeV]{Content: "V2"}
	// EventV3 is event of type [TypeV] with content "V3".
	EventV3 = &EventStub[TypeV]{Content: "V3"}

	// EventW1 is event of type [TypeW] with content "W1".
	EventW1 = &EventStub[TypeW]{Content: "W1"}
	// EventW2 is event of type [TypeW] with content "W2".
	EventW2 = &EventStub[TypeW]{Content: "W2"}
	// EventW3 is event of type [TypeW] with content "W3".
	EventW3 = &EventStub[TypeW]{Content: "W3"}

	// EventX1 is event of type [TypeX] with content "X1".
	EventX1 = &EventStub[TypeX]{Content: "X1"}
	// EventX2 is event of type [TypeX] with content "X2".
	EventX2 = &EventStub[TypeX]{Content: "X2"}
	// EventX3 is event of type [TypeX] with content "X3".
	EventX3 = &EventStub[TypeX]{Content: "X3"}

	// EventY1 is event of type [TypeY] with content "Y1".
	EventY1 = &EventStub[TypeY]{Content: "Y1"}
	// EventY2 is event of type [TypeY] with content "Y2".
	EventY2 = &EventStub[TypeY]{Content: "Y2"}
	// EventY3 is event of type [TypeY] with content "Y3".
	EventY3 = &EventStub[TypeY]{Content: "Y3"}

	// EventZ1 is event of type [TypeZ] with content "Z1".
	EventZ1 = &EventStub[TypeZ]{Content: "Z1"}
	// EventZ2 is event of type [TypeZ] with content "Z2".
	EventZ2 = &EventStub[TypeZ]{Content: "Z2"}
	// EventZ3 is event of type [TypeZ] with content "Z3".
	EventZ3 = &EventStub[TypeZ]{Content: "Z3"}
)

var (
	// DeadlineA1 is a deadline of type [TypeA] with content "A1".
	DeadlineA1 = &DeadlineStub[TypeA]{Content: "A1"}
	// DeadlineA2 is a deadline of type [TypeA] with content "A2".
	DeadlineA2 = &DeadlineStub[TypeA]{Content: "A2"}
	// DeadlineA3 is a deadline of type [TypeA] with content "A3".
	DeadlineA3 = &DeadlineStub[TypeA]{Content: "A3"}

	// DeadlineB1 is a deadline of type [TypeB] with content "B1".
	DeadlineB1 = &DeadlineStub[TypeB]{Content: "B1"}
	// DeadlineB2 is a deadline of type [TypeB] with content "B2".
	DeadlineB2 = &DeadlineStub[TypeB]{Content: "B2"}
	// DeadlineB3 is a deadline of type [TypeB] with content "B3".
	DeadlineB3 = &DeadlineStub[TypeB]{Content: "B3"}

	// DeadlineC1 is a deadline of type [TypeC] with content "C1".
	DeadlineC1 = &DeadlineStub[TypeC]{Content: "C1"}
	// DeadlineC2 is a deadline of type [TypeC] with content "C2".
	DeadlineC2 = &DeadlineStub[TypeC]{Content: "C2"}
	// DeadlineC3 is a deadline of type [TypeC] with content "C3".
	DeadlineC3 = &DeadlineStub[TypeC]{Content: "C3"}

	// DeadlineD1 is a deadline of type [TypeD] with content "D1".
	DeadlineD1 = &DeadlineStub[TypeD]{Content: "D1"}
	// DeadlineD2 is a deadline of type [TypeD] with content "D2".
	DeadlineD2 = &DeadlineStub[TypeD]{Content: "D2"}
	// DeadlineD3 is a deadline of type [TypeD] with content "D3".
	DeadlineD3 = &DeadlineStub[TypeD]{Content: "D3"}

	// DeadlineE1 is a deadline of type [TypeE] with content "E1".
	DeadlineE1 = &DeadlineStub[TypeE]{Content: "E1"}
	// DeadlineE2 is a deadline of type [TypeE] with content "E2".
	DeadlineE2 = &DeadlineStub[TypeE]{Content: "E2"}
	// DeadlineE3 is a deadline of type [TypeE] with content "E3".
	DeadlineE3 = &DeadlineStub[TypeE]{Content: "E3"}

	// DeadlineF1 is a deadline of type [TypeF] with content "F1".
	DeadlineF1 = &DeadlineStub[TypeF]{Content: "F1"}
	// DeadlineF2 is a deadline of type [TypeF] with content "F2".
	DeadlineF2 = &DeadlineStub[TypeF]{Content: "F2"}
	// DeadlineF3 is a deadline of type [TypeF] with content "F3".
	DeadlineF3 = &DeadlineStub[TypeF]{Content: "F3"}

	// DeadlineG1 is a deadline of type [TypeG] with content "G1".
	DeadlineG1 = &DeadlineStub[TypeG]{Content: "G1"}
	// DeadlineG2 is a deadline of type [TypeG] with content "G2".
	DeadlineG2 = &DeadlineStub[TypeG]{Content: "G2"}
	// DeadlineG3 is a deadline of type [TypeG] with content "G3".
	DeadlineG3 = &DeadlineStub[TypeG]{Content: "G3"}

	// DeadlineH1 is a deadline of type [TypeH] with content "H1".
	DeadlineH1 = &DeadlineStub[TypeH]{Content: "H1"}
	// DeadlineH2 is a deadline of type [TypeH] with content "H2".
	DeadlineH2 = &DeadlineStub[TypeH]{Content: "H2"}
	// DeadlineH3 is a deadline of type [TypeH] with content "H3".
	DeadlineH3 = &DeadlineStub[TypeH]{Content: "H3"}

	// DeadlineI1 is a deadline of type [TypeI] with content "I1".
	DeadlineI1 = &DeadlineStub[TypeI]{Content: "I1"}
	// DeadlineI2 is a deadline of type [TypeI] with content "I2".
	DeadlineI2 = &DeadlineStub[TypeI]{Content: "I2"}
	// DeadlineI3 is a deadline of type [TypeI] with content "I3".
	DeadlineI3 = &DeadlineStub[TypeI]{Content: "I3"}

	// DeadlineJ1 is a deadline of type [TypeJ] with content "J1".
	DeadlineJ1 = &DeadlineStub[TypeJ]{Content: "J1"}
	// DeadlineJ2 is a deadline of type [TypeJ] with content "J2".
	DeadlineJ2 = &DeadlineStub[TypeJ]{Content: "J2"}
	// DeadlineJ3 is a deadline of type [TypeJ] with content "J3".
	DeadlineJ3 = &DeadlineStub[TypeJ]{Content: "J3"}

	// DeadlineK1 is a deadline of type [TypeK] with content "K1".
	DeadlineK1 = &DeadlineStub[TypeK]{Content: "K1"}
	// DeadlineK2 is a deadline of type [TypeK] with content "K2".
	DeadlineK2 = &DeadlineStub[TypeK]{Content: "K2"}
	// DeadlineK3 is a deadline of type [TypeK] with content "K3".
	DeadlineK3 = &DeadlineStub[TypeK]{Content: "K3"}

	// DeadlineL1 is a deadline of type [TypeL] with content "L1".
	DeadlineL1 = &DeadlineStub[TypeL]{Content: "L1"}
	// DeadlineL2 is a deadline of type [TypeL] with content "L2".
	DeadlineL2 = &DeadlineStub[TypeL]{Content: "L2"}
	// DeadlineL3 is a deadline of type [TypeL] with content "L3".
	DeadlineL3 = &DeadlineStub[TypeL]{Content: "L3"}

	// DeadlineM1 is a deadline of type [TypeM] with content "M1".
	DeadlineM1 = &DeadlineStub[TypeM]{Content: "M1"}
	// DeadlineM2 is a deadline of type [TypeM] with content "M2".
	DeadlineM2 = &DeadlineStub[TypeM]{Content: "M2"}
	// DeadlineM3 is a deadline of type [TypeM] with content "M3".
	DeadlineM3 = &DeadlineStub[TypeM]{Content: "M3"}

	// DeadlineN1 is a deadline of type [TypeN] with content "N1".
	DeadlineN1 = &DeadlineStub[TypeN]{Content: "N1"}
	// DeadlineN2 is a deadline of type [TypeN] with content "N2".
	DeadlineN2 = &DeadlineStub[TypeN]{Content: "N2"}
	// DeadlineN3 is a deadline of type [TypeN] with content "N3".
	DeadlineN3 = &DeadlineStub[TypeN]{Content: "N3"}

	// DeadlineO1 is a deadline of type [TypeO] with content "O1".
	DeadlineO1 = &DeadlineStub[TypeO]{Content: "O1"}
	// DeadlineO2 is a deadline of type [TypeO] with content "O2".
	DeadlineO2 = &DeadlineStub[TypeO]{Content: "O2"}
	// DeadlineO3 is a deadline of type [TypeO] with content "O3".
	DeadlineO3 = &DeadlineStub[TypeO]{Content: "O3"}

	// DeadlineP1 is a deadline of type [TypeP] with content "P1".
	DeadlineP1 = &DeadlineStub[TypeP]{Content: "P1"}
	// DeadlineP2 is a deadline of type [TypeP] with content "P2".
	DeadlineP2 = &DeadlineStub[TypeP]{Content: "P2"}
	// DeadlineP3 is a deadline of type [TypeP] with content "P3".
	DeadlineP3 = &DeadlineStub[TypeP]{Content: "P3"}

	// DeadlineQ1 is a deadline of type [TypeQ] with content "Q1".
	DeadlineQ1 = &DeadlineStub[TypeQ]{Content: "Q1"}
	// DeadlineQ2 is a deadline of type [TypeQ] with content "Q2".
	DeadlineQ2 = &DeadlineStub[TypeQ]{Content: "Q2"}
	// DeadlineQ3 is a deadline of type [TypeQ] with content "Q3".
	DeadlineQ3 = &DeadlineStub[TypeQ]{Content: "Q3"}

	// DeadlineR1 is a deadline of type [TypeR] with content "R1".
	DeadlineR1 = &DeadlineStub[TypeR]{Content: "R1"}
	// DeadlineR2 is a deadline of type [TypeR] with content "R2".
	DeadlineR2 = &DeadlineStub[TypeR]{Content: "R2"}
	// DeadlineR3 is a deadline of type [TypeR] with content "R3".
	DeadlineR3 = &DeadlineStub[TypeR]{Content: "R3"}

	// DeadlineS1 is a deadline of type [TypeS] with content "S1".
	DeadlineS1 = &DeadlineStub[TypeS]{Content: "S1"}
	// DeadlineS2 is a deadline of type [TypeS] with content "S2".
	DeadlineS2 = &DeadlineStub[TypeS]{Content: "S2"}
	// DeadlineS3 is a deadline of type [TypeS] with content "S3".
	DeadlineS3 = &DeadlineStub[TypeS]{Content: "S3"}

	// DeadlineT1 is a deadline of type [TypeT] with content "T1".
	DeadlineT1 = &DeadlineStub[TypeT]{Content: "T1"}
	// DeadlineT2 is a deadline of type [TypeT] with content "T2".
	DeadlineT2 = &DeadlineStub[TypeT]{Content: "T2"}
	// DeadlineT3 is a deadline of type [TypeT] with content "T3".
	DeadlineT3 = &DeadlineStub[TypeT]{Content: "T3"}

	// DeadlineU1 is a deadline of type [TypeU] with content "U1".
	DeadlineU1 = &DeadlineStub[TypeU]{Content: "U1"}
	// DeadlineU2 is a deadline of type [TypeU] with content "U2".
	DeadlineU2 = &DeadlineStub[TypeU]{Content: "U2"}
	// DeadlineU3 is a deadline of type [TypeU] with content "U3".
	DeadlineU3 = &DeadlineStub[TypeU]{Content: "U3"}

	// DeadlineV1 is a deadline of type [TypeV] with content "V1".
	DeadlineV1 = &DeadlineStub[TypeV]{Content: "V1"}
	// DeadlineV2 is a deadline of type [TypeV] with content "V2".
	DeadlineV2 = &DeadlineStub[TypeV]{Content: "V2"}
	// DeadlineV3 is a deadline of type [TypeV] with content "V3".
	DeadlineV3 = &DeadlineStub[TypeV]{Content: "V3"}

	// DeadlineW1 is a deadline of type [TypeW] with content "W1".
	DeadlineW1 = &DeadlineStub[TypeW]{Content: "W1"}
	// DeadlineW2 is a deadline of type [TypeW] with content "W2".
	DeadlineW2 = &DeadlineStub[TypeW]{Content: "W2"}
	// DeadlineW3 is a deadline of type [TypeW] with content "W3".
	DeadlineW3 = &DeadlineStub[TypeW]{Content: "W3"}

	// DeadlineX1 is a deadline of type [TypeX] with content "X1".
	DeadlineX1 = &DeadlineStub[TypeX]{Content: "X1"}
	// DeadlineX2 is a deadline of type [TypeX] with content "X2".
	DeadlineX2 = &DeadlineStub[TypeX]{Content: "X2"}
	// DeadlineX3 is a deadline of type [TypeX] with content "X3".
	DeadlineX3 = &DeadlineStub[TypeX]{Content: "X3"}

	// DeadlineY1 is a deadline of type [TypeY] with content "Y1".
	DeadlineY1 = &DeadlineStub[TypeY]{Content: "Y1"}
	// DeadlineY2 is a deadline of type [TypeY] with content "Y2".
	DeadlineY2 = &DeadlineStub[TypeY]{Content: "Y2"}
	// DeadlineY3 is a deadline of type [TypeY] with content "Y3".
	DeadlineY3 = &DeadlineStub[TypeY]{Content: "Y3"}

	// DeadlineZ1 is a deadline of type [TypeZ] with content "Z1".
	DeadlineZ1 = &DeadlineStub[TypeZ]{Content: "Z1"}
	// DeadlineZ2 is a deadline of type [TypeZ] with content "Z2".
	DeadlineZ2 = &DeadlineStub[TypeZ]{Content: "Z2"}
	// DeadlineZ3 is a deadline of type [TypeZ] with content "Z3".
	DeadlineZ3 = &DeadlineStub[TypeZ]{Content: "Z3"}
)

var namePattern = regexp.MustCompile(`(Command|Event|Deadline)Stub\[[^]]+\.Type(.)\]`)

// MessageTypeID returns the RFC 4122 UUID for a message stub of type T.
//
// T must be one of [CommandStub], [EventStub], or [DeadlineStub], with a type
// parameter of [TypeA] to [TypeZ], otherwise the function panics.
func MessageTypeID[T dogma.Message]() string {
	typeName := reflect.TypeFor[T]().String()
	matches := namePattern.FindStringSubmatch(typeName)

	if matches == nil {
		panic("cannot generate message type ID for non-stub message: " + typeName)
	}

	var prefix string
	switch matches[1] {
	case "Command":
		prefix = "c"
	case "Event":
		prefix = "e"
	case "Deadline":
		prefix = "d"
	}

	letter := 0xa + matches[2][0] - 'A' // convert letter to 0-25 range

	return fmt.Sprintf("%s0000000-0000-4000-8000-%012x", prefix, letter)
}

// MessageTypeUUID returns the RFC 4122 UUID for a message stub of type T as
// a [uuidpb.UUID].
//
// T must be one of [CommandStub], [EventStub], or [DeadlineStub], with a type
// parameter of [TypeA] to [TypeZ], otherwise the function panics.
func MessageTypeUUID[T dogma.Message]() *uuidpb.UUID {
	return uuidpb.MustParse(
		MessageTypeID[T](),
	)
}

func init() {
	dogma.RegisterCommand[*CommandStub[TypeA]](MessageTypeID[*CommandStub[TypeA]]())
	dogma.RegisterCommand[*CommandStub[TypeB]](MessageTypeID[*CommandStub[TypeB]]())
	dogma.RegisterCommand[*CommandStub[TypeC]](MessageTypeID[*CommandStub[TypeC]]())
	dogma.RegisterCommand[*CommandStub[TypeD]](MessageTypeID[*CommandStub[TypeD]]())
	dogma.RegisterCommand[*CommandStub[TypeE]](MessageTypeID[*CommandStub[TypeE]]())
	dogma.RegisterCommand[*CommandStub[TypeF]](MessageTypeID[*CommandStub[TypeF]]())
	dogma.RegisterCommand[*CommandStub[TypeG]](MessageTypeID[*CommandStub[TypeG]]())
	dogma.RegisterCommand[*CommandStub[TypeH]](MessageTypeID[*CommandStub[TypeH]]())
	dogma.RegisterCommand[*CommandStub[TypeI]](MessageTypeID[*CommandStub[TypeI]]())
	dogma.RegisterCommand[*CommandStub[TypeJ]](MessageTypeID[*CommandStub[TypeJ]]())
	dogma.RegisterCommand[*CommandStub[TypeK]](MessageTypeID[*CommandStub[TypeK]]())
	dogma.RegisterCommand[*CommandStub[TypeL]](MessageTypeID[*CommandStub[TypeL]]())
	dogma.RegisterCommand[*CommandStub[TypeM]](MessageTypeID[*CommandStub[TypeM]]())
	dogma.RegisterCommand[*CommandStub[TypeN]](MessageTypeID[*CommandStub[TypeN]]())
	dogma.RegisterCommand[*CommandStub[TypeO]](MessageTypeID[*CommandStub[TypeO]]())
	dogma.RegisterCommand[*CommandStub[TypeP]](MessageTypeID[*CommandStub[TypeP]]())
	dogma.RegisterCommand[*CommandStub[TypeQ]](MessageTypeID[*CommandStub[TypeQ]]())
	dogma.RegisterCommand[*CommandStub[TypeR]](MessageTypeID[*CommandStub[TypeR]]())
	dogma.RegisterCommand[*CommandStub[TypeS]](MessageTypeID[*CommandStub[TypeS]]())
	dogma.RegisterCommand[*CommandStub[TypeT]](MessageTypeID[*CommandStub[TypeT]]())
	dogma.RegisterCommand[*CommandStub[TypeU]](MessageTypeID[*CommandStub[TypeU]]())
	dogma.RegisterCommand[*CommandStub[TypeV]](MessageTypeID[*CommandStub[TypeV]]())
	dogma.RegisterCommand[*CommandStub[TypeW]](MessageTypeID[*CommandStub[TypeW]]())
	dogma.RegisterCommand[*CommandStub[TypeX]](MessageTypeID[*CommandStub[TypeX]]())
	dogma.RegisterCommand[*CommandStub[TypeY]](MessageTypeID[*CommandStub[TypeY]]())
	dogma.RegisterCommand[*CommandStub[TypeZ]](MessageTypeID[*CommandStub[TypeZ]]())

	dogma.RegisterEvent[*EventStub[TypeA]](MessageTypeID[*EventStub[TypeA]]())
	dogma.RegisterEvent[*EventStub[TypeB]](MessageTypeID[*EventStub[TypeB]]())
	dogma.RegisterEvent[*EventStub[TypeC]](MessageTypeID[*EventStub[TypeC]]())
	dogma.RegisterEvent[*EventStub[TypeD]](MessageTypeID[*EventStub[TypeD]]())
	dogma.RegisterEvent[*EventStub[TypeE]](MessageTypeID[*EventStub[TypeE]]())
	dogma.RegisterEvent[*EventStub[TypeF]](MessageTypeID[*EventStub[TypeF]]())
	dogma.RegisterEvent[*EventStub[TypeG]](MessageTypeID[*EventStub[TypeG]]())
	dogma.RegisterEvent[*EventStub[TypeH]](MessageTypeID[*EventStub[TypeH]]())
	dogma.RegisterEvent[*EventStub[TypeI]](MessageTypeID[*EventStub[TypeI]]())
	dogma.RegisterEvent[*EventStub[TypeJ]](MessageTypeID[*EventStub[TypeJ]]())
	dogma.RegisterEvent[*EventStub[TypeK]](MessageTypeID[*EventStub[TypeK]]())
	dogma.RegisterEvent[*EventStub[TypeL]](MessageTypeID[*EventStub[TypeL]]())
	dogma.RegisterEvent[*EventStub[TypeM]](MessageTypeID[*EventStub[TypeM]]())
	dogma.RegisterEvent[*EventStub[TypeN]](MessageTypeID[*EventStub[TypeN]]())
	dogma.RegisterEvent[*EventStub[TypeO]](MessageTypeID[*EventStub[TypeO]]())
	dogma.RegisterEvent[*EventStub[TypeP]](MessageTypeID[*EventStub[TypeP]]())
	dogma.RegisterEvent[*EventStub[TypeQ]](MessageTypeID[*EventStub[TypeQ]]())
	dogma.RegisterEvent[*EventStub[TypeR]](MessageTypeID[*EventStub[TypeR]]())
	dogma.RegisterEvent[*EventStub[TypeS]](MessageTypeID[*EventStub[TypeS]]())
	dogma.RegisterEvent[*EventStub[TypeT]](MessageTypeID[*EventStub[TypeT]]())
	dogma.RegisterEvent[*EventStub[TypeU]](MessageTypeID[*EventStub[TypeU]]())
	dogma.RegisterEvent[*EventStub[TypeV]](MessageTypeID[*EventStub[TypeV]]())
	dogma.RegisterEvent[*EventStub[TypeW]](MessageTypeID[*EventStub[TypeW]]())
	dogma.RegisterEvent[*EventStub[TypeX]](MessageTypeID[*EventStub[TypeX]]())
	dogma.RegisterEvent[*EventStub[TypeY]](MessageTypeID[*EventStub[TypeY]]())
	dogma.RegisterEvent[*EventStub[TypeZ]](MessageTypeID[*EventStub[TypeZ]]())

	dogma.RegisterDeadline[*DeadlineStub[TypeA]](MessageTypeID[*DeadlineStub[TypeA]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeB]](MessageTypeID[*DeadlineStub[TypeB]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeC]](MessageTypeID[*DeadlineStub[TypeC]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeD]](MessageTypeID[*DeadlineStub[TypeD]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeE]](MessageTypeID[*DeadlineStub[TypeE]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeF]](MessageTypeID[*DeadlineStub[TypeF]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeG]](MessageTypeID[*DeadlineStub[TypeG]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeH]](MessageTypeID[*DeadlineStub[TypeH]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeI]](MessageTypeID[*DeadlineStub[TypeI]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeJ]](MessageTypeID[*DeadlineStub[TypeJ]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeK]](MessageTypeID[*DeadlineStub[TypeK]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeL]](MessageTypeID[*DeadlineStub[TypeL]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeM]](MessageTypeID[*DeadlineStub[TypeM]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeN]](MessageTypeID[*DeadlineStub[TypeN]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeO]](MessageTypeID[*DeadlineStub[TypeO]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeP]](MessageTypeID[*DeadlineStub[TypeP]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeQ]](MessageTypeID[*DeadlineStub[TypeQ]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeR]](MessageTypeID[*DeadlineStub[TypeR]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeS]](MessageTypeID[*DeadlineStub[TypeS]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeT]](MessageTypeID[*DeadlineStub[TypeT]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeU]](MessageTypeID[*DeadlineStub[TypeU]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeV]](MessageTypeID[*DeadlineStub[TypeV]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeW]](MessageTypeID[*DeadlineStub[TypeW]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeX]](MessageTypeID[*DeadlineStub[TypeX]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeY]](MessageTypeID[*DeadlineStub[TypeY]]())
	dogma.RegisterDeadline[*DeadlineStub[TypeZ]](MessageTypeID[*DeadlineStub[TypeZ]]())
}
