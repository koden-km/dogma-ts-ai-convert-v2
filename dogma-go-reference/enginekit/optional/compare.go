package optional

import "cmp"

// Equal returns true if two optional values are equal.
//
// Two absent values are considered equal.
func Equal[T comparable](a, b Optional[T]) bool {
	v1, ok1 := a.TryGet()
	v2, ok2 := b.TryGet()
	return ok1 == ok2 && v1 == v2
}

// Compare returns an integer comparing two optional values.
//
// An absent value is less than a present value.
func Compare[T cmp.Ordered](a, b Optional[T]) int {
	if a.IsPresent() && b.IsPresent() {
		return cmp.Compare(a.Get(), b.Get())
	}

	if a.IsPresent() {
		return 1
	}

	if b.IsPresent() {
		return -1
	}

	return 0
}
