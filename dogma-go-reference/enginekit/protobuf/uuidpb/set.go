package uuidpb

import (
	"iter"
	"maps"
	"slices"
	"strings"
)

// Set is a collection of [UUID] values.
type Set struct {
	m map[key]struct{}
}

// NewSet creates a new set containing the given [UUID] values.
func NewSet(values ...*UUID) *Set {
	s := &Set{
		m: make(map[key]struct{}, len(values)),
	}

	for _, v := range values {
		s.m[asKey(v)] = struct{}{}
	}

	return s
}

// Has reports whether the set contains the given [UUID].
func (s *Set) Has(v *UUID) bool {
	return s.has(asKey(v))
}

func (s *Set) has(k key) bool {
	if s == nil {
		return false
	}

	_, ok := s.m[k]
	return ok
}

// Add adds the given [UUID] to the set.
func (s *Set) Add(v *UUID) {
	s.add(asKey(v))
}

func (s *Set) add(k key) {
	if s.m == nil {
		s.m = map[key]struct{}{}
	}

	s.m[k] = struct{}{}
}

// Delete removes the given [UUID] from the set.
func (s *Set) Delete(v *UUID) {
	if s != nil {
		delete(s.m, asKey(v))
	}
}

// All yields all members of the set.
func (s *Set) All() iter.Seq[*UUID] {
	return func(yield func(*UUID) bool) {
		if s != nil {
			for v := range s.m {
				if !yield(v.asUUID()) {
					return
				}
			}
		}
	}
}

// IsEqual reports whether the set contains the same members as the given set.
func (s *Set) IsEqual(x *Set) bool {
	if s == nil {
		return x.IsEmpty()
	}

	if x == nil {
		return s.IsEmpty()
	}

	return maps.Equal(s.m, x.m)
}

// Diff returns a new set containing the members of s that are not present in x.
func (s *Set) Diff(x *Set) *Set {
	result := &Set{}

	if s != nil {
		for k := range s.m {
			if !x.has(k) {
				result.add(k)
			}
		}
	}

	return result
}

// Delta returns the elements that need to be added to and removed from s to
// make it equal to x.
//
// This is equivalent to calling s.Diff(x) for the remove
// set and x.Diff(s) for the add set.
func (s *Set) Delta(x *Set) (add, remove *Set) {
	add = &Set{}
	remove = &Set{}

	if x != nil {
		for k := range x.m {
			if !s.has(k) {
				add.add(k)
			}
		}
	}

	if s != nil {
		for k := range s.m {
			if !x.has(k) {
				remove.add(k)
			}
		}
	}

	return add, remove
}

// Len returns the number of members in the set.
func (s *Set) Len() int {
	if s == nil {
		return 0
	}

	return len(s.m)
}

// IsEmpty returns true if the set contains no members.
func (s *Set) IsEmpty() bool {
	return s == nil || len(s.m) == 0
}

// Clear removes all members from the set.
func (s *Set) Clear() {
	if s != nil {
		clear(s.m)
	}
}

// Clone returns a shallow copy of the set.
func (s *Set) Clone() *Set {
	if s == nil {
		return nil
	}

	return &Set{
		m: maps.Clone(s.m),
	}
}

func (s *Set) String() string {
	var w strings.Builder

	w.WriteString("{")

	sorted := slices.SortedFunc(
		s.All(),
		(*UUID).Compare,
	)

	for i, v := range sorted {
		if i > 0 {
			w.WriteString(", ")
		}
		w.WriteString(v.AsString())
	}

	w.WriteString("}")

	return w.String()
}

// DapperString implements [github.com/dogmatiq/dapper.Stringer].
func (s *Set) DapperString() string {
	return s.String()
}

// GoString returns a Go-syntax representation of the set.
func (s *Set) GoString() string {
	if s == nil {
		return "(*uuidpb.Set)(nil)"
	}

	var w strings.Builder

	w.WriteString("uuidpb.NewSet(")

	sorted := slices.SortedFunc(
		s.All(),
		(*UUID).Compare,
	)

	for i, v := range sorted {
		if i > 0 {
			w.WriteString(", ")
		}
		w.WriteString(v.GoString())
	}

	w.WriteString(")")

	return w.String()
}
