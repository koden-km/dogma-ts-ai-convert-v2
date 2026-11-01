package message_test

import (
	"reflect"
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/enginetest/stubs"
	. "github.com/dogmatiq/enginekit/message"
)

func TestTypeFor(t *testing.T) {
	t.Run("it returns values that compare as equal for messages of the same type", func(t *testing.T) {
		a := TypeFor[*CommandStub[TypeA]]()
		b := TypeFor[*CommandStub[TypeA]]()

		if a != b {
			t.Fatal("expected the same return value for the same inputs")
		}
	})

	t.Run("it returns values that do not compare as equal for messages of different types", func(t *testing.T) {
		a := TypeFor[*CommandStub[TypeA]]()
		b := TypeFor[*CommandStub[TypeB]]()

		if a == b {
			t.Fatal("did not expect the same return value for different inputs")
		}
	})

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer expectPanic(t, "*message_test.partialMessage does not implement dogma.Command, dogma.Event or dogma.Deadline")
		TypeFor[*partialMessage]()
	})
}

func TestTypeOf(t *testing.T) {
	t.Run("it returns the same Type as TypeFor()", func(t *testing.T) {
		want := TypeFor[*CommandStub[TypeA]]()
		got := TypeOf(CommandA1)

		if got != want {
			t.Fatalf("unexpected type: got %v, want %v", got, want)
		}
	})

	t.Run("it panics if the message does not implement any of the more specific interfaces", func(t *testing.T) {
		defer expectPanic(t, "*message_test.partialMessage does not implement dogma.Command, dogma.Event or dogma.Deadline")
		TypeOf(&partialMessage{})
	})
}

func TestTypeFromReflect(t *testing.T) {
	t.Run("it returns the same Type as TypeFor()", func(t *testing.T) {
		want := TypeFor[*CommandStub[TypeA]]()
		got := TypeFromReflect(reflect.TypeFor[*CommandStub[TypeA]]())

		if got != want {
			t.Fatalf("unexpected type: got %v, want %v", got, want)
		}
	})

	t.Run("it panics if the type is nil", func(t *testing.T) {
		defer expectPanic(t, "message type must not be nil")
		TypeFromReflect(nil)
	})

	t.Run("it panics if the type is not a message", func(t *testing.T) {
		defer expectPanic(t, "int does not implement dogma.Command, dogma.Event or dogma.Deadline")
		TypeFromReflect(reflect.TypeFor[int]())
	})

	t.Run("it panics if the type does not implement any of the more specific interfaces", func(t *testing.T) {
		defer expectPanic(t, "*message_test.partialMessage does not implement dogma.Command, dogma.Event or dogma.Deadline")
		TypeFromReflect(reflect.TypeFor[*partialMessage]())
	})
}

func TestType_name(t *testing.T) {
	mt := TypeFor[*CommandStub[TypeA]]()

	got := mt.Name()
	want := NameFor[*CommandStub[TypeA]]()

	if got != want {
		t.Fatalf("unexpected name: got %q, want %q", got, want)
	}
}

func TestType_kind(t *testing.T) {
	mt := TypeFor[*CommandStub[TypeA]]()

	got := mt.Kind()
	want := CommandKind

	if got != want {
		t.Fatalf("unexpected kind: got %q, want %q", got, want)
	}
}

func TestType_reflectType(t *testing.T) {
	mt := TypeFor[*CommandStub[TypeA]]()

	got := mt.ReflectType()
	want := reflect.TypeFor[*CommandStub[TypeA]]()

	if got != want {
		t.Fatalf("unexpected reflect type: got %v, want %v", got, want)
	}
}

func TestType_string(t *testing.T) {
	cases := []struct {
		Message dogma.Message
		Want    string
	}{
		{CommandA1, "*stubs.CommandStub[TypeA]"},
		{&ptrCommand{}, "*message_test.ptrCommand"},
	}

	for _, c := range cases {
		got := TypeOf(c.Message).String()

		if got != c.Want {
			t.Fatalf("unexpected string representation: got %q, want %q", got, c.Want)
		}
	}
}

func expectPanic(t *testing.T, want string) {
	t.Helper()

	got := recover()

	if got != want {
		if got == nil {
			t.Fatal("expected panic")
		}

		panic(got)
	}
}
