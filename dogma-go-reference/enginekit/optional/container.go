package optional

// AtIndex returns the element at index i in s, or [None] if i is out of bounds.
func AtIndex[E any, S ~[]E](s S, i int) Optional[E] {
	if i < 0 || i >= len(s) {
		return None[E]()
	}
	return Some(s[i])
}

// First returns the first element in s, or [None] if s is empty.
func First[E any, S ~[]E](s S) Optional[E] {
	if len(s) == 0 {
		return None[E]()
	}
	return Some(s[0])
}

// Last returns the last element in s, or [None] if s is empty.
func Last[E any, S ~[]E](s S) Optional[E] {
	if len(s) == 0 {
		return None[E]()
	}
	return Some(s[len(s)-1])
}

// Key returns the value associated with key k in map m, or [None] if k is not
// present in m.
func Key[K comparable, V any, M ~map[K]V](m M, k K) Optional[V] {
	if v, ok := m[k]; ok {
		return Some(v)
	}
	return None[V]()
}
