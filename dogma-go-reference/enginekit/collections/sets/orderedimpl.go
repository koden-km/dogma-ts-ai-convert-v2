package sets

import (
	"iter"
	"slices"
)

type ordered[T, I any] interface {
	*I

	// ptr returns a pointer to the set's members.
	ptr() *[]T

	// cmp compares two members.
	cmp(T, T) int
}

func orderedFromUnsortedMembers[T any, S ordered[T, I], I any](
	members []T,
) S {
	var s S = new(I)
	orderedAdd(s, members...)
	return s
}

func orderedFromSortedMembers[T any, S ordered[T, I], I any](
	members []T,
) S {
	var s S = new(I)
	*s.ptr() = members
	return s
}

func orderedFromSeq[T any, S ordered[T, I], I any](
	seq iter.Seq[T],
) S {
	var s S = new(I)

	for m := range seq {
		orderedAdd(s, m)
	}

	return s
}

func orderedFromKeys[T any, S ordered[T, I], I, unused any](
	seq iter.Seq2[T, unused],
) S {
	var s S = new(I)

	for m := range seq {
		orderedAdd(s, m)
	}

	return s
}

func orderedFromValues[T any, S ordered[T, I], I, unused any](
	seq iter.Seq2[unused, T],
) S {
	var s S = new(I)

	for _, m := range seq {
		orderedAdd(s, m)
	}

	return s
}

func orderedSearch[T any, S ordered[T, I], I any](
	s S,
	m T,
) (int, bool) {
	if s == nil {
		return -1, false
	}

	return slices.BinarySearchFunc(
		*s.ptr(),
		m,
		s.cmp,
	)
}

func orderedAdd[T any, S ordered[T, I], I any](
	s S,
	members ...T,
) {
	if s == nil {
		panic("Add() called on a nil set")
	}

	mems := s.ptr()

	for _, m := range members {
		if i, ok := orderedSearch(s, m); !ok {
			*mems = slices.Insert(*mems, i, m)
		}
	}
}

func orderedRemove[T any, S ordered[T, I], I any](
	s S,
	members ...T,
) {
	if s == nil {
		return
	}

	mems := s.ptr()

	for _, m := range members {
		if len(*mems) == 0 {
			return
		}

		if i, ok := orderedSearch(s, m); ok {
			*mems = slices.Delete(*mems, i, i+1)
		}
	}
}

func orderedClear[T any, S ordered[T, I], I any](
	s S,
) {
	if s == nil {
		return
	}

	members := s.ptr()
	clear(*members)
	*members = (*members)[:0]
}

func orderedLen[T any, S ordered[T, I], I any](
	s S,
) int {
	if s == nil {
		return 0
	}

	return len(*s.ptr())
}

func orderedHas[T any, S ordered[T, I], I any](
	s S,
	members []T,
) bool {
	for _, m := range members {
		if _, ok := orderedSearch(s, m); !ok {
			return false
		}
	}

	return true
}

func orderedIsEqual[T any, S ordered[T, I], I any](
	x, y S,
) bool {
	lenX := orderedLen(x)
	lenY := orderedLen(y)

	if lenX != lenY {
		return false
	}

	if lenX == 0 {
		return true
	}

	membersX, membersY := *x.ptr(), *y.ptr()

	for i := range lenX {
		memberX, memberY := membersX[i], membersY[i]

		if x.cmp(memberX, memberY) != 0 {
			return false
		}
	}

	return true
}

func orderedIsSuperset[T any, S ordered[T, I], I any](
	x, y S,
) bool {
	lenX := orderedLen(x)
	lenY := orderedLen(y)

	if lenY == 0 {
		return true
	}

	if lenX < lenY {
		return false
	}

	if lenX == lenY {
		return orderedIsEqual(x, y)
	}

	membersX, membersY := *x.ptr(), *y.ptr()
	indexX, indexY := 0, 0

	for {
		if indexY >= lenY {
			return true
		}

		if indexX >= lenX {
			return false
		}

		memberX, memberY := membersX[indexX], membersY[indexY]

		c := x.cmp(memberY, memberX)

		if c < 0 {
			return false
		}

		if c == 0 {
			indexY++
		}

		indexX++
	}
}

func orderedClone[T any, S ordered[T, I], I any](
	s S,
) S {
	var members []T

	if s != nil {
		members = slices.Clone(*s.ptr())
	}

	return orderedFromSortedMembers[T, S](members)
}

func orderedUnion[T any, S ordered[T, I], I any](
	x, y S,
) S {
	if x == nil {
		return orderedClone(y)
	}

	if y == nil {
		return orderedClone(x)
	}

	membersX, membersY := *x.ptr(), *y.ptr()
	indexX, indexY := 0, 0
	lenX, lenY := len(membersX), len(membersY)

	if lenX == 0 {
		return orderedClone(y)
	}

	if lenY == 0 {
		return orderedClone(x)
	}

	members := make([]T, 0, max(lenX, lenY))

	for {
		if indexX >= lenX {
			members = append(members, membersY[indexY:]...)
			break
		}

		if indexY >= lenY {
			members = append(members, membersX[indexX:]...)
			break
		}

		memberX := membersX[indexX]
		memberY := membersY[indexY]

		c := x.cmp(memberX, memberY)

		if c < 0 {
			members = append(members, memberX)
			indexX++
		} else if c > 0 {
			members = append(members, memberY)
			indexY++
		} else {
			members = append(members, memberX)
			indexX++
			indexY++
		}
	}

	return orderedFromSortedMembers[T, S](members)
}

func orderedIntersection[T any, S ordered[T, I], I any](
	x, y S,
) S {
	if x == nil || y == nil {
		return new(I)
	}

	big, small := *x.ptr(), *y.ptr()
	if len(small) > len(big) {
		big, small = small, big
	}

	if len(small) == 0 {
		return new(I)
	}

	members := make([]T, 0, len(small))

	for _, m := range small {
		if len(big) == 0 {
			break
		}

		i, ok := slices.BinarySearchFunc(big, m, x.cmp)
		if ok {
			members = append(members, m)
			big = big[i+1:]
		} else {
			big = big[i:]
		}
	}

	return orderedFromSortedMembers[T, S](members)
}

func orderedSelect[T any, S ordered[T, I], I any](
	s S,
	pred func(T) bool,
) S {
	var members []T

	if s != nil {
		for _, m := range *s.ptr() {
			if pred(m) {
				members = append(members, m)
			}
		}
	}

	return orderedFromSortedMembers[T, S](members)
}

func orderedAll[T any, S ordered[T, I], I any](
	s S,
) iter.Seq[T] {
	return func(yield func(T) bool) {
		if s != nil {
			for _, m := range *s.ptr() {
				if !yield(m) {
					return
				}
			}
		}
	}
}

func orderedReverse[T any, S ordered[T, I], I any](
	s S,
) iter.Seq[T] {
	return func(yield func(T) bool) {
		if s != nil {
			members := *s.ptr()

			for i := len(members) - 1; i >= 0; i-- {
				if !yield(members[i]) {
					return
				}
			}
		}
	}
}
