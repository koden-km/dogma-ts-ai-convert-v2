package config_test

import (
	"testing"

	"github.com/dogmatiq/dogma"
	. "github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
	"github.com/dogmatiq/enginekit/config/internal/constraints"
	"github.com/dogmatiq/enginekit/internal/test"
)

func testHandler[
	T interface {
		Handler
		Interface() H
	},
	B configbuilder.HandlerBuilder[T, H],
	H constraints.Handler[C, R],
	C constraints.HandlerConfigurer[R],
	R dogma.MessageRoute,
](
	t *testing.T,
	build func(func(B)) T,
	runtime func(H) T,
	construct func(func(C)) H,
) {
	testEntity(
		t,
		build,
		runtime,
		construct,
	)

	t.Run("func IsDisabled()", func(t *testing.T) {
		t.Run("it returns false if the handler is not disabled", func(t *testing.T) {
			handler := build(func(b B) {})

			test.Expect(
				t,
				"unexpected flag value",
				handler.IsDisabled(),
				false,
			)
		})

		t.Run("it returns true if the handler is disabled", func(t *testing.T) {
			handler := build(func(b B) {
				b.Disabled(
					func(b *configbuilder.FlagBuilder[Disabled]) {
						b.Value(true)
					},
				)
			})

			test.Expect(
				t,
				"unexpected flag value",
				handler.IsDisabled(),
				true,
			)
		})

		t.Run("panics if the flag is partially configured", func(t *testing.T) {
			handler := build(func(b B) {
				b.Disabled(
					func(b *configbuilder.FlagBuilder[Disabled]) {
						b.Partial()
					},
				)
			})

			test.ExpectPanic(
				t,
				`flag:disabled is invalid: could not evaluate entire configuration`,
				func() {
					handler.IsDisabled()
				},
			)
		})

		t.Run("panics if the flag value is missing", func(t *testing.T) {
			handler := build(func(b B) {
				b.Disabled(
					func(b *configbuilder.FlagBuilder[Disabled]) {},
				)
			})

			test.ExpectPanic(
				t,
				`flag:disabled is invalid: value is unavailable`,
				func() {
					handler.IsDisabled()
				},
			)
		})
	})
}

func testHandlerWithConcurrencyPreference[
	T interface {
		Handler
		ConcurrencyPreference() dogma.ConcurrencyPreference
		Interface() H
	},
	B configbuilder.HandlerBuilderWithConcurrencyPreference[T, H],
	H constraints.Handler[C, R],
	C constraints.HandlerConfigurer[R],
	R dogma.MessageRoute,
](
	t *testing.T,
	build func(func(B)) T,
	runtime func(H) T,
	construct func(func(C)) H,
) {
	testHandler(
		t,
		build,
		runtime,
		construct,
	)

	t.Run("func ConcurrencyPreference()", func(t *testing.T) {
		t.Run("it returns dogma.MaximizeConcurrency if no preference is set", func(t *testing.T) {
			handler := build(func(b B) {})

			test.Expect(
				t,
				"unexpected concurrency preference",
				handler.ConcurrencyPreference(),
				dogma.MaximizeConcurrency,
			)
		})

		t.Run("it returns the last configured concurrency preference", func(t *testing.T) {
			handler := build(func(b B) {
				b.ConcurrencyPreference(
					func(b *configbuilder.ConcurrencyPreferenceBuilder) {
						b.Value(dogma.MinimizeConcurrency)
					},
				)
				b.ConcurrencyPreference(
					func(b *configbuilder.ConcurrencyPreferenceBuilder) {
						b.Value(dogma.MaximizeConcurrency)
					},
				)
			})

			test.Expect(
				t,
				"unexpected concurrency preference",
				handler.ConcurrencyPreference(),
				dogma.MaximizeConcurrency,
			)
		})

		t.Run("panics if the value is partially configured", func(t *testing.T) {
			handler := build(func(b B) {
				b.ConcurrencyPreference(
					func(b *configbuilder.ConcurrencyPreferenceBuilder) {
						b.Partial()
					},
				)
			})

			test.ExpectPanic(
				t,
				`concurrency preference is invalid: could not evaluate entire configuration`,
				func() {
					handler.ConcurrencyPreference()
				},
			)
		})

		t.Run("panics if the value is missing", func(t *testing.T) {
			handler := build(func(b B) {
				b.ConcurrencyPreference(
					func(b *configbuilder.ConcurrencyPreferenceBuilder) {},
				)
			})

			test.ExpectPanic(
				t,
				`concurrency preference is invalid: value is unavailable`,
				func() {
					handler.ConcurrencyPreference()
				},
			)
		})
	})
}
