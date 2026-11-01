package uuidpb

import (
	"crypto/rand"
	"crypto/sha1"
	"errors"
	"fmt"
)

// Generate returns a new randomly generated (v4) UUID.
func Generate() *UUID {
	var data [16]byte
	if _, err := rand.Read(data[:]); err != nil {
		panic(err)
	}

	data[6] = (data[6] & 0x0f) | 0x40 // Version 4
	data[8] = (data[8] & 0x3f) | 0x80 // Variant is 10 (RFC 9562)

	return FromByteArray(data)
}

// Derive returns a new SHA-1 derived (v5) UUID from the given namespace and
// names.
func Derive[T ~string | ~[]byte](ns *UUID, names ...T) *UUID {
	hash := sha1.New()
	var data [20]byte // storage for derived UUID and intermediate hash

	CopyBytes(ns, data[:16])

	for _, name := range names {
		hash.Reset()
		hash.Write(data[:16])
		hash.Write([]byte(name))
		hash.Sum(data[:0])

		data[6] = (data[6] & 0x0f) | 0x50 // Version 5
		data[8] = (data[8] & 0x3f) | 0x80 // Variant is 10 (RFC 9562)
	}

	return NewUUIDBuilder().
		WithUpper(
			uint64(data[0])<<56 |
				uint64(data[1])<<48 |
				uint64(data[2])<<40 |
				uint64(data[3])<<32 |
				uint64(data[4])<<24 |
				uint64(data[5])<<16 |
				uint64(data[6])<<8 |
				uint64(data[7]),
		).
		WithLower(
			uint64(data[8])<<56 |
				uint64(data[9])<<48 |
				uint64(data[10])<<40 |
				uint64(data[11])<<32 |
				uint64(data[12])<<24 |
				uint64(data[13])<<16 |
				uint64(data[14])<<8 |
				uint64(data[15]),
		).
		Build()
}

// Parse parses an RFC 9562 "hex-and-dash" UUID string.
func Parse(str string) (*UUID, error) {
	uuid := &UUID{}
	if err := uuid.UnmarshalText([]byte(str)); err != nil {
		return nil, err
	}
	return uuid, nil
}

// MustParse parses an RFC 9562 "hex-and-dash" UUID string, or panics if unable
// to do so.
func MustParse(str string) *UUID {
	uuid, err := Parse(str)
	if err != nil {
		panic(err)
	}
	return uuid
}

// ParseAsByteArray parses an RFC 9562 "hex-and-dash" UUID string directly to
// its byte array representation.
//
// This is equivalent to calling AsByteArray() on the result of Parse(str),
// but avoids all allocations.
func ParseAsByteArray(str string) ([16]byte, error) {
	var uuid [16]byte
	return uuid, ParseIntoBytes(str, uuid[:])
}

// MustParseAsByteArray parses an RFC 9562 "hex-and-dash" UUID string directly
// to its byte array representation, or panics if unable to do so.
//
// This is equivalent to calling MustParse(str).AsByteArray(), but avoids
// all allocations.
func MustParseAsByteArray(str string) [16]byte {
	uuid, err := ParseAsByteArray(str)
	if err != nil {
		panic(err)
	}
	return uuid
}

// ParseIntoBytes parses an RFC 9562 "hex-and-dash" UUID string into the given
// byte slice.
//
// This is equivalent to calling [CopyBytes] on the result of [Parse], but
// avoids all allocations.
func ParseIntoBytes(str string, dst []byte) error {
	if len(dst) < 16 {
		return fmt.Errorf(
			"destination slice must have at least 16 bytes, got %d",
			len(dst),
		)
	}

	if len(str) != 36 {
		return errors.New("invalid UUID format, expected 36 characters")
	}

	read := 0
	write := 0

	for read < 36 {
		switch read {
		case 8, 13, 18, 23:
			if str[read] != '-' {
				return fmt.Errorf("invalid UUID format, expected hyphen at position %d", read)
			}

			read++
		}

		high, err := fromHex(str, read)
		if err != nil {
			return err
		}

		read++

		low, err := fromHex(str, read)
		if err != nil {
			return err
		}

		read++

		dst[write] = (high << 4) | low
		write++
	}

	return nil
}

// MustParseIntoBytes parses an RFC 9562 "hex-and-dash" UUID string into the
// given byte slice, or panics if unable to do so.
//
// This is equivalent to calling [CopyBytes] on the result of [MustParse], but
// avoids all allocations.
func MustParseIntoBytes(str string, dst []byte) {
	if err := ParseIntoBytes(str, dst); err != nil {
		panic(err)
	}
}

// ParseAsBytes parses an RFC 9562 "hex-and-dash" UUID string directly to its
// byte slice representation.
//
// This is equivalent to calling AsBytes() on the result of Parse(str),
// but avoids allocation of the intermediate [UUID] struct.
func ParseAsBytes(str string) ([]byte, error) {
	uuid, err := ParseAsByteArray(str)
	if err != nil {
		return nil, err
	}
	return uuid[:], nil
}

// MustParseAsBytes parses an RFC 9562 "hex-and-dash" UUID string directly to
// its byte slice representation, or panics if unable to do so.
//
// This is equivalent to calling MustParse(str).AsBytes(), but avoids allocation
// of the intermediate [UUID] struct.
func MustParseAsBytes(str string) []byte {
	uuid := MustParseAsByteArray(str)
	return uuid[:]
}

// FromBytes returns a UUID from a byte slice.
//
// It returns an error if the length of the slice is not exactly 16 bytes.
func FromBytes[T ~[]B, B byte](data T) (*UUID, error) {
	if len(data) != 16 {
		return nil, fmt.Errorf("slice must be exactly 16 bytes, got %d", len(data))
	}

	return NewUUIDBuilder().
		WithUpper(
			uint64(data[0])<<56 |
				uint64(data[1])<<48 |
				uint64(data[2])<<40 |
				uint64(data[3])<<32 |
				uint64(data[4])<<24 |
				uint64(data[5])<<16 |
				uint64(data[6])<<8 |
				uint64(data[7]),
		).
		WithLower(
			uint64(data[8])<<56 |
				uint64(data[9])<<48 |
				uint64(data[10])<<40 |
				uint64(data[11])<<32 |
				uint64(data[12])<<24 |
				uint64(data[13])<<16 |
				uint64(data[14])<<8 |
				uint64(data[15]),
		).
		Build(), nil
}

// FromByteArray returns a UUID from a byte array.
func FromByteArray[T ~[16]B, B byte](data T) *UUID {
	return NewUUIDBuilder().
		WithUpper(
			uint64(data[0])<<56 |
				uint64(data[1])<<48 |
				uint64(data[2])<<40 |
				uint64(data[3])<<32 |
				uint64(data[4])<<24 |
				uint64(data[5])<<16 |
				uint64(data[6])<<8 |
				uint64(data[7]),
		).
		WithLower(
			uint64(data[8])<<56 |
				uint64(data[9])<<48 |
				uint64(data[10])<<40 |
				uint64(data[11])<<32 |
				uint64(data[12])<<24 |
				uint64(data[13])<<16 |
				uint64(data[14])<<8 |
				uint64(data[15]),
		).
		Build()
}

// AsByteArray returns the UUID as a byte array.
func AsByteArray[T ~[16]B, B ~byte](x *UUID) T {
	var data T

	if x != nil {
		upper := x.GetUpper()
		lower := x.GetLower()

		data[0] = B(upper >> 56)
		data[1] = B(upper >> 48)
		data[2] = B(upper >> 40)
		data[3] = B(upper >> 32)
		data[4] = B(upper >> 24)
		data[5] = B(upper >> 16)
		data[6] = B(upper >> 8)
		data[7] = B(upper)

		data[8] = B(lower >> 56)
		data[9] = B(lower >> 48)
		data[10] = B(lower >> 40)
		data[11] = B(lower >> 32)
		data[12] = B(lower >> 24)
		data[13] = B(lower >> 16)
		data[14] = B(lower >> 8)
		data[15] = B(lower)
	}

	return data
}

// CopyBytes copies the binary representation of x into dst.
//
// It returns the number of elements copied, which will be the minimum of 16 and
// len(dst).
func CopyBytes[T ~[]B, B byte](x *UUID, dst T) int {
	data := AsByteArray[[16]B](x)
	return copy(dst, data[:])
}

// AsBytes returns the UUID as a byte slice.
func (x *UUID) AsBytes() []byte {
	data := AsByteArray[[16]byte](x)
	return data[:]
}

// AsByteArray returns the UUID as a byte array.
func (x *UUID) AsByteArray() [16]byte {
	return AsByteArray[[16]byte](x)
}

// AsString returns the UUID as an RFC 9562 string.
func (x *UUID) AsString() string {
	data := asHex(x.GetUpper(), x.GetLower())
	return string(data[:])
}

// GoString implements the [fmt.GoStringer] interface.
func (x *UUID) GoString() string {
	return fmt.Sprintf("uuidpb.MustParse(%q)", x.AsString())
}

// DapperString implements [github.com/dogmatiq/dapper.Stringer].
func (x *UUID) DapperString() string {
	return x.AsString()
}

// MarshalText implements the [encoding.TextMarshaler] interface.
func (x *UUID) MarshalText() ([]byte, error) {
	data := asHex(x.GetUpper(), x.GetLower())
	return data[:], nil
}

// UnmarshalText implements the [encoding.TextUnmarshaler] interface.
func (x *UUID) UnmarshalText(text []byte) error {
	if len(text) != 36 {
		return errors.New("invalid UUID format, expected 36 characters")
	}

	x.xxx_hidden_Upper = 0
	x.xxx_hidden_Lower = 0

	var (
		target = &x.xxx_hidden_Upper
		shift  = 60
	)

	for index, digit := range text {
		switch index {
		case 18:
			target = &x.xxx_hidden_Lower
			shift = 60
			fallthrough
		case 8, 13, 23:
			if digit != '-' {
				return fmt.Errorf("invalid UUID format, expected hyphen at position %d", index)
			}
		default:
			value := fromHexMap[digit]
			if value == bad {
				return fmt.Errorf("invalid UUID format, expected hex digit at position %d", index)
			}

			*target |= uint64(value) << shift
			shift -= 4
		}
	}

	return nil
}

// Validate returns an error if x is not a valid Version 4 (random) or Version 5
// (name-based) UUID.
func (x *UUID) Validate() error {
	// Only versions 4 (random) and 5 (name-based/SHA-1) are accepted.
	//
	// Version 7 (time-ordered) is intentionally excluded:
	//   - Its primary benefit — B-tree index locality — only applies when the
	//     UUID is a clustered primary key in a non-sharded B-tree database at
	//     high write volumes. Dogmatiq uses UUIDs for message IDs and handler
	//     identities, neither of which fits this profile.
	//   - In sharded or distributed databases (CockroachDB, Spanner, Cassandra,
	//     etc.), the sequential timestamp prefix causes write hotspots, actively
	//     harming throughput.
	//   - The naive implementation does not guarantee monotonicity within a
	//     millisecond; true per-millisecond ordering requires shared mutable
	//     state and clock-rollback handling.
	//   - The embedded timestamp permanently leaks creation time to any observer
	//     of the identifier, which is undesirable for security-sensitive uses.
	switch (x.GetUpper() >> 8) & 0xf0 {
	case 0x40, 0x50:
	default:
		return errors.New("UUID must use version 4 or 5")
	}

	if variant := (x.GetLower() >> 56) & 0xc0; variant != 0x80 {
		return fmt.Errorf("UUID must use RFC 9562 variant")
	}

	return nil
}

// Equal returns true if x and id are equal.
func (x *UUID) Equal(id *UUID) bool {
	return x.GetUpper() == id.GetUpper() && x.GetLower() == id.GetLower()
}

// Less returns true if x is less than id.
func (x *UUID) Less(id *UUID) bool {
	return x.Compare(id) < 0
}

// Compare performs a three-way comparison between x and id.
func (x *UUID) Compare(id *UUID) int {
	return compare(
		x.GetUpper(),
		x.GetLower(),
		id.GetUpper(),
		id.GetLower(),
	)
}

// bad is a sentinel value that indicates an invalid hexadecimal digit.
const bad = 255

var (
	toHex = [16]byte{
		'0', '1', '2', '3',
		'4', '5', '6', '7',
		'8', '9', 'a', 'b',
		'c', 'd', 'e', 'f',
	}

	fromHexMap = [256]byte{
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		0x0, 0x1, 0x2, 0x3, 0x4, 0x5, 0x6, 0x7, 0x8, 0x9, bad, bad, bad, bad, bad, bad,
		bad, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, 0xa, 0xb, 0xc, 0xd, 0xe, 0xf, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
		bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad, bad,
	}
)

// fromHex returns the numerical value of a hexadecimal digit at the given index
// in str.
func fromHex(str string, index int) (byte, error) {
	v := fromHexMap[str[index]]
	if v == bad {
		return 0, fmt.Errorf("invalid UUID format, expected hex digit at position %d", index)
	}
	return v, nil
}

// plain is a [comparable] representation of a [UUID].
type plain struct {
	upper, lower uint64
}

// DapperString implements [github.com/dogmatiq/dapper.Stringer].
func (k plain) DapperString() string {
	data := asHex(k.upper, k.lower)
	return string(data[:])
}

// asHex returns the RFC 9562 "hex-and-dash" representation of a UUID with
// the given upper and lower components.
func asHex(upper, lower uint64) [36]byte {
	var str [36]byte

	source := &upper
	shift := 60

	for index := 0; index < 36; index++ {
		switch index {
		case 18:
			source = &lower
			shift = 60
			fallthrough
		case 8, 13, 23:
			str[index] = '-'
		default:
			value := (*source >> shift) & 0xf
			str[index] = toHex[value]
			shift -= 4
		}
	}

	return str
}

func compare(
	upperA, lowerA uint64,
	upperB, lowerB uint64,
) int {
	if upperA > upperB {
		return 1
	} else if upperA < upperB {
		return -1
	} else if lowerA > lowerB {
		return 1
	} else if lowerA < lowerB {
		return -1
	}
	return 0
}
