package runtimeconfig

import (
	"github.com/dogmatiq/dogma"
	"github.com/dogmatiq/enginekit/config"
	"github.com/dogmatiq/enginekit/config/internal/configbuilder"
)

// FromProcess returns a new [config.Process] that represents the configuration
// of the given [dogma.ProcessMessageHandler].
func FromProcess[R dogma.ProcessRoot](h dogma.ProcessMessageHandler[R]) *config.Process {
	return configbuilder.Process(
		func(b *configbuilder.ProcessBuilder) {
			buildProcess(b, h)
		},
	)
}

func buildProcess[R dogma.ProcessRoot](b *configbuilder.ProcessBuilder, h dogma.ProcessMessageHandler[R]) {
	if h == nil {
		b.Partial()
	} else {
		x := dogma.UntypedProcessMessageHandler(h)
		c := newHandlerConfigurer[dogma.ProcessRoute](b)
		b.Source(x)
		x.Configure(c)
	}
}
