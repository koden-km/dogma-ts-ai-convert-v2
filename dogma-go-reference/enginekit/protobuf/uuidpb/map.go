package uuidpb

import (
	"iter"
	"maps"
)

// Map is a map from [UUID] to values of type T.
type Map[T any] struct {
	m map[key]T
}

// Get returns the value associated with the given key.
func (m *Map[T]) Get(k *UUID) (T, bool) {
	if m.Len() == 0 {
		var zero T
		return zero, false
	}

	v, ok := m.m[asKey(k)]
	return v, ok
}

// Has reports whether the map contains a value for the given key.
func (m *Map[T]) Has(k *UUID) bool {
	if m.Len() == 0 {
		return false
	}

	_, ok := m.m[asKey(k)]
	return ok
}

// Set sets the value associated with the given key.
func (m *Map[T]) Set(k *UUID, v T) {
	if m.m == nil {
		m.m = map[key]T{}
	}

	m.m[asKey(k)] = v
}

// Delete removes the value associated with the given key.
func (m *Map[T]) Delete(k *UUID) {
	if m.Len() != 0 {
		delete(m.m, asKey(k))
	}
}

// All yields all key/value pairs in the map.
func (m *Map[T]) All() iter.Seq2[*UUID, T] {
	return func(yield func(*UUID, T) bool) {
		if m != nil {
			for k, v := range m.m {
				if !yield(k.asUUID(), v) {
					return
				}
			}
		}
	}
}

// Keys yields all keys in the map.
func (m *Map[T]) Keys() iter.Seq[*UUID] {
	return func(yield func(*UUID) bool) {
		if m != nil {
			for k := range m.m {
				if !yield(k.asUUID()) {
					return
				}
			}
		}
	}
}

// Values yields all values in the map.
func (m *Map[T]) Values() iter.Seq[T] {
	return func(yield func(T) bool) {
		if m != nil {
			for _, v := range m.m {
				if !yield(v) {
					return
				}
			}
		}
	}
}

// Len returns the number of elements in the map.
func (m *Map[T]) Len() int {
	if m == nil {
		return 0
	}

	return len(m.m)
}

// IsEmpty returns true if the map contains no elements.
func (m *Map[T]) IsEmpty() bool {
	return m == nil || len(m.m) == 0
}

// Clear removes all elements from the map.
func (m *Map[T]) Clear() {
	if m != nil {
		clear(m.m)
	}
}

// Clone returns a shallow copy of the map.
func (m *Map[T]) Clone() *Map[T] {
	if m == nil {
		return nil
	}

	return &Map[T]{
		m: maps.Clone(m.m),
	}
}

// key is a comparable representation of a UUID for use as a map key.
type key struct{ upper, lower uint64 }

// asKey converts a UUID to a key.
func asKey(u *UUID) key {
	return key{u.GetUpper(), u.GetLower()}
}

// asUUID converts a key back to a UUID.
func (k key) asUUID() *UUID {
	return NewUUIDBuilder().
		WithUpper(k.upper).
		WithLower(k.lower).
		Build()
}
