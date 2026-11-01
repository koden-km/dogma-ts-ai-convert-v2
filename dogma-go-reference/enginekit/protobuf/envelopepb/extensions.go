package envelopepb

import (
	"fmt"

	"google.golang.org/protobuf/proto"
)

// SetExtension sets x as an extension on body. If an extension with the same
// type URL is already present, it is replaced.
//
// It panics if x is nil.
func SetExtension[
	T interface {
		*E
		proto.Message
	},
	E any,
](body *Body, x T) {
	if x == nil {
		panic("value must not be nil")
	}

	body.SetExtensions(
		appendOrReplace(
			body.GetExtensions(),
			marshalAsAny(x),
		),
	)
}

// GetExtension returns the extension matching T from body's extensions.
//
// The second return value reports whether an extension of the matching type
// was present. The third return value is non-nil if the extension was present
// but could not be unmarshalled.
func GetExtension[
	T interface {
		*E
		proto.Message
	},
	E any,
](body *Body) (T, bool, error) {
	var out T

	for _, ext := range body.GetExtensions() {
		if ext.MessageIs(out) {
			out = new(E)
			return out, true, ext.UnmarshalTo(out)
		}
	}

	return nil, false, nil
}

// MustGetExtension returns the extension matching T from body's extensions.
//
// It panics if no extension of the matching type is present, or if it could not be
// unmarshalled.
func MustGetExtension[
	T interface {
		*E
		proto.Message
	},
	E any,
](body *Body) T {
	x, ok, err := GetExtension[T](body)
	if err != nil {
		panic(fmt.Sprintf("unable to unmarshal extension: %s", err))
	}
	if !ok {
		panic("extension is not present")
	}

	return x
}
