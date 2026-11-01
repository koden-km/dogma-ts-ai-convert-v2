package runtimeconfig

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
)

type handlerConfigurer[
	R dogma.MessageRoute,
	T config.Handler,
	H any,
] struct {
	b configbuilder.HandlerBuilder[T, H]
}

func newHandlerConfigurer[
	R dogma.MessageRoute,
	T config.Handler,
	H any,
](b configbuilder.HandlerBuilder[T, H]) *handlerConfigurer[R, T, H] {
	return &handlerConfigurer[R, T, H]{b}
}

func (c *handlerConfigurer[R, T, H]) Identity(name, key string) {
	c.b.Identity(func(b *configbuilder.IdentityBuilder) {
		b.Name(name)
		b.Key(key)
	})
}

func (c *handlerConfigurer[R, T, H]) Routes(routes ...R) {
	for _, r := range routes {
		c.b.Route(func(b *configbuilder.RouteBuilder) {
			b.AsPerRoute(r)
		})
	}
}

func (c *handlerConfigurer[R, T, H]) Disable(...dogma.DisableOption) {
	c.b.Disabled(func(b *configbuilder.FlagBuilder[config.Disabled]) {
		b.Value(true)
	})
}

type handlerConfigurerWithConcurrencyPreference[
	R dogma.MessageRoute,
	T config.Handler,
	H any,
] struct {
	*handlerConfigurer[R, T, H]
	b configbuilder.HandlerBuilderWithConcurrencyPreference[T, H]
}

func newHandlerConfigurerWithConcurrencyPreference[
	R dogma.MessageRoute,
	T config.Handler,
	H any,
](b configbuilder.HandlerBuilderWithConcurrencyPreference[T, H]) *handlerConfigurerWithConcurrencyPreference[R, T, H] {
	return &handlerConfigurerWithConcurrencyPreference[R, T, H]{
		newHandlerConfigurer[R](b),
		b,
	}
}

func (c *handlerConfigurerWithConcurrencyPreference[R, T, H]) ConcurrencyPreference(p dogma.ConcurrencyPreference) {
	c.b.ConcurrencyPreference(
		func(b *configbuilder.ConcurrencyPreferenceBuilder) {
			b.Value(p)
		},
	)
}
