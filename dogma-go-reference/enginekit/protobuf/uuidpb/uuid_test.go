package uuidpb_test

import (
	"bytes"
	"testing"

	"github.com/dogmatiq/dapper"
	. "github.com/dogmatiq/enginekit/protobuf/uuidpb"
	"google.golang.org/protobuf/proto"
)

func TestGenerate(t *testing.T) {
	t.Parallel()

	uuid := Generate()

	if err := uuid.Validate(); err != nil {
		t.Fatal(err)
	}
}

func TestDerive(t *testing.T) {
	t.Parallel()

	t.Run("it derives a UUID from the namespace using SHA-1 and string name", func(t *testing.T) {
		t.Parallel()

		ns := MustParse("9236932a-4971-43d0-a667-26711872681e")
		const want = "bf6d549f-7fa3-52ea-a9cd-2817080dd532"
		got := Derive(ns, "<name>")

		if got.AsString() != want {
			t.Fatalf("unexpected derived UUID: got %q, want %q", got, want)
		}
	})

	t.Run("it derives a UUID from the namespace using SHA-1 and byte-slice name", func(t *testing.T) {
		t.Parallel()

		ns := MustParse("9236932a-4971-43d0-a667-26711872681e")
		const want = "bf6d549f-7fa3-52ea-a9cd-2817080dd532"
		got := Derive(ns, []byte("<name>"))

		if got.AsString() != want {
			t.Fatalf("unexpected derived UUID: got %q, want %q", got, want)
		}
	})

	t.Run("it performs multiple derivations when passed multiple names", func(t *testing.T) {
		t.Parallel()

		ns := Generate()
		intermediate := Derive(ns, "<name-1>")
		want := Derive(intermediate, "<name-2>")
		got := Derive(ns, "<name-1>", "<name-2>")

		if !got.Equal(want) {
			t.Fatalf("unexpected derived UUID: got %q, want %q", got, want)
		}
	})
}

var (
	validCases = []struct {
		Desc   string
		String string
	}{
		{"lowercase", "a967a8b9-3f9c-4918-9a41-19577be5fec5"},
		{"uppercase", "A967A8B9-3F9C-4918-9A41-19577BE5FEC5"},
	}

	invalidCases = []struct {
		Desc   string
		String string
	}{
		{"empty string", ""},
		{"too short", "3493af5d-e4d0-4f3b-a73d-048e6b08496"},
		{"too long", "3493af5d-e4d0-4f3b-a73d-048e6b08496ab"},
		{"no hyphens", "a967a8b93f9c49189a4119577be5fec5"},
		{"no hyphens at position 8", "7e770248_7336-4cee-881d-f24013e6c1bf"},
		{"no hyphens at position 13", "7e770248-7336_4cee-881d-f24013e6c1bf"},
		{"no hyphens at position 18", "7e770248-7336-4cee_881d-f24013e6c1bf"},
		{"no hyphens at position 23", "7e770248-7336-4cee-881d_f24013e6c1bf"},
		{"non-hex character", "26c4a622-e4b4-4Xe7-8454-e3dc90f7d1d8"},
	}
)

func TestParse(t *testing.T) {
	t.Parallel()

	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range validCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				expect := NewUUIDBuilder().
					WithUpper(0xa967a8b93f9c4918).
					WithLower(0x9a4119577be5fec5).
					Build()
				actual, err := Parse(c.String)
				if err != nil {
					t.Fatal(err)
				}

				if !proto.Equal(actual, expect) {
					t.Fatalf("got %q, want %q", actual, expect)
				}
			})
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range invalidCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				_, err := Parse(c.String)
				if err == nil {
					t.Fatal("expected an error")
				}
			})
		}
	})
}

func BenchmarkParse(b *testing.B) {
	for b.Loop() {
		_, err := Parse("a967a8b9-3f9c-4918-9a41-19577be5fec5")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestParse_OnlyAllocatesTheUUID(t *testing.T) {
	allocs := testing.AllocsPerRun(100, func() {
		Parse("a967a8b9-3f9c-4918-9a41-19577be5fec5")
	})

	if allocs != 1 {
		t.Fatalf("expected exactly 1 allocation, got %f", allocs)
	}
}

func TestMustParse(t *testing.T) {
	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		expect := NewUUIDBuilder().
			WithUpper(0xa967a8b93f9c4918).
			WithLower(0x9a4119577be5fec5).
			Build()
		actual := MustParse("a967a8b9-3f9c-4918-9a41-19577be5fec5")

		if !proto.Equal(actual, expect) {
			t.Fatalf("got %q, want %q", actual, expect)
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		MustParse("invalid")
	})
}

func TestParseAsByteArray(t *testing.T) {
	t.Parallel()

	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range validCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				expect := [16]byte{
					0xa9, 0x67, 0xa8, 0xb9,
					0x3f, 0x9c, 0x49, 0x18,
					0x9a, 0x41, 0x19, 0x57,
					0x7b, 0xe5, 0xfe, 0xc5,
				}
				actual, err := ParseAsByteArray(c.String)
				if err != nil {
					t.Fatal(err)
				}

				if actual != expect {
					t.Fatalf("got %v, want %v", actual, expect)
				}
			})
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range invalidCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				_, err := ParseAsByteArray(c.String)
				if err == nil {
					t.Fatal("expected an error")
				}
			})
		}
	})
}

func TestParseAsByteArray_DoesNotAlloc(t *testing.T) {
	allocs := testing.AllocsPerRun(100, func() {
		ParseAsByteArray("a967a8b9-3f9c-4918-9a41-19577be5fec5")
	})

	if allocs != 0 {
		t.Fatalf("expected zero allocations, got %f", allocs)
	}
}

func BenchmarkParseAsByteArray(b *testing.B) {
	for b.Loop() {
		_, err := ParseAsByteArray("a967a8b9-3f9c-4918-9a41-19577be5fec5")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestMustParseAsByteArray(t *testing.T) {
	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		expect := [16]byte{
			0xa9, 0x67, 0xa8, 0xb9,
			0x3f, 0x9c, 0x49, 0x18,
			0x9a, 0x41, 0x19, 0x57,
			0x7b, 0xe5, 0xfe, 0xc5,
		}
		actual := MustParseAsByteArray("a967a8b9-3f9c-4918-9a41-19577be5fec5")

		if actual != expect {
			t.Fatalf("got %q, want %q", actual, expect)
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		MustParseAsByteArray("invalid")
	})
}

func TestParseIntoBytes(t *testing.T) {
	t.Parallel()

	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range validCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				expect := [16]byte{
					0xa9, 0x67, 0xa8, 0xb9,
					0x3f, 0x9c, 0x49, 0x18,
					0x9a, 0x41, 0x19, 0x57,
					0x7b, 0xe5, 0xfe, 0xc5,
				}
				var actual [16]byte
				err := ParseIntoBytes(c.String, actual[:])
				if err != nil {
					t.Fatal(err)
				}

				if actual != expect {
					t.Fatalf("got %v, want %v", actual, expect)
				}
			})
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range invalidCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				var target [16]byte
				err := ParseIntoBytes(c.String, target[:])
				if err == nil {
					t.Fatal("expected an error")
				}
			})
		}
	})

	t.Run("when the target slice does not have adequate length", func(t *testing.T) {
		t.Parallel()

		var target [8]byte
		err := ParseIntoBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5", target[:])
		if err == nil {
			t.Fatal("expected an error")
		}
	})
}

func TestParseIntoBytes_DoesNotAlloc(t *testing.T) {
	allocs := testing.AllocsPerRun(100, func() {
		var target [16]byte
		ParseIntoBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5", target[:])
	})

	if allocs != 0 {
		t.Fatalf("expected zero allocations, got %f", allocs)
	}
}

func BenchmarkParseIntoBytes(b *testing.B) {
	var target [16]byte

	for b.Loop() {
		err := ParseIntoBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5", target[:])
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestMustParseIntoBytes(t *testing.T) {
	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		expect := [16]byte{
			0xa9, 0x67, 0xa8, 0xb9,
			0x3f, 0x9c, 0x49, 0x18,
			0x9a, 0x41, 0x19, 0x57,
			0x7b, 0xe5, 0xfe, 0xc5,
		}
		var actual [16]byte
		MustParseIntoBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5", actual[:])

		if actual != expect {
			t.Fatalf("got %q, want %q", actual, expect)
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		var target [16]byte
		MustParseIntoBytes("invalid", target[:])
	})

	t.Run("when the target slice does not have adequate length", func(t *testing.T) {
		t.Parallel()

		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		var target [8]byte
		MustParseIntoBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5", target[:])
	})
}

func TestParseAsBytes(t *testing.T) {
	t.Parallel()

	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range validCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				expect := []byte{
					0xa9, 0x67, 0xa8, 0xb9,
					0x3f, 0x9c, 0x49, 0x18,
					0x9a, 0x41, 0x19, 0x57,
					0x7b, 0xe5, 0xfe, 0xc5,
				}
				actual, err := ParseAsBytes(c.String)
				if err != nil {
					t.Fatal(err)
				}

				if !bytes.Equal(actual, expect) {
					t.Fatalf("got %v, want %v", actual, expect)
				}
			})
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		for _, c := range invalidCases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				_, err := ParseAsBytes(c.String)
				if err == nil {
					t.Fatal("expected an error")
				}
			})
		}
	})
}

func BenchmarkParseAsBytes(b *testing.B) {
	for b.Loop() {
		_, err := ParseAsBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5")
		if err != nil {
			b.Fatal(err)
		}
	}
}

func TestMustParseAsBytes(t *testing.T) {
	t.Run("when the string is a valid UUID", func(t *testing.T) {
		t.Parallel()

		expect := []byte{
			0xa9, 0x67, 0xa8, 0xb9,
			0x3f, 0x9c, 0x49, 0x18,
			0x9a, 0x41, 0x19, 0x57,
			0x7b, 0xe5, 0xfe, 0xc5,
		}
		actual := MustParseAsBytes("a967a8b9-3f9c-4918-9a41-19577be5fec5")

		if !bytes.Equal(actual, expect) {
			t.Fatalf("got %q, want %q", actual, expect)
		}
	})

	t.Run("when the string is not a valid UUID", func(t *testing.T) {
		t.Parallel()

		defer func() {
			if r := recover(); r == nil {
				t.Fatal("expected a panic")
			}
		}()

		MustParseAsBytes("invalid")
	})
}

func TestFromBytes(t *testing.T) {
	t.Parallel()

	subject := []byte{
		0xa9, 0x67, 0xa8, 0xb9,
		0x3f, 0x9c, 0x49, 0x18,
		0x9a, 0x41, 0x19, 0x57,
		0x7b, 0xe5, 0xfe, 0xc5,
	}

	actual, err := FromBytes(subject)
	if err != nil {
		t.Fatal(err)
	}

	expect := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	if !proto.Equal(actual, expect) {
		t.Fatalf("got %s, want %s", actual, expect)
	}

	_, err = FromBytes(subject[:8])
	if err == nil {
		t.Fatal("expected an error")
	}
}

func TestFromByteArray(t *testing.T) {
	t.Parallel()

	subject := [16]byte{
		0xa9, 0x67, 0xa8, 0xb9,
		0x3f, 0x9c, 0x49, 0x18,
		0x9a, 0x41, 0x19, 0x57,
		0x7b, 0xe5, 0xfe, 0xc5,
	}

	actual := FromByteArray(subject)
	expect := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	if !proto.Equal(actual, expect) {
		t.Fatalf("got %s, want %s", actual, expect)
	}
}

func TestAsByteArray(t *testing.T) {
	t.Parallel()

	subject := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	actual := AsByteArray[[16]byte](subject)
	expect := [16]byte{
		0xa9, 0x67, 0xa8, 0xb9,
		0x3f, 0x9c, 0x49, 0x18,
		0x9a, 0x41, 0x19, 0x57,
		0x7b, 0xe5, 0xfe, 0xc5,
	}

	if actual != expect {
		t.Fatalf("got %#v, want %#v", actual, expect)
	}
}

func TestCopyBytes(t *testing.T) {
	t.Parallel()

	subject := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	t.Run("fills the target slice with the UUID's bytes", func(t *testing.T) {
		var actual [16]byte
		n := CopyBytes(subject, actual[:])
		expect := []byte{
			0xa9, 0x67, 0xa8, 0xb9,
			0x3f, 0x9c, 0x49, 0x18,
			0x9a, 0x41, 0x19, 0x57,
			0x7b, 0xe5, 0xfe, 0xc5,
		}

		if !bytes.Equal(actual[:], expect) {
			t.Fatalf("got %q, want %q", actual, expect)
		}

		if n != 16 {
			t.Fatalf("got %d, want 16", n)
		}
	})

	t.Run("it truncates to the target slice's length", func(t *testing.T) {
		var actual [8]byte
		n := CopyBytes(subject, actual[:])
		expect := []byte{
			0xa9, 0x67, 0xa8, 0xb9,
			0x3f, 0x9c, 0x49, 0x18,
		}

		if !bytes.Equal(actual[:], expect) {
			t.Fatalf("got %q, want %q", actual, expect)
		}

		if n != 8 {
			t.Fatalf("got %d, want 8", n)
		}
	})
}

func TestUUID_AsBytesAndAsByteArray(t *testing.T) {
	t.Parallel()

	cases := []struct {
		Desc    string
		Subject *UUID
		Expect  []byte
	}{
		{
			"nil",
			nil,
			[]byte{
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
			},
		},
		{
			"zero",
			&UUID{},
			[]byte{
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
				0x00, 0x00, 0x00, 0x00,
			},
		},
		{
			"non-zero",
			NewUUIDBuilder().
				WithUpper(0xa967a8b93f9c4918).
				WithLower(0x9a4119577be5fec5).
				Build(),
			[]byte{
				0xa9, 0x67, 0xa8, 0xb9,
				0x3f, 0x9c, 0x49, 0x18,
				0x9a, 0x41, 0x19, 0x57,
				0x7b, 0xe5, 0xfe, 0xc5,
			},
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			t.Parallel()

			actual := c.Subject.AsBytes()

			if !bytes.Equal(actual, c.Expect) {
				t.Fatalf("got %q, want %q", actual, c.Expect)
			}

			array := c.Subject.AsByteArray()
			if !bytes.Equal(array[:], c.Expect) {
				t.Fatalf("got %q, want %q", array, c.Expect)
			}
		})
	}
}

func TestUUID_AsString(t *testing.T) {
	t.Parallel()

	cases := []struct {
		Desc    string
		Subject *UUID
		Expect  string
	}{
		{"nil", nil, "00000000-0000-0000-0000-000000000000"},
		{"zero", &UUID{}, "00000000-0000-0000-0000-000000000000"},
		{
			"non-zero",
			NewUUIDBuilder().
				WithUpper(0xa967a8b93f9c4918).
				WithLower(0x9a4119577be5fec5).
				Build(),
			"a967a8b9-3f9c-4918-9a41-19577be5fec5",
		},
	}

	for _, c := range cases {
		t.Run(c.Desc, func(t *testing.T) {
			t.Parallel()

			actual := c.Subject.AsString()

			if actual != c.Expect {
				t.Fatalf("got %q, want %q", actual, c.Expect)
			}
		})
	}
}

func TestUUID_MarshalText(t *testing.T) {
	t.Parallel()

	subject := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	text, err := subject.MarshalText()
	if err != nil {
		t.Fatal(err)
	}

	if got, want := string(text), "a967a8b9-3f9c-4918-9a41-19577be5fec5"; got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestUUID_UnmarshalText(t *testing.T) {
	t.Parallel()

	t.Run("it populates the UUID from text", func(t *testing.T) {
		t.Parallel()

		var subject UUID
		if err := subject.UnmarshalText([]byte("a967a8b9-3f9c-4918-9a41-19577be5fec5")); err != nil {
			t.Fatal(err)
		}

		if got, want := subject.GetUpper(), uint64(0xa967a8b93f9c4918); got != want {
			t.Fatalf("upper: got %#x, want %#x", got, want)
		}
		if got, want := subject.GetLower(), uint64(0x9a4119577be5fec5); got != want {
			t.Fatalf("lower: got %#x, want %#x", got, want)
		}
	})

	t.Run("it returns an error for invalid text", func(t *testing.T) {
		t.Parallel()

		var subject UUID
		if err := subject.UnmarshalText([]byte("not-a-uuid")); err == nil {
			t.Fatal("expected an error")
		}
	})
}

func TestUUID_UnmarshalText_DoesNotAlloc(t *testing.T) {
	text := []byte("a967a8b9-3f9c-4918-9a41-19577be5fec5")
	var subject UUID

	allocs := testing.AllocsPerRun(100, func() {
		subject.UnmarshalText(text)
	})

	if allocs != 0 {
		t.Fatalf("expected zero allocations, got %f", allocs)
	}
}

func TestUUID_DapperString(t *testing.T) {
	t.Parallel()

	subject := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	actual := dapper.Format(subject)
	expect := "*github.com/dogmatiq/enginekit/protobuf/uuidpb.UUID [a967a8b9-3f9c-4918-9a41-19577be5fec5]"

	if actual != expect {
		t.Fatalf("got %q, want %q", actual, expect)
	}
}

func TestUUID_Validate(t *testing.T) {
	t.Parallel()

	t.Run("when the UUID is valid", func(t *testing.T) {
		t.Parallel()

		cases := []struct {
			Desc    string
			Subject *UUID
		}{
			{
				"version 4",
				NewUUIDBuilder().
					WithUpper(0xa967a8b93f9c4918).
					WithLower(0x9a4119577be5fec5).
					Build(),
			},
			{
				"version 5",
				NewUUIDBuilder().
					WithUpper(0xbf6d549f7fa352ea).
					WithLower(0xa9cd2817080dd532).
					Build(),
			},
		}

		for _, c := range cases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				if err := c.Subject.Validate(); err != nil {
					t.Fatal(err)
				}
			})
		}
	})

	t.Run("when the UUID is invalid", func(t *testing.T) {
		t.Parallel()

		cases := []struct {
			Desc    string
			Subject *UUID
			Expect  string
		}{
			{
				"nil UUID",
				&UUID{},
				"UUID must use version 4 or 5",
			},
			{
				"omni UUID",
				NewUUIDBuilder().
					WithUpper(0xffffffffffffffff).
					WithLower(0xffffffffffffffff).
					Build(),
				"UUID must use version 4 or 5",
			},
			{
				"wrong version",
				NewUUIDBuilder().
					WithUpper(0xa967a8b93f9c_f0_18).
					WithLower(0x9a4119577be5fec5).
					Build(),
				"UUID must use version 4 or 5",
			},
			{
				"wrong variant",
				NewUUIDBuilder().
					WithUpper(0xa967a8b93f9c4918).
					WithLower(0xc0_4119577be5fec5).
					Build(),
				"UUID must use RFC 9562 variant",
			},
		}

		for _, c := range cases {
			t.Run(c.Desc, func(t *testing.T) {
				t.Parallel()

				err := c.Subject.Validate()
				if err == nil {
					t.Fatal("expected an error")
				}
				if err.Error() != c.Expect {
					t.Fatalf("got %q, want %q", err, c.Expect)
				}
			})
		}
	})
}

func TestUUID_Equal(t *testing.T) {
	t.Parallel()

	a := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	b := NewUUIDBuilder().
		WithUpper(0x3f9c4918a967a8b9).
		WithLower(0x7be5fec59a411957).
		Build()

	if a.Equal(b) {
		t.Fatal("did not expect a == b")
	}

	if !a.Equal(a) {
		t.Fatal("did not expect a != b")
	}
}

func TestUUID_Less(t *testing.T) {
	t.Parallel()

	a := NewUUIDBuilder().
		WithUpper(0xa967a8b93f9c4918).
		WithLower(0x9a4119577be5fec5).
		Build()

	b := NewUUIDBuilder().
		WithUpper(0x3f9c4918a967a8b9).
		WithLower(0x7be5fec59a411957).
		Build()

	if a.Less(b) {
		t.Fatal("did not expect a < b")
	}

	if !b.Less(a) {
		t.Fatal("did not expect b >= a")
	}

	if a.Less(a) {
		t.Fatal("did not expect a < b")
	}
}

func TestUUID_Compare(t *testing.T) {
	t.Parallel()

	t.Run("compares both the upper and lower parts", func(t *testing.T) {
		a := NewUUIDBuilder().
			WithUpper(0xa967a8b93f9c4918).
			WithLower(0x9a4119577be5fec5).
			Build()

		b := NewUUIDBuilder().
			WithUpper(0x3f9c4918a967a8b9).
			WithLower(0x7be5fec59a411957).
			Build()

		c := NewUUIDBuilder().
			WithUpper(0x3f9c4918a967a8b9).
			WithLower(0x0000fec59a411957).
			Build()

		if a.Compare(b) < 0 {
			t.Fatal("did not expect a < b")
		}

		if b.Compare(a) >= 0 {
			t.Fatal("did not expect b >= a")
		}

		if a.Compare(a) != 0 {
			t.Fatal("did not expect a != b")
		}

		if b.Compare(c) <= 0 {
			t.Fatal("did not expect b <= c")
		}
	})

	t.Run("subtraction overflow regression", func(t *testing.T) {
		a, err := Parse("e6929f89-acb1-4994-8248-d097ad20da5f")
		if err != nil {
			t.Fatal(err)
		}

		b, err := Parse("46471d80-5b50-44a0-a8a8-261941336291")
		if err != nil {
			t.Fatal(err)
		}

		if a.Compare(b) <= 0 {
			t.Fatal("did not expect a <= b")
		}
	})
}
