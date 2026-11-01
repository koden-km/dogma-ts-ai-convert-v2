package optional

// Transform applies a transformation to v, returning a new optional value that
// contains the result of the function.
//
// If v's value is not present, the returned optional value will also not
// contain a value.
func Transform[T, X any](
	x Optional[X],
	fn func(X) T,
) Optional[T] {
	if x.ok {
		return Some(fn(x.value))
	}
	return None[T]()
}

// TryTransform applies a transformation to v, returning a new optional value
// that contains the result of the function.
//
// If v's value is not present, the returned optional value will also not
// contain a value.
func TryTransform[T, X any](
	x Optional[X],
	fn func(X) (T, bool),
) Optional[T] {
	if x.ok {
		if out, ok := fn(x.value); ok {
			return Some(out)
		}
	}
	return None[T]()
}

// As applies a type assertion to v. It returns an empty optional value if the
// type assertion fails.
func As[T any, X any](
	x Optional[X],
) Optional[T] {
	if v, ok := x.TryGet(); ok {
		if v, ok := any(v).(T); ok {
			return Some(v)
		}
	}
	return None[T]()
}
