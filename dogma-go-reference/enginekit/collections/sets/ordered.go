package sets

import (
	"cmp"
	"iter"
)

// Ordered is an ordered set of unique T values.
type Ordered[T cmp.Ordered] struct {
	members []T
}

// NewOrdered returns an [Ordered] containing the given members.
func NewOrdered[T cmp.Ordered](members ...T) *Ordered[T] {
	return orderedFromUnsortedMembers[T, *Ordered[T]](members)
}

// NewOrderedFromSeq returns an [Ordered] containing the values yielded by the
// given sequence.
func NewOrderedFromSeq[T cmp.Ordered](seq iter.Seq[T]) *Ordered[T] {
	return orderedFromSeq[T, *Ordered[T]](seq)
}

// NewOrderedFromKeys returns an [Ordered] containing the keys yielded by the
// given sequence.
func NewOrderedFromKeys[T cmp.Ordered, unused any](seq iter.Seq2[T, unused]) *Ordered[T] {
	return orderedFromKeys[T, *Ordered[T]](seq)
}

// NewOrderedFromValues returns an [Ordered] containing the values yielded by
// the given sequence.
func NewOrderedFromValues[T cmp.Ordered, unused any](seq iter.Seq2[unused, T]) *Ordered[T] {
	return orderedFromValues[T, *Ordered[T]](seq)
}

// Add adds the given members to the set.
func (s *Ordered[T]) Add(members ...T) {
	orderedAdd(s, members...)
}

// Remove removes the given members from the set.
func (s *Ordered[T]) Remove(members ...T) {
	orderedRemove(s, members...)
}

// Clear removes all members from the set.
func (s *Ordered[T]) Clear() {
	orderedClear(s)
}

// Len returns the number of members in the set.
func (s *Ordered[T]) Len() int {
	return orderedLen(s)
}

// Has returns true if all of the given values are members of the set.
func (s *Ordered[T]) Has(members ...T) bool {
	return orderedHas(s, members)
}

// IsEqual returns true if s and x have the same members.
func (s *Ordered[T]) IsEqual(x *Ordered[T]) bool {
	return orderedIsEqual(s, x)
}

// IsSuperset returns true if s has all of the members of x.
func (s *Ordered[T]) IsSuperset(x *Ordered[T]) bool {
	return orderedIsSuperset(s, x)
}

// IsSubset returns true if x has all of the members of s.
func (s *Ordered[T]) IsSubset(x *Ordered[T]) bool {
	return x.IsSuperset(s)
}

// IsStrictSuperset returns true if s has all of the members of x and at least
// one member that is not in x.
func (s *Ordered[T]) IsStrictSuperset(x *Ordered[T]) bool {
	return s.Len() > x.Len() && s.IsSuperset(x)
}

// IsStrictSubset returns true if x has all of the members of s and at least one
// member that is not in s.
func (s *Ordered[T]) IsStrictSubset(x *Ordered[T]) bool {
	return x.IsStrictSuperset(s)
}

// Clone returns a shallow copy of the set.
func (s *Ordered[T]) Clone() *Ordered[T] {
	return orderedClone(s)
}

// Union returns a set containing all members of s and x.
func (s *Ordered[T]) Union(x *Ordered[T]) *Ordered[T] {
	return orderedUnion(s, x)
}

// Intersection returns a set containing members that are in both s and x.
func (s *Ordered[T]) Intersection(x *Ordered[T]) *Ordered[T] {
	return orderedIntersection(s, x)
}

// Select returns the subset of s containing members for which the given
// predicate function returns true.
func (s *Ordered[T]) Select(pred func(T) bool) *Ordered[T] {
	return orderedSelect(s, pred)
}

// All returns a sequence that yields all members of the set in order.
func (s *Ordered[T]) All() iter.Seq[T] {
	return orderedAll(s)
}

// Reverse returns a sequence that yields all members of the set in reverse
// order.
func (s *Ordered[T]) Reverse() iter.Seq[T] {
	return orderedReverse(s)
}

func (s *Ordered[T]) ptr() *[]T {
	return &s.members
}

func (s *Ordered[T]) cmp(x, y T) int {
	return cmp.Compare(x, y)
}
