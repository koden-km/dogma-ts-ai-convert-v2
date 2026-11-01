package message

import (
	"reflect"
	"strings"

	"github.com/dogmatiq/dogma"
)

// Type is the representation of a Go type that implements [dogma.Command],
// [dogma.Event] or [dogma.Deadline].
type Type struct {
	r reflect.Type
}

// TypeFor returns the message type for T.
//
// It panics if T does not implement [dogma.Command], [dogma.Event] or
// [dogma.Deadline].
func TypeFor[T dogma.Message]() Type {
	return TypeFromReflect(reflect.TypeFor[T]())
}

// TypeOf returns the message type of m.
//
// It panics if m does not implement [dogma.Command], [dogma.Event] or
// [dogma.Deadline], or if m is nil.
func TypeOf(m dogma.Message) Type {
	return TypeFromReflect(reflect.TypeOf(m))
}

// TypeFromReflect returns the message type for the Go type represented by r.
//
// It panics if r does not implement [dogma.Command], [dogma.Event] or
// [dogma.Deadline], or if r is nil.
func TypeFromReflect(r reflect.Type) Type {
	guardAgainstNonMessage(r)
	return Type{r}
}

// Name returns the fully-qualified name for the Go type that implements the
// message.
func (t Type) Name() Name {
	return nameFromReflect(t.r)
}

// Kind returns the kind of the message represented by t.
//
// It panics if t does not implement [dogma.Command], [dogma.Event] or
// [dogma.Deadline].
func (t Type) Kind() Kind {
	return kindFromReflect(t.r)
}

// ReflectType returns the [reflect.Type] of the message.
func (t Type) ReflectType() reflect.Type {
	return t.r
}

// String returns a human-readable name for the type.
//
// The returned name is not necessarily globally-unique.
func (t Type) String() string {
	return typeToString(t.r)
}

func typeToString(t reflect.Type) string {
	if t.Kind() == reflect.Ptr {
		return "*" + typeToString(t.Elem())
	}

	str := t.String()
	str = strings.ReplaceAll(str, t.PkgPath()+".", "")

	return str
}
