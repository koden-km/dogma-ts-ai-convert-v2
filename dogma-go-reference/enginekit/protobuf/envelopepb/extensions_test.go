package envelopepb_test

import (
	"testing"

	. "github.com/dogmatiq/enginekit/internal/test"
	. "github.com/dogmatiq/enginekit/protobuf/envelopepb"
	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
	"google.golang.org/protobuf/types/known/anypb"
	"google.golang.org/protobuf/types/known/wrapperspb"
)

func TestSetExtension(t *testing.T) {
	t.Run("it adds the value to the body's extensions", func(t *testing.T) {
		want, err := anypb.New(wrapperspb.String("hello"))
		if err != nil {
			t.Fatal(err)
		}

		body := NewBodyBuilder().Build()
		SetExtension(body, wrapperspb.String("hello"))

		Expect(
			t,
			"unexpected extensions",
			body.GetExtensions(),
			[]*anypb.Any{want},
		)
	})

	t.Run("when an extension with the same type URL is already present", func(t *testing.T) {
		t.Run("it replaces the existing value", func(t *testing.T) {
			want, err := anypb.New(wrapperspb.String("second"))
			if err != nil {
				t.Fatal(err)
			}

			body := NewBodyBuilder().Build()
			SetExtension(body, wrapperspb.String("first"))
			SetExtension(body, wrapperspb.String("second"))

			Expect(
				t,
				"unexpected extensions",
				body.GetExtensions(),
				[]*anypb.Any{want},
			)
		})
	})

	t.Run("when extensions of other types are present", func(t *testing.T) {
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
			SetExtension(body, wrapperspb.Int64(42))
			SetExtension(body, wrapperspb.String("hello"))

			Expect(
				t,
				"unexpected extensions",
				body.GetExtensions(),
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
					SetExtension[*wrapperspb.StringValue](NewBodyBuilder().Build(), nil)
				},
			)
		})
	})
}

func TestGetExtension(t *testing.T) {
	t.Run("when a matching extension is present", func(t *testing.T) {
		t.Run("it returns the value and true", func(t *testing.T) {
			body := NewBodyBuilder().Build()
			SetExtension(body, wrapperspb.String("hello"))

			got, ok, err := GetExtension[*wrapperspb.StringValue](body)
			if err != nil {
				t.Fatal(err)
			}
			if !ok {
				t.Fatal("expected to find a matching extension")
			}

			Expect(
				t,
				"unexpected extension value",
				got,
				wrapperspb.String("hello"),
			)
		})
	})

	t.Run("when no extensions are present", func(t *testing.T) {
		t.Run("it returns false", func(t *testing.T) {
			body := NewBodyBuilder().Build()

			got, ok, err := GetExtension[*wrapperspb.StringValue](body)
			if err != nil {
				t.Fatal(err)
			}
			if ok {
				t.Fatal("expected to find no matching extension")
			}
			if got != nil {
				t.Fatalf("expected nil, got %v", got)
			}
		})
	})

	t.Run("when only extensions of other types are present", func(t *testing.T) {
		t.Run("it returns false", func(t *testing.T) {
			body := NewBodyBuilder().Build()
			SetExtension(body, wrapperspb.Int64(42))

			got, ok, err := GetExtension[*wrapperspb.StringValue](body)
			if err != nil {
				t.Fatal(err)
			}
			if ok {
				t.Fatal("expected to find no matching extension")
			}
			if got != nil {
				t.Fatalf("expected nil, got %v", got)
			}
		})
	})

	t.Run("when a value of the requested type has been set as baggage", func(t *testing.T) {
		t.Run("it returns false (baggage and extensions are distinct)", func(t *testing.T) {
			body := NewBodyBuilder().Build()
			SetBaggage(body, wrapperspb.String("hello"))

			_, ok, err := GetExtension[*wrapperspb.StringValue](body)
			if err != nil {
				t.Fatal(err)
			}
			if ok {
				t.Fatal("expected to find no matching extension")
			}
		})
	})
}

func TestMustGetExtension(t *testing.T) {
	t.Run("when a matching extension is present", func(t *testing.T) {
		t.Run("it returns the value", func(t *testing.T) {
			body := NewBodyBuilder().Build()
			SetExtension(body, wrapperspb.String("hello"))

			Expect(
				t,
				"unexpected extension value",
				MustGetExtension[*wrapperspb.StringValue](body),
				wrapperspb.String("hello"),
			)
		})
	})

	t.Run("when no extensions are present", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			ExpectPanic(
				t,
				"extension is not present",
				func() {
					MustGetExtension[*wrapperspb.StringValue](NewBodyBuilder().Build())
				},
			)
		})
	})

	t.Run("when only extensions of other types are present", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			body := NewBodyBuilder().Build()
			SetExtension(body, wrapperspb.Int64(42))

			ExpectPanic(
				t,
				"extension is not present",
				func() {
					MustGetExtension[*wrapperspb.StringValue](body)
				},
			)
		})
	})

	t.Run("when the extension cannot be unmarshalled", func(t *testing.T) {
		t.Run("it panics", func(t *testing.T) {
			body := NewBodyBuilder().Build()
			body.SetExtensions([]*anypb.Any{
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

			MustGetExtension[*wrapperspb.StringValue](body)
		})
	})
}

func TestEventStreamPosition(t *testing.T) {
	t.Run("when wrapped in anypb.Any", func(t *testing.T) {
		t.Run("it has a stable, fully-qualified type URL", func(t *testing.T) {
			a, err := anypb.New(&EventStreamPosition{})
			if err != nil {
				t.Fatal(err)
			}

			const want = "type.googleapis.com/dogma.protobuf.EventStreamPosition"
			if a.GetTypeUrl() != want {
				t.Fatalf("unexpected type URL:\n got: %s\nwant: %s", a.GetTypeUrl(), want)
			}
		})
	})

	t.Run("when attached as an extension via SetExtension", func(t *testing.T) {
		t.Run("it round-trips via GetExtension", func(t *testing.T) {
			want := NewEventStreamPositionBuilder().
				WithStreamId(uuidpb.Generate()).
				WithOffset(42).
				Build()

			body := NewBodyBuilder().Build()
			SetExtension(body, want)

			got, ok, err := GetExtension[*EventStreamPosition](body)
			if err != nil {
				t.Fatal(err)
			}
			if !ok {
				t.Fatal("expected to find an EventStreamPosition")
			}

			Expect(
				t,
				"unexpected position",
				got,
				want,
			)
		})
	})
}
