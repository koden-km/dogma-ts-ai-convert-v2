package telemetry

import (
	"context"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/trace"
)

// Info logs an informational message to the log and as a span event.
func (r *Recorder) Info(
	ctx context.Context,
	event, message string,
	attrs ...Attr,
) {
	r.log(ctx, log.SeverityInfo, event, message, nil, attrs)
}

// Error logs an error message to the log and as a span event.
//
// It marks the span as an error and emits increments the "errors" metric.
func (r *Recorder) Error(
	ctx context.Context,
	event, message string,
	err error,
	attrs ...Attr,
) {
	r.log(ctx, log.SeverityError, event, message, err, attrs)
	r.errorCount(ctx, 1)

	span := trace.SpanFromContext(ctx)
	span.SetStatus(codes.Error, err.Error())
	span.RecordError(err)
}

func (r *Recorder) log(
	ctx context.Context,
	severity log.Severity,
	event, message string,
	err error,
	attrs []Attr,
) {
	if !r.logger.Enabled(
		ctx,
		log.EnabledParameters{
			Severity: severity,
		},
	) {
		return
	}

	var rec log.Record
	rec.SetEventName(event)
	rec.SetSeverity(severity)
	rec.SetSeverityText(severity.String())
	rec.SetBody(attribute.StringValue(message))

	if err != nil {
		rec.AddAttributes(attribute.String("error", err.Error()))
	}

	rec.AddAttributes(r.logKVs...)

	span, ok := ctx.Value(contextKey{}).(*Span)
	if ok {
		span.underlying.AddEvent(
			event,
			trace.WithAttributes(attribute.String("message", message)),
			trace.WithAttributes(asAttrKeyValues(attrs)...),
		)

		rec.AddAttributes(asLogKeyValues(span.attrs)...)
	}

	rec.AddAttributes(asLogKeyValues(attrs)...)

	r.logger.Emit(ctx, rec)
}
