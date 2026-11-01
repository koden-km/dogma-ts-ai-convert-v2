package enum

import "iter"

// Range returns a sequence that yields all values in the inclusive range
// [begin, end].
func Range[E Enum](begin, end E) iter.Seq[E] {
	return func(yield func(E) bool) {
		for v := begin; v <= end; v++ {
			if !yield(v) {
				return
			}
		}
	}
}
