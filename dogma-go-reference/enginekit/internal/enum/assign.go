package enum

// AssignResult returns a function that invokes fn and assigns the result to
// *result.
func AssignResult[T, R any](
	fn func(T) R,
	result *R,
) func(T) {
	if fn == nil {
		return nil
	}
	return func(v T) {
		*result = fn(v)
	}
}

// AssignResultErr returns a function that invokes fn and assigns the result and
// error value to *result and *err, respectively.
func AssignResultErr[T, R any](
	fn func(T) (R, error),
	result *R,
	err *error,
) func(T) {
	if fn == nil {
		return nil
	}
	return func(v T) {
		*result, *err = fn(v)
	}
}
