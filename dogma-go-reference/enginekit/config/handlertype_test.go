package config

import (
	"errors"
	"testing"

	"github.com/dogmatiq/enginekit/internal/test"
)

func TestHandlerType(t *testing.T) {
	test.Enum(
		t,
		test.EnumSpec[HandlerType]{
			Range:       HandlerTypes,
			Switch:      SwitchByHandlerType,
			MapToString: MapByHandlerType[string],
		},
	)
}

func TestSwitchByHandlerTypeOf(t *testing.T) {
	cases := []struct {
		Handler Handler
		Want    string
	}{
		{&Aggregate{}, "aggregate"},
		{&Process{}, "process"},
		{&Integration{}, "integration"},
		{&Projection{}, "projection"},
	}

	for _, c := range cases {
		var got string

		SwitchByHandlerTypeOf(
			c.Handler,
			func(*Aggregate) { got = "aggregate" },
			func(*Process) { got = "process" },
			func(*Integration) { got = "integration" },
			func(*Projection) { got = "projection" },
		)

		if got != c.Want {
			t.Errorf("unexpected value: got %q, want %q", got, c.Want)
		}
	}

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		cases := []struct {
			Handler Handler
			Want    string
		}{
			{&Aggregate{}, `no case function was provided for *config.Aggregate`},
			{&Process{}, `no case function was provided for *config.Process`},
			{&Integration{}, `no case function was provided for *config.Integration`},
			{&Projection{}, `no case function was provided for *config.Projection`},
		}

		for _, c := range cases {
			test.ExpectPanic(
				t,
				c.Want,
				func() {
					SwitchByHandlerTypeOf(c.Handler, nil, nil, nil, nil)
				},
			)
		}
	})

	t.Run("it panics when the handler type is invalid", func(t *testing.T) {
		test.ExpectPanic(
			t,
			"invalid handler type",
			func() {
				SwitchByHandlerTypeOf(
					nil,
					func(*Aggregate) {},
					func(*Process) {},
					func(*Integration) {},
					func(*Projection) {},
				)
			},
		)
	})
}

func TestMapByHandlerTypeOf(t *testing.T) {
	cases := []struct {
		Handler Handler
		Want    string
	}{
		{&Aggregate{}, "aggregate"},
		{&Process{}, "process"},
		{&Integration{}, "integration"},
		{&Projection{}, "projection"},
	}

	for _, c := range cases {
		got := MapByHandlerTypeOf(
			c.Handler,
			func(*Aggregate) string { return "aggregate" },
			func(*Process) string { return "process" },
			func(*Integration) string { return "integration" },
			func(*Projection) string { return "projection" },
		)

		if got != c.Want {
			t.Errorf("unexpected value: got %q, want %q", got, c.Want)
		}
	}

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		cases := []struct {
			Handler Handler
			Want    string
		}{
			{&Aggregate{}, `no case function was provided for *config.Aggregate`},
			{&Process{}, `no case function was provided for *config.Process`},
			{&Integration{}, `no case function was provided for *config.Integration`},
			{&Projection{}, `no case function was provided for *config.Projection`},
		}

		for _, c := range cases {
			test.ExpectPanic(
				t,
				c.Want,
				func() {
					MapByHandlerTypeOf[int](c.Handler, nil, nil, nil, nil)
				},
			)
		}
	})
}

func TestMapByHandlerTypeOfWithErr(t *testing.T) {
	cases := []struct {
		Handler Handler
		Want    string
	}{
		{&Aggregate{}, "aggregate"},
		{&Process{}, "process"},
		{&Integration{}, "integration"},
		{&Projection{}, "projection"},
	}

	for _, c := range cases {
		got, gotErr := MapByHandlerTypeOfWithErr(
			c.Handler,
			func(*Aggregate) (string, error) { return "aggregate", errors.New("aggregate") },
			func(*Process) (string, error) { return "process", errors.New("process") },
			func(*Integration) (string, error) { return "integration", errors.New("integration") },
			func(*Projection) (string, error) { return "projection", errors.New("projection") },
		)

		if got != c.Want {
			t.Errorf("unexpected value: got %q, want %q", got, c.Want)
		}

		if gotErr == nil {
			t.Fatal("expected an error")
		}

		if gotErr.Error() != c.Want {
			t.Errorf("unexpected error: got %q, want %q", gotErr, c.Want)
		}
	}

	t.Run("it panics when the associated function is nil", func(t *testing.T) {
		cases := []struct {
			Handler Handler
			Want    string
		}{
			{&Aggregate{}, `no case function was provided for *config.Aggregate`},
			{&Process{}, `no case function was provided for *config.Process`},
			{&Integration{}, `no case function was provided for *config.Integration`},
			{&Projection{}, `no case function was provided for *config.Projection`},
		}

		for _, c := range cases {
			test.ExpectPanic(
				t,
				c.Want,
				func() {
					MapByHandlerTypeOfWithErr[int](c.Handler, nil, nil, nil, nil)
				},
			)
		}
	})
}
