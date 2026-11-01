package constraints

// KeyGenerator is a constraint for a type that generates union keys for values
// of type T.
type KeyGenerator[T, K any] interface {
	Key(T) K
}
