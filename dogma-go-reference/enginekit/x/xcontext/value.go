package xcontext

import "context"

type (
	singleKey                struct{}
	key[K comparable, V any] struct{ key K }
)

// withValue returns a derived context that points to the parent context.
// In the derived context, the value associated with k is v.
//
// The keys need only be unique for a specific type of value.
func withValue[K comparable, V any](ctx context.Context, k K, v V) context.Context {
	return context.WithValue(
		ctx,
		key[K, V]{k},
		v,
	)
}

// value returns the value associated with k in ctx, if any.
//
// It returns the value and true if the value is present, or the zero value
// and false if the value is not present.
func value[V any, K comparable](ctx context.Context, k K) (v V, ok bool) {
	v, ok = ctx.Value(key[K, V]{k}).(V)
	return
}

// withSingleValue returns a derived context that points to the parent context.
// In the derived context, the single value of type T is v.
func withSingleValue[T any](ctx context.Context, v T) context.Context {
	return withValue(
		ctx,
		singleKey{},
		v,
	)
}

// singleValue returns the single value of type T in ctx, if any.
//
// It returns the value and true if the value is present, or the zero value
// and false if the value is not present.
func singleValue[T any](ctx context.Context) (v T, ok bool) {
	return value[T](ctx, singleKey{})
}
