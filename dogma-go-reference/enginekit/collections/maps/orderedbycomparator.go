package maps

import (
	"iter"

	"github.com/dogmatiq/enginekit/collections/constraints"
)

// OrderedByComparator is an an ordered map of keys of type K to values of type
// V with ordering defined by a separate comparitor type.
type OrderedByComparator[K, V any, C constraints.Comparator[K]] struct {
	pairs []Pair[K, V]
}

// NewOrderedByComparator returns an [OrderedByComparator] containing the given key/value
// pairs.
func NewOrderedByComparator[K, V any, C constraints.Comparator[K]](pairs ...Pair[K, V]) *OrderedByComparator[K, V, C] {
	return orderedFromUnsortedPairs[K, V, *OrderedByComparator[K, V, C]](pairs)
}

// NewOrderedByComparatorFromSeq returns an [OrderedByComparator] containing the key/value
// pairs yielded by the given sequence.
func NewOrderedByComparatorFromSeq[K, V any, C constraints.Comparator[K]](seq iter.Seq2[K, V]) *OrderedByComparator[K, V, C] {
	return orderedFromSeq[K, V, *OrderedByComparator[K, V, C]](seq)
}

// Set sets the value associated with the given key.
func (m *OrderedByComparator[K, V, C]) Set(k K, v V) *OrderedByComparator[K, V, C] {
	return orderedSet(m, k, v)
}

// Update applies fn to the value associated with the given key.
//
// If k is not in the map it is added, an fn is called with a pointer to a new
// zero-value.
func (m *OrderedByComparator[K, V, C]) Update(k K, fn func(*V)) {
	orderedUpdate(m, k, fn)
}

// Remove removes the given keys from the map.
func (m *OrderedByComparator[K, V, C]) Remove(keys ...K) {
	orderedRemove(m, keys...)
}

// Clear removes all keys from the map.
func (m *OrderedByComparator[K, V, C]) Clear() {
	orderedClear(m)
}

// Len returns the number of elements in the map.
func (m *OrderedByComparator[K, V, C]) Len() int {
	return orderedLen(m)
}

// Has returns true if all of the given keys are in the map.
func (m *OrderedByComparator[K, V, C]) Has(keys ...K) bool {
	return orderedHas(m, keys...)
}

// Get returns the value associated with the given key. It returns the zero
// value if the key is not in the map.
func (m *OrderedByComparator[K, V, C]) Get(k K) V {
	return orderedGet(m, k)
}

// TryGet returns the value associated with the given key, or false if the key
// is not in the map.
func (m *OrderedByComparator[K, V, C]) TryGet(k K) (V, bool) {
	return orderedTryGet(m, k)
}

// Clone returns a shallow copy of the map.
func (m *OrderedByComparator[K, V, C]) Clone() *OrderedByComparator[K, V, C] {
	return orderedClone(m)
}

// Merge returns a new map containing all key/value pairs from s and x.
//
// If a key is present in both maps, the value from x is used.
func (m *OrderedByComparator[K, V, C]) Merge(x *OrderedByComparator[K, V, C]) *OrderedByComparator[K, V, C] {
	return orderedMerge(m, x)
}

// Select returns a new map containing all key/value pairs from m for which the
// given predicate returns true.
func (m *OrderedByComparator[K, V, C]) Select(pred func(K, V) bool) *OrderedByComparator[K, V, C] {
	return orderedSelect(m, pred)
}

// Project constructs a new map by applying the given transform function to each
// key/value pair in the map. If the transform function returns false, the key
// is omitted from the resulting map.
func (m *OrderedByComparator[K, V, C]) Project(transform func(K, V) (K, V, bool)) *OrderedByComparator[K, V, C] {
	return orderedProject(m, transform)
}

// All returns a sequence that yields all key/value pairs in the map in order.
func (m *OrderedByComparator[K, V, C]) All() iter.Seq2[K, V] {
	return orderedAll(m)
}

// Keys returns a sequence that yields all keys in the map in order.
func (m *OrderedByComparator[K, V, C]) Keys() iter.Seq[K] {
	return orderedKeys(m)
}

// Values returns a sequence that yields all values in the map in order.
func (m *OrderedByComparator[K, V, C]) Values() iter.Seq[V] {
	return orderedValues(m)
}

// Reverse returns a sequence that yields all key/value pairs in the map in
// reverse order.
func (m *OrderedByComparator[K, V, C]) Reverse() iter.Seq2[K, V] {
	return orderedReverse(m)
}

// ReverseKeys returns a sequence that yields all keys in the map in reverse
// order.
func (m *OrderedByComparator[K, V, C]) ReverseKeys() iter.Seq[K] {
	return orderedReverseKeys(m)
}

// ReverseValues returns a sequence that yields all values in the map in reverse
// order.
func (m *OrderedByComparator[K, V, C]) ReverseValues() iter.Seq[V] {
	return orderedReverseValues(m)
}

func (m *OrderedByComparator[K, V, C]) ptr() *[]Pair[K, V] {
	return &m.pairs
}

func (m *OrderedByComparator[K, V, C]) cmp(x, y K) int {
	var c C
	return c.Compare(x, y)
}
