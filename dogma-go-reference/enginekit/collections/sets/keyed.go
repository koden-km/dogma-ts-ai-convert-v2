package sets

import (
	"iter"
	"maps"

	"github.com/dogmatiq/enginekit/collections/constraints"
)

// Keyed is an unordered set of unique T values which are identified by a unique
// key of type K.
type Keyed[T any, K comparable, G constraints.KeyGenerator[T, K]] struct {
	members map[K]T
}

// NewKeyed returns a [Keyed] containing the given members.
func NewKeyed[T any, K comparable, G constraints.KeyGenerator[T, K]](members ...T) *Keyed[T, K, G] {
	var s Keyed[T, K, G]

	s.Add(members...)

	return &s
}

// NewKeyedFromSeq returns a [Keyed] containing the values yielded by the given
// sequence.
func NewKeyedFromSeq[T any, K comparable, G constraints.KeyGenerator[T, K]](seq iter.Seq[T]) *Keyed[T, K, G] {
	var s Keyed[T, K, G]

	for m := range seq {
		s.Add(m)
	}

	return &s
}

// NewKeyedFromKeys returns a [Keyed] containing the keys yielded by the given
// sequence.
func NewKeyedFromKeys[T any, K comparable, G constraints.KeyGenerator[T, K], unused any](seq iter.Seq2[T, unused]) *Keyed[T, K, G] {
	var s Keyed[T, K, G]

	for m := range seq {
		s.Add(m)
	}

	return &s
}

// NewKeyedFromValues returns a [Keyed] containing the values yielded by the
// given sequence.
func NewKeyedFromValues[T any, K comparable, G constraints.KeyGenerator[T, K], unused any](seq iter.Seq2[unused, T]) *Keyed[T, K, G] {
	var s Keyed[T, K, G]

	for _, m := range seq {
		s.Add(m)
	}

	return &s
}

// Add adds the given members to the set.
func (s *Keyed[T, K, G]) Add(members ...T) {
	if s == nil {
		panic("Add() called on a nil set")
	}

	if s.members == nil {
		s.members = make(map[K]T, len(members))
	}

	var gen G

	for _, m := range members {
		k := gen.Key(m)
		s.members[k] = m
	}
}

// Remove removes the given members from the set.
func (s *Keyed[T, K, G]) Remove(members ...T) {
	if s != nil {
		var gen G
		for _, m := range members {
			k := gen.Key(m)
			delete(s.members, k)
		}
	}
}

// Clear removes all members from the set.
func (s *Keyed[T, K, G]) Clear() {
	if s != nil {
		clear(s.members)
	}
}

// Len returns the number of members in the set.
func (s *Keyed[T, K, G]) Len() int {
	if s == nil {
		return 0
	}

	return len(s.members)
}

// Has returns true if all of the given values are members of the set.
func (s *Keyed[T, K, G]) Has(members ...T) bool {
	if s == nil {
		return len(members) == 0
	}

	var gen G

	for _, m := range members {
		k := gen.Key(m)
		if _, ok := s.members[k]; !ok {
			return false
		}
	}

	return true
}

// IsEqual returns true if s and x have the same members.
func (s *Keyed[T, K, G]) IsEqual(x *Keyed[T, K, G]) bool {
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
func (s *Keyed[T, K, G]) IsSuperset(x *Keyed[T, K, G]) bool {
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
func (s *Keyed[T, K, G]) IsSubset(x *Keyed[T, K, G]) bool {
	return x.IsSuperset(s)
}

// IsStrictSuperset returns true if s has all of the members of x and at least
// one member that is not in x.
func (s *Keyed[T, K, G]) IsStrictSuperset(x *Keyed[T, K, G]) bool {
	return s.Len() > x.Len() && s.IsSuperset(x)
}

// IsStrictSubset returns true if x has all of the members of s and at least one
// member that is not in s.
func (s *Keyed[T, K, G]) IsStrictSubset(x *Keyed[T, K, G]) bool {
	return x.IsStrictSuperset(s)
}

// Clone returns a shallow copy of the set.
func (s *Keyed[T, K, G]) Clone() *Keyed[T, K, G] {
	var out Keyed[T, K, G]

	if s != nil {
		out.members = maps.Clone(s.members)
	}

	return &out
}

// Union returns a set containing all members of s and x.
func (s *Keyed[T, K, G]) Union(x *Keyed[T, K, G]) *Keyed[T, K, G] {
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

	for k, m := range small {
		members[k] = m
	}

	return &Keyed[T, K, G]{
		members: members,
	}
}

// Intersection returns a set containing members that are in both s and x.
func (s *Keyed[T, K, G]) Intersection(x *Keyed[T, K, G]) *Keyed[T, K, G] {
	if s == nil || x == nil {
		return &Keyed[T, K, G]{}
	}

	big, small := s.members, x.members
	if len(small) > len(big) {
		big, small = small, big
	}

	members := make(map[K]T, len(small))

	for k, m := range small {
		if _, ok := big[k]; ok {
			members[k] = m
		}
	}

	return &Keyed[T, K, G]{
		members: members,
	}
}

// Select returns the subset of s containing members for which the given
// predicate function returns true.
func (s *Keyed[T, K, G]) Select(pred func(T) bool) *Keyed[T, K, G] {
	var out Keyed[T, K, G]

	if s != nil {
		for k, m := range s.members {
			if pred(m) {
				if out.members == nil {
					out.members = map[K]T{}
				}
				out.members[k] = m
			}
		}
	}

	return &out
}

// All returns a sequence that yields all members of the set in no particular
// order.
func (s *Keyed[T, K, G]) All() iter.Seq[T] {
	return func(yield func(T) bool) {
		if s != nil {
			for _, m := range s.members {
				if !yield(m) {
					return
				}
			}
		}
	}
}
