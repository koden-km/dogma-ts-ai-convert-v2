package envelopepb

import (
	"fmt"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

// findAnyValue returns the first value matching T from the given sets of
// [*anypb.Any] values, searching each set in order.
func findAnyValue[
	T interface {
		*E
		proto.Message
	},
	E any,
](sets ...[]*anypb.Any) (T, bool, error) {
	var out T

	for _, values := range sets {
		for _, v := range values {
			if v.MessageIs(out) {
				out = new(E)
				return out, true, v.UnmarshalTo(out)
			}
		}
	}

	return nil, false, nil
}

// appendOrReplace appends value to values if there is no existing value of the
// same message type, otherwise it replaces the existing value in place.
func appendOrReplace(values []*anypb.Any, value *anypb.Any) []*anypb.Any {
	for index, existing := range values {
		if isSameType(existing, value) {
			values[index] = value
			return values
		}
	}

	return append(values, value)
}

// isSameType returns true if a and b contain the same message type.
//
// Like [anypb.Any.MessageIs], it compares only the message name at the end of
// the type URL, so values packed with different type URL prefixes are the same
// type. If the type URL doesn't end in a valid message name, the whole type
// URLs are compared instead.
func isSameType(a, b *anypb.Any) bool {
	if name := a.MessageName(); name != "" {
		return name == b.MessageName()
	}
	return a.GetTypeUrl() == b.GetTypeUrl()
}

// marshalAsAny returns x as an [*anypb.Any], converting it if necessary. It
// panics if x is nil or a nil pointer, if x is an empty [*anypb.Any], or if it
// cannot be marshaled.
func marshalAsAny(x proto.Message) *anypb.Any {
	if x == nil || !x.ProtoReflect().IsValid() {
		panic("value must not be nil")
	}

	if x, ok := x.(*anypb.Any); ok {
		if x.GetTypeUrl() == "" {
			panic("value must not be an empty google.protobuf.Any")
		}

		return x
	}

	v, err := anypb.New(x)
	if err != nil {
		panic(fmt.Sprintf(
			"unable to marshal %T as google.protobuf.Any: %s",
			x,
			err,
		))
	}

	return v
}
