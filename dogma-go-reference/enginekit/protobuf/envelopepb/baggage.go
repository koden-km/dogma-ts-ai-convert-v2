package envelopepb

import (
	"fmt"

	"google.golang.org/protobuf/proto"
)

// SetBaggage sets x as a baggage value on body. If a baggage value with the
// same type URL is already present, it is replaced.
//
// It panics if x is nil.
func SetBaggage[
	T interface {
		*E
		proto.Message
	},
	E any,
](body *Body, x T) {
	if x == nil {
		panic("value must not be nil")
	}

	body.SetBaggage(
		appendOrReplace(
			body.GetBaggage(),
			marshalAsAny(x),
		),
	)
}

// GetBaggage returns the baggage value matching T from body's baggage.
//
// The second return value reports whether a baggage value of the matching
// type was present. The third return value is non-nil if the baggage value
// was present but could not be unmarshalled.
func GetBaggage[
	T interface {
		*E
		proto.Message
	},
	E any,
](body *Body) (T, bool, error) {
	var out T

	for _, bag := range body.GetBaggage() {
		if bag.MessageIs(out) {
			out = new(E)
			return out, true, bag.UnmarshalTo(out)
		}
	}

	return nil, false, nil
}

// MustGetBaggage returns the baggage value matching T from body's baggage.
//
// It panics if no baggage value of the matching type is present, or if it could
// not be unmarshalled.
func MustGetBaggage[
	T interface {
		*E
		proto.Message
	},
	E any,
](body *Body) T {
	x, ok, err := GetBaggage[T](body)
	if err != nil {
		panic(fmt.Sprintf("unable to unmarshal baggage value: %s", err))
	}
	if !ok {
		panic("baggage value is not present")
	}

	return x
}
