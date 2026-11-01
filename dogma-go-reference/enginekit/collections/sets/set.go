package sets

import (
	"iter"
	"maps"
)

// Set is an unordered set of unique T values.
type Set[T comparable] struct {
	members map[T]struct{}
}

// New returns a [Set] containing the given members.
func New[T comparable](members ...T) *Set[T] {
	var s Set[T]

	s.Add(members...)

	return &s
}

// NewFromSeq returns a [Set] containing the values yielded by the given
// sequence.
func NewFromSeq[T comparable](seq iter.Seq[T]) *Set[T] {
	var s Set[T]

	for m := range seq {
		s.Add(m)
	}

	return &s
}

// NewFromKeys returns a [Set] containing the keys yielded by the given
// sequence.
func NewFromKeys[K comparable, unused any](seq iter.Seq2[K, unused]) *Set[K] {
	var s Set[K]

	for m := range seq {
		s.Add(m)
	}

	return &s
}

// NewFromValues returns a [Set] containing the values yielded by the given
// sequence.
func NewFromValues[T comparable, unused any](seq iter.Seq2[unused, T]) *Set[T] {
	var s Set[T]

	for _, m := range seq {
		s.Add(m)
	}

	return &s
}

// Add adds the given members to the set.
func (s *Set[T]) Add(members ...T) {
	if s == nil {
		panic("Add() called on a nil set")
	}

	if s.members == nil {
		s.members = make(map[T]struct{}, len(members))
	}

	for _, m := range members {
		s.members[m] = struct{}{}
	}
}

// Remove removes the given members from the set.
func (s *Set[T]) Remove(members ...T) {
	if s != nil {
		for _, m := range members {
			delete(s.members, m)
		}
	}
}

// Clear removes all members from the set.
func (s *Set[T]) Clear() {
	if s != nil {
		clear(s.members)
	}
}

// Len returns the number of members in the set.
func (s *Set[T]) Len() int {
	if s == nil {
		return 0
	}

	return len(s.members)
}

// Has returns true if all of the given values are members of the set.
func (s *Set[T]) Has(members ...T) bool {
	if s == nil {
		return len(members) == 0
	}

	for _, m := range members {
		if _, ok := s.members[m]; !ok {
			return false
		}
	}

	return true
}

// IsEqual returns true if s and x have the same members.
func (s *Set[T]) IsEqual(x *Set[T]) bool {
	if s == nil {
		return x.Len() == 0
	}

	if x == nil {
		return s.Len() == 0
	}

	for m := range s.members {
		if _, ok := x.members[m]; !ok {
			return false
		}
	}

	return true
}

// IsSuperset returns true if s has all of the members of x.
func (s *Set[T]) IsSuperset(x *Set[T]) bool {
	if s == nil {
		return x.Len() == 0
	}

	if x == nil {
		return true
	}

	for m := range x.members {
		if _, ok := s.members[m]; !ok {
			return false
		}
	}

	return true
}

// IsSubset returns true if x has all of the members of s.
func (s *Set[T]) IsSubset(x *Set[T]) bool {
	return x.IsSuperset(s)
}

// IsStrictSuperset returns true if s has all of the members of x and at least
// one member that is not in x.
func (s *Set[T]) IsStrictSuperset(x *Set[T]) bool {
	return s.Len() > x.Len() && s.IsSuperset(x)
}

// IsStrictSubset returns true if x has all of the members of s and at least one
// member that is not in s.
func (s *Set[T]) IsStrictSubset(x *Set[T]) bool {
	return x.IsStrictSuperset(s)
}

// Clone returns a shallow copy of the set.
func (s *Set[T]) Clone() *Set[T] {
	var out Set[T]

	if s != nil {
		out.members = maps.Clone(s.members)
	}

	return &out
}

// Union returns a set containing all members of s and x.
func (s *Set[T]) Union(x *Set[T]) *Set[T] {
	if s == nil {
		return x.Clone()
	}

	if x == nil {
		return s.Clone()
	}

	big, small := s.members, x.members
	if len(small) > len(big) {
		big, small = small, big
	}

	members := maps.Clone(big)

	for m := range small {
		members[m] = struct{}{}
	}

	return &Set[T]{
		members: members,
	}
}

// Intersection returns a set containing members that are in both s and x.
func (s *Set[T]) Intersection(x *Set[T]) *Set[T] {
	if s == nil || x == nil {
		return &Set[T]{}
	}

	big, small := s.members, x.members
	if len(small) > len(big) {
		big, small = small, big
	}

	members := make(map[T]struct{}, len(small))

	for m := range small {
		if _, ok := big[m]; ok {
			members[m] = struct{}{}
		}
	}

	return &Set[T]{
		members: members,
	}
}

// Select returns the subset of s containing members for which the given
// predicate function returns true.
func (s *Set[T]) Select(pred func(T) bool) *Set[T] {
	var out Set[T]

	if s != nil {
		for m := range s.members {
			if pred(m) {
				out.Add(m)
			}
		}
	}

	return &out
}

// All returns a sequence that yields all members of the set in no particular
// order.
func (s *Set[T]) All() iter.Seq[T] {
	return func(yield func(T) bool) {
		if s != nil {
			for m := range s.members {
				if !yield(m) {
					return
				}
			}
		}
	}
}
