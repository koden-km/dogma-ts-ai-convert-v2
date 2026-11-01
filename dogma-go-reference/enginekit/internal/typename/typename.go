package typename

import (
	"bytes"
	"go/types"
	"reflect"
	"strings"
)

// For returns the fully-qualified name of T.
func For[T any]() string {
	return Get(reflect.TypeFor[T]())
}

// Of returns the fully-qualified name of v's type.
func Of(v any) string {
	return Get(reflect.TypeOf(v))
}

// OfStatic returns the fully-qualified name of t.
func OfStatic(t types.Type) string {
	switch t := t.(type) {
	case *types.Named:
		return t.String()
	case *types.Pointer:
		return "*" + OfStatic(t.Elem())
	default:
		panic("cannot build name of unnamed type")
	}
}

// Get returns the fully-qualified name of t.
func Get(t reflect.Type) string {
	if t.Name() != "" {
		return t.PkgPath() + "." + t.Name()
	}

	if t.Kind() == reflect.Ptr {
		return "*" + Get(t.Elem())
	}

	panic("cannot build name of unnamed type")
}

// Unqualified returns the unqualified version of the given type name.
func Unqualified(name string) string {
	result := &strings.Builder{}
	atom := &bytes.Buffer{}

	for _, r := range name {
		atom.WriteRune(r)

		switch r {
		case '.':
			atom.Reset()
		case '[', ',', ']':
			atom.WriteTo(result)
			atom.Reset()
		}
	}

	atom.WriteTo(result)

	return result.String()
}
