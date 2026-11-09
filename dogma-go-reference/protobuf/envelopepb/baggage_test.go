package envelopepb_test

import (
	"testing"

	. "github.com/dogmatiq/protobuf/envelopepb"
	. "github.com/dogmatiq/protobuf/internal/xtesting"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

func TestSetBaggage(t *testing.T) {
	t.Run("it adds the value to the body's baggage", func(t *testing.T) {
		want, err := anypb.New(wrapperspb.String("hello"))
		if err != nil {
			t.Fatal(err)
		}

		body := NewBodyBuilder().Build()
		SetBaggage(body, wrapperspb.String("hello"))

		Expect(
			t,
			"unexpected baggage",
			body.GetBaggage(),
			[]*anypb.Any{want},
		)
	})

	t.Run("it adds the value to the header's baggage", func(t *testing.T) {
		want, err := anypb.New(wrapperspb.String("hello"))
		if err != nil {
			t.Fatal(err)
		}

		header := NewHeaderBuilder().Build()
		SetBaggage(header, wrapperspb.String("hello"))

		Expect(
			t,
			"unexpected baggage",
			header.GetBaggage(),
			[]*anypb.Any{want},
		)
	})

	t.Run("when a baggage value of the same type is present with a different type URL prefix", func(t *testing.T) {
		t.Run("it replaces the existing value", func(t *testing.T) {
			want, err := anypb.New(wrapperspb.String("second"))
			if err != nil {
				t.Fatal(err)
			}

			first, err := anypb.New(wrapperspb.String("first"))
			if err != nil {
				t.Fatal(err)
			}
			first.TypeUrl = "example.com/google.protobuf.StringValue"

			body := NewBodyBuilder().Build()
			body.SetBaggage([]*anypb.Any{first})
			SetBaggage(body, wrapperspb.String("second"))

			Expect(
				t,
				"unexpected values",
				body.GetBaggage(),
				[]*anypb.Any{want},
			)
		})
	})

	t.Run("when a baggage value of the same message type is already present", func(t *testing.T) {
		t.Run("it replaces the existing value", func(t *testing.T) {
			want, err := anypb.New(wrapperspb.String("second"))
			if err != nil {
				t.Fatal(err)
			}

			body := NewBodyBuilder().Build()
			SetBaggage(body, wrapperspb.String("first"))
			SetBaggage(body, wrapperspb.String("second"))

			Expect(
				t,
				"unexpected baggage",
				body.GetBaggage(),
				[]*anypb.Any{want},
			)
		})
	})

	t.Run("when baggage values of other types are present", func(t *testing.T) {
		t.Run("it appends the new value without disturbing the others", func(t *testing.T) {
			wantInt, err := anypb.New(wrapperspb.Int64(42))
			if err != nil {
				t.Fatal(err)
			}

			wantString, err := anypb.New(wrapperspb.String("hello"))
			if err != nil {
				t.Fatal(err)
			}

			body := NewBodyBuilder().Build()
			SetBaggage(body, wrapperspb.Int64(42))
			SetBaggage(body, wrapperspb.String("hello"))

			Expect(
				t,
				"unexpected baggage",
				body.GetBaggage(),
				[]*anypb.Any{wantInt, wantString},
			)
		})
	})

	t.Run("when the value is nil", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			ExpectPanic(
				t,
				"value must not be nil",
				func() {
					SetBaggage(NewBodyBuilder().Build(), nil)
				},
			)
		})
	})

	t.Run("when the value is a nil pointer", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			ExpectPanic(
				t,
				"value must not be nil",
				func() {
					SetBaggage(NewBodyBuilder().Build(), (*wrapperspb.StringValue)(nil))
				},
			)
		})
	})
}

func TestGetBaggage(t *testing.T) {
	t.Run("when a matching baggage value is present", func(t *testing.T) {
		t.Run("it returns the value and true", func(t *testing.T) {
			env := newEmptyEnvelope()
			SetBaggage(env.GetBody(), wrapperspb.String("hello"))

			got, ok, err := GetBaggage[*wrapperspb.StringValue](env)
			if err != nil {
				t.Fatal(err)
			}
			if !ok {
				t.Fatal("expected to find a matching baggage value")
			}

			Expect(
				t,
				"unexpected baggage value",
				got,
				wrapperspb.String("hello"),
			)
		})
	})

	t.Run("when a matching baggage value is present in the header", func(t *testing.T) {
		t.Run("it returns the value and true", func(t *testing.T) {
			env := newEmptyEnvelope()
			env.GetHeader().SetBaggage([]*anypb.Any{
				mustMarshalAny(t, wrapperspb.String("hello")),
			})

			got, ok, err := GetBaggage[*wrapperspb.StringValue](env)
			if err != nil {
				t.Fatal(err)
			}
			if !ok {
				t.Fatal("expected to find a matching baggage value")
			}

			Expect(
				t,
				"unexpected baggage value",
				got,
				wrapperspb.String("hello"),
			)
		})
	})

	t.Run("when a matching baggage value is present in both the header and the body", func(t *testing.T) {
		t.Run("it returns the value from the body", func(t *testing.T) {
			env := newEmptyEnvelope()
			env.GetHeader().SetBaggage([]*anypb.Any{
				mustMarshalAny(t, wrapperspb.String("header")),
			})
			SetBaggage(env.GetBody(), wrapperspb.String("body"))

			got, ok, err := GetBaggage[*wrapperspb.StringValue](env)
			if err != nil {
				t.Fatal(err)
			}
			if !ok {
				t.Fatal("expected to find a matching baggage value")
			}

			Expect(
				t,
				"unexpected baggage value",
				got,
				wrapperspb.String("body"),
			)
		})
	})

	t.Run("when no baggage values are present", func(t *testing.T) {
		t.Run("it returns false", func(t *testing.T) {
			env := newEmptyEnvelope()

			got, ok, err := GetBaggage[*wrapperspb.StringValue](env)
			if err != nil {
				t.Fatal(err)
			}
			if ok {
				t.Fatal("expected to find no matching baggage value")
			}
			if got != nil {
				t.Fatalf("expected nil, got %v", got)
			}
		})
	})

	t.Run("when only baggage values of other types are present", func(t *testing.T) {
		t.Run("it returns false", func(t *testing.T) {
			env := newEmptyEnvelope()
			SetBaggage(env.GetBody(), wrapperspb.Int64(42))

			got, ok, err := GetBaggage[*wrapperspb.StringValue](env)
			if err != nil {
				t.Fatal(err)
			}
			if ok {
				t.Fatal("expected to find no matching baggage value")
			}
			if got != nil {
				t.Fatalf("expected nil, got %v", got)
			}
		})
	})

	t.Run("when a value of the requested type has been set as an extension", func(t *testing.T) {
		t.Run("it returns false (baggage and extensions are distinct)", func(t *testing.T) {
			env := newEmptyEnvelope()
			SetExtension(env.GetBody(), wrapperspb.String("hello"))

			_, ok, err := GetBaggage[*wrapperspb.StringValue](env)
			if err != nil {
				t.Fatal(err)
			}
			if ok {
				t.Fatal("expected to find no matching baggage value")
			}
		})
	})
}

func TestMustGetBaggage(t *testing.T) {
	t.Run("when a matching baggage value is present", func(t *testing.T) {
		t.Run("it returns the value", func(t *testing.T) {
			env := newEmptyEnvelope()
			SetBaggage(env.GetBody(), wrapperspb.String("hello"))

			Expect(
				t,
				"unexpected baggage value value",
				MustGetBaggage[*wrapperspb.StringValue](env),
				wrapperspb.String("hello"),
			)
		})
	})

	t.Run("when no baggage values are present", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			ExpectPanic(
				t,
				"baggage value is not present",
				func() {
					MustGetBaggage[*wrapperspb.StringValue](newEmptyEnvelope())
				},
			)
		})
	})

	t.Run("when only baggage values of other types are present", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			env := newEmptyEnvelope()
			SetBaggage(env.GetBody(), wrapperspb.Int64(42))

			ExpectPanic(
				t,
				"baggage value is not present",
				func() {
					MustGetBaggage[*wrapperspb.StringValue](env)
				},
			)
		})
	})

	t.Run("when the baggage value cannot be unmarshalled", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			env := newEmptyEnvelope()
			env.GetBody().SetBaggage([]*anypb.Any{
				{
					TypeUrl: "type.googleapis.com/google.protobuf.StringValue",
					Value:   []byte{0x0a, 0x05}, // truncated string field
				},
			})

			defer func() {
				if recover() == nil {
					t.Fatal("expected a panic")
				}
			}()

			MustGetBaggage[*wrapperspb.StringValue](env)
		})
	})
}
