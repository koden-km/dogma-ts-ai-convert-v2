package envelopepb

import (
	"fmt"

	"google.golang.org/protobuf/proto"
	"google.golang.org/protobuf/types/known/anypb"
)

// SetBaggage sets x as a baggage value on target, which is typically a
// [*Header] or [*Body]. If a baggage value of the same message type is already
// present, it is replaced.
//
// It panics if x is nil.
func SetBaggage(
	target interface {
		GetBaggage() []*anypb.Any
		SetBaggage([]*anypb.Any)
	},
	x proto.Message,
) {
	target.SetBaggage(
		appendOrReplace(
			target.GetBaggage(),
			marshalAsAny(x),
		),
	)
}

// GetBaggage returns the baggage value matching T from env's baggage.
//
// Values in the envelope's body take precedence over those in its header.
//
// The second return value reports whether a baggage value of the matching type
// was present. The third return value is non-nil if the baggage value was present
// but could not be unmarshalled.
func GetBaggage[
	T interface {
		*E
		proto.Message
	},
	E any,
](env *Envelope) (T, bool, error) {
	return findAnyValue[T](
		env.GetBody().GetBaggage(),
		env.GetHeader().GetBaggage(),
	)
}

// MustGetBaggage returns the baggage value matching T from env's baggage.
//
// It panics if no baggage value of the matching type is present, or if it could
// not be unmarshalled.
func MustGetBaggage[
	T interface {
		*E
		proto.Message
	},
	E any,
](env *Envelope) T {
	x, ok, err := GetBaggage[T](env)
	if err != nil {
		panic(fmt.Sprintf("unable to unmarshal baggage value: %s", err))
	}
	if !ok {
		panic("baggage value is not present")
	}

	return x
}
