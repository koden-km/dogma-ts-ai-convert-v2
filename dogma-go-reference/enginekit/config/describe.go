package config

import (
	"errors"
	"io"
	"strings"

	"github.com/dogmatiq/enginekit/config/internal/renderer"
	"github.com/dogmatiq/enginekit/optional"
)

// Describe writes a detailed human-readable description of a [Component] to w.
func Describe(
	w io.Writer,
	c Component,
	options ...DescribeOption,
) (int, error) {
	r := &renderer.Renderer{
		Target: w,
	}

	ctx := &describeContext{
		Component: c,
		renderer:  r,
	}

	for _, opt := range options {
		opt(&ctx.options)
	}

	if err, ok := ctx.options.ValidationResult.TryGet(); ok {
		ctx.errors = ErrorsByComponent(ctx.Component, err)
	}

	c.describe(ctx)

	return r.Done()
}

// Description returns a detailed human-readable description of a [Component].
func Description(c Component, options ...DescribeOption) string {
	var w strings.Builder

	if _, err := Describe(&w, c, options...); err != nil {
		panic(err)
	}

	return w.String()
}

// DescribeOption changes the behavior of [Describe].
type DescribeOption func(*describeOptions)

type describeOptions struct {
	ValidationResult optional.Optional[error]
}

// WithValidationResult is a [DescribeOption] that sets the validation result to
// be included in the description.
func WithValidationResult(err error) DescribeOption {
	return func(opts *describeOptions) {
		opts.ValidationResult = optional.Some(err)
	}
}

type describeContext struct {
	Component Component

	errors   []error
	renderer *renderer.Renderer
	options  describeOptions
}

func hasError[T error](ctx *describeContext) bool {
	for _, err := range ctx.errors {
		var e T
		if errors.As(err, &e) {
			return true
		}
	}

	return false
}

func (ctx *describeContext) DescribeFidelity() {
	p := ctx.Component.ComponentProperties()

	if p.IsPartial || hasError[PartialConfigurationError](ctx) || hasError[ConfigurationUnavailableError](ctx) {
		ctx.Print("incomplete ")
	} else if !ctx.options.ValidationResult.IsPresent() {
		ctx.Print("unvalidated ")
	} else if len(ctx.errors) == 0 {
		ctx.Print("valid ")
	} else {
		ctx.Print("invalid ")
	}

	if p.IsSpeculative {
		ctx.Print("speculative ")
	}
}

func (ctx *describeContext) DescribeChild(c Component) {
	child := &describeContext{
		Component: c,
		renderer:  ctx.renderer,
		options:   ctx.options,
	}

	if err, ok := child.options.ValidationResult.TryGet(); ok {
		child.errors = ErrorsByComponent(child.Component, err)
	}

	child.renderer.StartChild()
	c.describe(child)
	child.renderer.EndChild()
}

func (ctx *describeContext) Print(str ...string) {
	ctx.renderer.Print(str...)
}

func (ctx *describeContext) Printf(format string, args ...any) {
	ctx.renderer.Printf(format, args...)
}

func (ctx *describeContext) DescribeErrors() {
	for _, err := range ctx.errors {
		ctx.renderer.StartChild()
		ctx.renderer.Print(err.Error(), "\n")
		ctx.renderer.EndChild()
	}
}
