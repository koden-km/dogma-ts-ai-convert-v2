package message

import (
	"reflect"

	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/internal/typename"
)

// Name is the fully-qualified name of a Go type that implements
// [dogma.Command], [dogma.Event] or [dogma.Deadline].
type Name string

// NameFor returns the [Name] of T.
//
// It panics if T does not implement [dogma.Command], [dogma.Event] or
// [dogma.Deadline].
func NameFor[T dogma.Message]() Name {
	return nameFromReflect(reflect.TypeFor[T]())
}

// NameOf returns the fully-qualified type name of m.
//
// It panics if m does not implement [dogma.Command], [dogma.Event] or
// [dogma.Deadline].
func NameOf(m dogma.Message) Name {
	return nameFromReflect(reflect.TypeOf(m))
}

func nameFromReflect(r reflect.Type) Name {
	guardAgainstNonMessage(r)
	return Name(typename.Get(r))
}
