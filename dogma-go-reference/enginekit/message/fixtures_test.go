package message_test

import "github.com/dogmatiq/dogma"

type (
	// partialMessage implements [dogma.Command], but does not implement any of the
	// more specific interfaces.
	partialMessage struct{}

	// ptrCommand implements [dogma.Command] with a pointer receiver.
	ptrCommand struct{}

	// nonPtrCommand implements [dogma.Command] with a non-pointer receiver.
	//
	// As of Dogma v0.17.0 all message types must use pointer receivers
	// (otherwise MarshalBinary() cannot work). However it's still possible to
	// implement a Go type that satisfies [dogma.Message] without pointer
	// receivers, so this type is used to test that such types are rejected.
	nonPtrCommand struct{}
)

func (partialMessage) MessageDescription() string     { panic("not implemented") }
func (partialMessage) MarshalBinary() ([]byte, error) { panic("not implemented") }
func (partialMessage) UnmarshalBinary([]byte) error   { panic("not implemented") }

func (*ptrCommand) MessageDescription() string                  { panic("not implemented") }
func (*ptrCommand) Validate(dogma.CommandValidationScope) error { panic("not implemented") }
func (*ptrCommand) MarshalBinary() ([]byte, error)              { panic("not implemented") }
func (*ptrCommand) UnmarshalBinary([]byte) error                { panic("not implemented") }

func (nonPtrCommand) MessageDescription() string                  { panic("not implemented") }
func (nonPtrCommand) Validate(dogma.CommandValidationScope) error { panic("not implemented") }
func (nonPtrCommand) MarshalBinary() ([]byte, error)              { panic("not implemented") }
func (nonPtrCommand) UnmarshalBinary([]byte) error                { panic("not implemented") }
