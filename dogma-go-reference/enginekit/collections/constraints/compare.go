package constraints

// Ordered is a constraint for types that define their own ordering via a
// Compare() method.
type Ordered[T any] interface {
	Compare(T) int
}

// Comparator is a constraint for a type that can compare two values of type T.
type Comparator[T any] interface {
	Compare(T, T) int
}
