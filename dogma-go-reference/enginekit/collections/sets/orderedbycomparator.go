package sets

import (
	"iter"

	"github.com/dogmatiq/enginekit/collections/constraints"
)

// OrderedByComparator is an ordered set of unique T values where the ordering
// is defined by a separate comparitor type.
type OrderedByComparator[T any, C constraints.Comparator[T]] struct {
	members []T
}

// NewOrderedByComparator returns an [OrderedByComparator] containing the given
// members.
func NewOrderedByComparator[T any, C constraints.Comparator[T]](members ...T) *OrderedByComparator[T, C] {
	return orderedFromUnsortedMembers[T, *OrderedByComparator[T, C]](members)
}

// NewOrderedByComparatorFromSeq returns an [OrderedByComparator] containing the values
// yielded by the given sequence.
func NewOrderedByComparatorFromSeq[T any, C constraints.Comparator[T]](seq iter.Seq[T]) *OrderedByComparator[T, C] {
	return orderedFromSeq[T, *OrderedByComparator[T, C]](seq)
}

// NewOrderedByComparatorFromKeys returns an [OrderedByComparator] containing the keys
// yielded by the given sequence.
func NewOrderedByComparatorFromKeys[T any, C constraints.Comparator[T], unused any](seq iter.Seq2[T, unused]) *OrderedByComparator[T, C] {
	return orderedFromKeys[T, *OrderedByComparator[T, C]](seq)
}

// NewOrderedByComparatorFromValues returns an [OrderedByComparator] containing the
// values yielded by the given sequence.
func NewOrderedByComparatorFromValues[T any, C constraints.Comparator[T], unused any](seq iter.Seq2[unused, T]) *OrderedByComparator[T, C] {
	return orderedFromValues[T, *OrderedByComparator[T, C]](seq)
}

// Add adds the given members to the set.
func (s *OrderedByComparator[T, C]) Add(members ...T) {
	orderedAdd(s, members...)
}

// Remove removes the given members from the set.
func (s *OrderedByComparator[T, C]) Remove(members ...T) {
	orderedRemove(s, members...)
}

// Clear removes all members from the set.
func (s *OrderedByComparator[T, C]) Clear() {
	orderedClear(s)
}

// Len returns the number of members in the set.
func (s *OrderedByComparator[T, C]) Len() int {
	return orderedLen(s)
}

// Has returns true if all of the given values are members of the set.
func (s *OrderedByComparator[T, C]) Has(members ...T) bool {
	return orderedHas(s, members)
}

// IsEqual returns true if s and x have the same members.
func (s *OrderedByComparator[T, C]) IsEqual(x *OrderedByComparator[T, C]) bool {
	return orderedIsEqual(s, x)
}

// IsSuperset returns true if s has all of the members of x.
func (s *OrderedByComparator[T, C]) IsSuperset(x *OrderedByComparator[T, C]) bool {
	return orderedIsSuperset(s, x)
}

// IsSubset returns true if x has all of the members of s.
func (s *OrderedByComparator[T, C]) IsSubset(x *OrderedByComparator[T, C]) bool {
	return x.IsSuperset(s)
}

// IsStrictSuperset returns true if s has all of the members of x and at least
// one member that is not in x.
func (s *OrderedByComparator[T, C]) IsStrictSuperset(x *OrderedByComparator[T, C]) bool {
	return s.Len() > x.Len() && s.IsSuperset(x)
}

// IsStrictSubset returns true if x has all of the members of s and at least one
// member that is not in s.
func (s *OrderedByComparator[T, C]) IsStrictSubset(x *OrderedByComparator[T, C]) bool {
	return x.IsStrictSuperset(s)
}

// Clone returns a shallow copy of the set.
func (s *OrderedByComparator[T, C]) Clone() *OrderedByComparator[T, C] {
	return orderedClone(s)
}

// Union returns a set containing all members of s and x.
func (s *OrderedByComparator[T, C]) Union(x *OrderedByComparator[T, C]) *OrderedByComparator[T, C] {
	return orderedUnion(s, x)
}

// Intersection returns a set containing members that are in both s and x.
func (s *OrderedByComparator[T, C]) Intersection(x *OrderedByComparator[T, C]) *OrderedByComparator[T, C] {
	return orderedIntersection(s, x)
}

// Select returns the subset of s containing members for which the given
// predicate function returns true.
func (s *OrderedByComparator[T, C]) Select(pred func(T) bool) *OrderedByComparator[T, C] {
	return orderedSelect(s, pred)
}

// All returns a sequence that yields all members of the set in order.
func (s *OrderedByComparator[T, C]) All() iter.Seq[T] {
	return orderedAll(s)
}

// Reverse returns a sequence that yields all members of the set in reverse
// order.
func (s *OrderedByComparator[T, C]) Reverse() iter.Seq[T] {
	return orderedReverse(s)
}

func (s *OrderedByComparator[T, C]) ptr() *[]T {
	return &s.members
}

func (s *OrderedByComparator[T, C]) cmp(x, y T) int {
	var c C
	return c.Compare(x, y)
}
