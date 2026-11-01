package identitypb

import (
	"errors"
	"fmt"
	"slices"

	uuidpb "github.com/dogmatiq/enginekit/protobuf/uuidpb"
)

// New returns a new identity with the given name and key.
func New(name string, key *uuidpb.UUID) *Identity {
	x := NewIdentityBuilder().
		WithName(name).
		WithKey(key).
		Build()

	if err := x.Validate(); err != nil {
		panic(x)
	}

	return x
}

// Parse returns a new identity with the given name and key by parsing the key
// as a UUID.
func Parse(name, key string) (*Identity, error) {
	k, err := uuidpb.Parse(key)
	if err != nil {
		return nil, fmt.Errorf("invalid key: %w", err)
	}

	x := NewIdentityBuilder().
		WithName(name).
		WithKey(k).
		Build()

	if err := x.Validate(); err != nil {
		return nil, err
	}

	return x, nil
}

// MustParse returns a new identity with the given name and key by parsing the
// key as a UUID, or panics if unable to do so.
func MustParse(name, key string) *Identity {
	x, err := Parse(name, key)
	if err != nil {
		panic(err)
	}

	return x
}

// Validate returns an error if x is invalid.
//
// It does not perform UTF-8 validation on the name. This should be validated by
// the engine when the identity is configured.
func (x *Identity) Validate() error {
	name := x.GetName()

	if len(name) == 0 || len(name) > 255 {
		return errors.New("invalid name: must be between 1 and 255 bytes")
	}

	if err := x.GetKey().Validate(); err != nil {
		return fmt.Errorf("invalid key: %w", err)
	}

	return nil
}

// MarshalText implements the [encoding.TextMarshaler] interface.
//
// The text representation is the UUID key followed by a space and the name,
// e.g. "5195fe85-eb3f-4121-84b0-be72cbc5722f handler-name".
func (x *Identity) MarshalText() ([]byte, error) {
	if err := x.Validate(); err != nil {
		return nil, err
	}

	name := x.GetName()
	text, _ := x.GetKey().MarshalText()
	text = slices.Grow(text, 1+len(name))
	text = append(text, ' ')
	text = append(text, name...)

	return text, nil
}

// UnmarshalText implements the [encoding.TextUnmarshaler] interface.
func (x *Identity) UnmarshalText(text []byte) error {
	if len(text) < 38 {
		return errors.New("invalid identity format, expected UUID followed by a space and name")
	}

	if text[36] != ' ' {
		return errors.New("invalid identity format, expected space after UUID")
	}

	var key uuidpb.UUID
	if err := key.UnmarshalText(text[:36]); err != nil {
		return fmt.Errorf("invalid key: %w", err)
	}

	x.SetKey(&key)
	x.SetName(string(text[37:]))

	return x.Validate()
}

// AsString returns a human-readable representation of the identity.
func (x *Identity) AsString() string {
	name := x.GetName()
	if name == "" {
		name = "?"
	}

	return fmt.Sprintf("%s %s", x.GetKey(), name)

}

// GoString implements the [fmt.GoStringer] interface.
func (x *Identity) GoString() string {
	return fmt.Sprintf(
		"identitypb.New(%#v, %#v)",
		x.GetName(),
		x.GetKey(),
	)
}

// Equal returns true if x and id are equal.
func (x *Identity) Equal(id *Identity) bool {
	return x.GetName() == id.GetName() && x.GetKey().Equal(id.GetKey())
}
