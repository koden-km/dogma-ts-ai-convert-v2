package maps

import (
	"iter"
	"maps"
)

// Map is an unordered map of keys of type K to values of type V.
//
// It provides the common interface implemented by all map types in this package
// to Go's built-in map type.
type Map[K comparable, V any] struct {
	elements map[K]V
}

// New returns a [Map] containing the given key/value pairs.
func New[K comparable, V any](pairs ...Pair[K, V]) *Map[K, V] {
	var m Map[K, V]

	for _, p := range pairs {
		m.Set(p.Key, p.Value)
	}

	return &m
}

// NewFromSeq returns a [Map] containing the key/value pairs from the given
// sequence.
func NewFromSeq[K comparable, V any](seq iter.Seq2[K, V]) *Map[K, V] {
	var m Map[K, V]

	for k, v := range seq {
		m.Set(k, v)
	}

	return &m
}

// Set sets the value associated with the given key.
func (m *Map[K, V]) Set(k K, v V) *Map[K, V] {
	if m == nil {
		panic("Set() called on a nil map")
	}

	if m.elements == nil {
		m.elements = map[K]V{}
	}

	m.elements[k] = v

	return m
}

// Update applies fn to the value associated with the given key.
//
// If k is not in the map it is added, an fn is called with a pointer to a new
// zero-value.
func (m *Map[K, V]) Update(k K, fn func(*V)) {
	if m == nil {
		panic("Update() called on a nil map")
	}

	if m.elements == nil {
		m.elements = map[K]V{}
	}

	v := m.elements[k]
	fn(&v)
	m.elements[k] = v
}

// Remove removes the given keys from the map.
func (m *Map[K, V]) Remove(keys ...K) {
	if m != nil {
		for _, k := range keys {
			delete(m.elements, k)
		}
	}
}

// Clear removes all keys from the map.
func (m *Map[K, V]) Clear() {
	if m != nil {
		clear(m.elements)
	}
}

// Len returns the number of elements in the map.
func (m *Map[K, V]) Len() int {
	if m == nil {
		return 0
	}

	return len(m.elements)
}

// Has returns true if all of the given keys are in the map.
func (m *Map[K, V]) Has(keys ...K) bool {
	if m == nil {
		return len(keys) == 0
	}

	for _, k := range keys {
		if _, ok := m.elements[k]; !ok {
			return false
		}
	}

	return true
}

// Get returns the value associated with the given key. It returns the zero
// value if the key is not in the map.
func (m *Map[K, V]) Get(k K) V {
	v, _ := m.TryGet(k)
	return v
}

// TryGet returns the value associated with the given key, or false if the key
// is not in the map.
func (m *Map[K, V]) TryGet(k K) (V, bool) {
	if m == nil {
		var zero V
		return zero, false
	}

	v, ok := m.elements[k]
	return v, ok
}

// Clone returns a shallow copy of the map.
func (m *Map[K, V]) Clone() *Map[K, V] {
	var out Map[K, V]

	if m != nil {
		out.elements = maps.Clone(m.elements)
	}

	return &out
}

// Merge returns a new map containing all key/value pairs from s and x.
//
// If a key is present in both maps, the value from x is used.
func (m *Map[K, V]) Merge(x *Map[K, V]) *Map[K, V] {
	if m.Len() == 0 {
		return x.Clone()
	}

	if x.Len() == 0 {
		return m.Clone()
	}

	elements := maps.Clone(m.elements)

	for k, v := range x.elements {
		elements[k] = v
	}

	return &Map[K, V]{
		elements: elements,
	}
}

// Select returns a new map containing all key/value pairs from m for which the
// given predicate returns true.
func (m *Map[K, V]) Select(pred func(K, V) bool) *Map[K, V] {
	var out Map[K, V]

	if m != nil {
		for k, v := range m.elements {
			if pred(k, v) {
				out.Set(k, v)
			}
		}
	}

	return &out
}

// Project constructs a new map by applying the given transform function to each
// key/value pair in the map. If the transform function returns false, the key
// is omitted from the resulting map.
func (m *Map[K, V]) Project(transform func(K, V) (K, V, bool)) *Map[K, V] {
	var out Map[K, V]

	if m != nil {
		for k, v := range m.elements {
			if k, v, ok := transform(k, v); ok {
				out.Set(k, v)
			}
		}
	}

	return &out
}

// All returns a sequence that yields all key/value pairs in the map in no
// particular order.
func (m *Map[K, V]) All() iter.Seq2[K, V] {
	var elements map[K]V
	if m != nil {
		elements = m.elements
	}
	return maps.All(elements)
}

// Keys returns a sequence that yields all keys in the map in no particular
// order.
func (m *Map[K, V]) Keys() iter.Seq[K] {
	var elements map[K]V
	if m != nil {
		elements = m.elements
	}
	return maps.Keys(elements)
}

// Values returns a sequence that yields all values in the map in no particular
// order.
func (m *Map[K, V]) Values() iter.Seq[V] {
	var elements map[K]V
	if m != nil {
		elements = m.elements
	}
	return maps.Values(elements)
}
