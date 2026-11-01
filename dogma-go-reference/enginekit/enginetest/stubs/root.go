package stubs

import "reflect"

// newRoot returns a new value of R representing the initial state of an
// aggregate or process root.
//
// If R is a pointer type it allocates the pointee; otherwise it returns the
// zero value.
func newRoot[R any]() R {
	var root R

	t := reflect.TypeFor[R]()
	if t.Kind() == reflect.Pointer {
		root = reflect.New(t.Elem()).Interface().(R)
	}

	return root
}
