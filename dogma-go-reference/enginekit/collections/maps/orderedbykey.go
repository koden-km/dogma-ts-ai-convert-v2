package maps

import (
	"iter"

	"github.com/dogmatiq/enginekit/collections/constraints"
)

// OrderedByKey is an an ordered map of keys of type K to values of type V with
// ordering defined by the K.Compare method.
type OrderedByKey[K constraints.Ordered[K], V any] struct {
	pairs []Pair[K, V]
}

// NewOrderedByKey returns an [OrderedByKey] containing the given key/value
// pairs.
func NewOrderedByKey[K constraints.Ordered[K], V any](pairs ...Pair[K, V]) *OrderedByKey[K, V] {
	return orderedFromUnsortedPairs[K, V, *OrderedByKey[K, V]](pairs)
}

// NewOrderedByKeyFromSeq returns an [OrderedByKey] containing the key/value
// pairs yielded by the given sequence.
func NewOrderedByKeyFromSeq[K constraints.Ordered[K], V any](seq iter.Seq2[K, V]) *OrderedByKey[K, V] {
	return orderedFromSeq[K, V, *OrderedByKey[K, V]](seq)
}

// Set sets the value associated with the given key.
func (m *OrderedByKey[K, V]) Set(k K, v V) *OrderedByKey[K, V] {
	return orderedSet(m, k, v)
}

// Update applies fn to the value associated with the given key.
//
// If k is not in the map it is added, an fn is called with a pointer to a new
// zero-value.
func (m *OrderedByKey[K, V]) Update(k K, fn func(*V)) {
	orderedUpdate(m, k, fn)
}

// Remove removes the given keys from the map.
func (m *OrderedByKey[K, V]) Remove(keys ...K) {
	orderedRemove(m, keys...)
}

// Clear removes all keys from the map.
func (m *OrderedByKey[K, V]) Clear() {
	orderedClear(m)
}

// Len returns the number of elements in the map.
func (m *OrderedByKey[K, V]) Len() int {
	return orderedLen(m)
}

// Has returns true if all of the given keys are in the map.
func (m *OrderedByKey[K, V]) Has(keys ...K) bool {
	return orderedHas(m, keys...)
}

// Get returns the value associated with the given key. It returns the zero
// value if the key is not in the map.
func (m *OrderedByKey[K, V]) Get(k K) V {
	return orderedGet(m, k)
}

// TryGet returns the value associated with the given key, or false if the key
// is not in the map.
func (m *OrderedByKey[K, V]) TryGet(k K) (V, bool) {
	return orderedTryGet(m, k)
}

// Clone returns a shallow copy of the map.
func (m *OrderedByKey[K, V]) Clone() *OrderedByKey[K, V] {
	return orderedClone(m)
}

// Merge returns a new map containing all key/value pairs from s and x.
//
// If a key is present in both maps, the value from x is used.
func (m *OrderedByKey[K, V]) Merge(x *OrderedByKey[K, V]) *OrderedByKey[K, V] {
	return orderedMerge(m, x)
}

// Select returns a new map containing all key/value pairs from m for which the
// given predicate returns true.
func (m *OrderedByKey[K, V]) Select(pred func(K, V) bool) *OrderedByKey[K, V] {
	return orderedSelect(m, pred)
}

// Project constructs a new map by applying the given transform function to each
// key/value pair in the map. If the transform function returns false, the key
// is omitted from the resulting map.
func (m *OrderedByKey[K, V]) Project(transform func(K, V) (K, V, bool)) *OrderedByKey[K, V] {
	return orderedProject(m, transform)
}

// All returns a sequence that yields all key/value pairs in the map in order.
func (m *OrderedByKey[K, V]) All() iter.Seq2[K, V] {
	return orderedAll(m)
}

// Keys returns a sequence that yields all keys in the map in order.
func (m *OrderedByKey[K, V]) Keys() iter.Seq[K] {
	return orderedKeys(m)
}

// Values returns a sequence that yields all values in the map in order.
func (m *OrderedByKey[K, V]) Values() iter.Seq[V] {
	return orderedValues(m)
}

// Reverse returns a sequence that yields all key/value pairs in the map in
// reverse order.
func (m *OrderedByKey[K, V]) Reverse() iter.Seq2[K, V] {
	return orderedReverse(m)
}

// ReverseKeys returns a sequence that yields all keys in the map in reverse
// order.
func (m *OrderedByKey[K, V]) ReverseKeys() iter.Seq[K] {
	return orderedReverseKeys(m)
}

// ReverseValues returns a sequence that yields all values in the map in reverse
// order.
func (m *OrderedByKey[K, V]) ReverseValues() iter.Seq[V] {
	return orderedReverseValues(m)
}

func (m *OrderedByKey[K, V]) ptr() *[]Pair[K, V] {
	return &m.pairs
}

func (m *OrderedByKey[K, V]) cmp(x, y K) int {
	return x.Compare(y)
}
