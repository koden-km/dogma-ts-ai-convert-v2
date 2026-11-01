package config

import (
	"fmt"
	"strconv"
	"strings"
	"unicode"

	"github.com/dogmatiq/enginekit/optional"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
)

// Identity is a [Component] that that represents the unique identity of an
// [Entity].
type Identity struct {
	ComponentCommon

	// Name is the name element of the identity.
	Name optional.Optional[string]

	// Key is the key element of the identity.
	Key optional.Optional[string]
}

func (i *Identity) String() string {
	var w strings.Builder

	w.WriteString("identity")

	name, nameOK := i.Name.TryGet()
	key, keyOK := i.Key.TryGet()

	if !nameOK && !keyOK {
		return w.String()
	}

	w.WriteByte(':')

	if !nameOK {
		w.WriteByte('?')
	} else if !isPrintable(name) || strings.Contains(name, `"`) {
		w.WriteString(strconv.Quote(name))
	} else {
		w.WriteString(name)
	}

	w.WriteByte('/')

	if !keyOK {
		w.WriteByte('?')
	} else if uuid, err := uuidpb.Parse(key); err == nil {
		w.WriteString(uuid.AsString())
	} else if !isPrintable(key) || strings.Contains(key, `"`) {
		w.WriteString(strconv.Quote(key))
	} else {
		w.WriteString(key)
	}

	return w.String()
}

func (i *Identity) validate(ctx *validateContext) {
	validateComponent(ctx)

	if n, ok := i.Name.TryGet(); ok {
		if !isPrintable(n) {
			ctx.Invalid(InvalidIdentityNameError{n})
		}
	} else {
		ctx.Absent("name")
	}

	if k, ok := i.Key.TryGet(); ok {
		if _, err := uuidpb.Parse(k); err != nil {
			ctx.Invalid(InvalidIdentityKeyError{k})
		}
	} else {
		ctx.Absent("key")
	}
}

func (i *Identity) describe(ctx *describeContext) {
	ctx.DescribeFidelity()
	ctx.Print("identity")

	n, hasN := i.Name.TryGet()
	k, hasK := i.Key.TryGet()

	if hasN || hasK {
		ctx.Print(" ")

		if !hasN {
			ctx.Print("?")
		} else if !isPrintable(n) || strings.Contains(n, `"`) {
			ctx.Print(strconv.Quote(n))
		} else {
			ctx.Print(n)
		}

		ctx.Print("/")

		if !hasK {
			ctx.Print("?")
		} else if !isPrintable(k) || strings.Contains(k, `"`) {
			ctx.Print(strconv.Quote(k))
		} else {
			ctx.Print(k)

			if uuid, err := uuidpb.Parse(k); err == nil {
				if uuid.AsString() != k {
					ctx.Print(" (non-canonical)")
				}
			}
		}
	}

	ctx.Print("\n")
	ctx.DescribeErrors()
}

// InvalidIdentityNameError indicates that the "name" element of an [Identity]
// is invalid.
type InvalidIdentityNameError struct {
	InvalidName string
}

func (e InvalidIdentityNameError) Error() string {
	return fmt.Sprintf("invalid name (%q), expected a non-empty, printable UTF-8 string with no whitespace", e.InvalidName)
}

// InvalidIdentityKeyError indicates that the "key" element of an [Identity]
// is invalid.
type InvalidIdentityKeyError struct {
	InvalidKey string
}

func (e InvalidIdentityKeyError) Error() string {
	return fmt.Sprintf("invalid key (%q), expected an RFC 4122/9562 UUID", e.InvalidKey)
}

// isPrintable returns true if n is a non-empty string containing only
// non-whitespace printable Unicode characters.
func isPrintable(n string) bool {
	if len(n) == 0 {
		return false
	}

	for _, r := range n {
		if unicode.IsSpace(r) || !unicode.IsPrint(r) {
			return false
		}
	}

	return true
}
