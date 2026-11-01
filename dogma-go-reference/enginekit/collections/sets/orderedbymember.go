package sets

import (
	"iter"

	"github.com/dogmatiq/enginekit/collections/constraints"
)

// OrderedByMember is an ordered set of unique T values with the order defined
// by the T.Compare method.
type OrderedByMember[T constraints.Ordered[T]] struct {
	members []T
}

// NewOrderedByMember returns an [OrderedByMember] containing the given members.
func NewOrderedByMember[T constraints.Ordered[T]](members ...T) *OrderedByMember[T] {
	return orderedFromUnsortedMembers[T, *OrderedByMember[T]](members)
}

// NewOrderedByMemberFromSeq returns an [OrderedByMember] containing the values
// yielded by the given sequence.
func NewOrderedByMemberFromSeq[T constraints.Ordered[T]](seq iter.Seq[T]) *OrderedByMember[T] {
	return orderedFromSeq[T, *OrderedByMember[T]](seq)
}

// NewOrderedByMemberFromKeys returns an [OrderedByMember] containing the keys
// yielded by the given sequence.
func NewOrderedByMemberFromKeys[T constraints.Ordered[T], unused any](seq iter.Seq2[T, unused]) *OrderedByMember[T] {
	return orderedFromKeys[T, *OrderedByMember[T]](seq)
}

// NewOrderedByMemberFromValues returns an [OrderedByMember] containing the
// values yielded by the given sequence.
func NewOrderedByMemberFromValues[T constraints.Ordered[T], unused any](seq iter.Seq2[unused, T]) *OrderedByMember[T] {
	return orderedFromValues[T, *OrderedByMember[T]](seq)
}

// Add adds the given members to the set.
func (s *OrderedByMember[T]) Add(members ...T) {
	orderedAdd(s, members...)
}

// Remove removes the given members from the set.
func (s *OrderedByMember[T]) Remove(members ...T) {
	orderedRemove(s, members...)
}

// Clear removes all members from the set.
func (s *OrderedByMember[T]) Clear() {
	orderedClear(s)
}

// Len returns the number of members in the set.
func (s *OrderedByMember[T]) Len() int {
	return orderedLen(s)
}

// Has returns true if all of the given values are members of the set.
func (s *OrderedByMember[T]) Has(members ...T) bool {
	return orderedHas(s, members)
}

// IsEqual returns true if s and x have the same members.
func (s *OrderedByMember[T]) IsEqual(x *OrderedByMember[T]) bool {
	return orderedIsEqual(s, x)
}

// IsSuperset returns true if s has all of the members of x.
func (s *OrderedByMember[T]) IsSuperset(x *OrderedByMember[T]) bool {
	return orderedIsSuperset(s, x)
}

// IsSubset returns true if x has all of the members of s.
func (s *OrderedByMember[T]) IsSubset(x *OrderedByMember[T]) bool {
	return x.IsSuperset(s)
}

// IsStrictSuperset returns true if s has all of the members of x and at least
// one member that is not in x.
func (s *OrderedByMember[T]) IsStrictSuperset(x *OrderedByMember[T]) bool {
	return s.Len() > x.Len() && s.IsSuperset(x)
}

// IsStrictSubset returns true if x has all of the members of s and at least one
// member that is not in s.
func (s *OrderedByMember[T]) IsStrictSubset(x *OrderedByMember[T]) bool {
	return x.IsStrictSuperset(s)
}

// Clone returns a shallow copy of the set.
func (s *OrderedByMember[T]) Clone() *OrderedByMember[T] {
	return orderedClone(s)
}

// Union returns a set containing all members of s and x.
func (s *OrderedByMember[T]) Union(x *OrderedByMember[T]) *OrderedByMember[T] {
	return orderedUnion(s, x)
}

// Intersection returns a set containing members that are in both s and x.
func (s *OrderedByMember[T]) Intersection(x *OrderedByMember[T]) *OrderedByMember[T] {
	return orderedIntersection(s, x)
}

// Select returns the subset of s containing members for which the given
// predicate function returns true.
func (s *OrderedByMember[T]) Select(pred func(T) bool) *OrderedByMember[T] {
	return orderedSelect(s, pred)
}

// All returns a sequence that yields all members of the set in order.
func (s *OrderedByMember[T]) All() iter.Seq[T] {
	return orderedAll(s)
}

// Reverse returns a sequence that yields all members of the set in reverse
// order.
func (s *OrderedByMember[T]) Reverse() iter.Seq[T] {
	return orderedReverse(s)
}

func (s *OrderedByMember[T]) ptr() *[]T {
	return &s.members
}

func (s *OrderedByMember[T]) cmp(x, y T) int {
	return x.Compare(y)
}
