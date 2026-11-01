package telemetry

import (
	"context"
	"log/slog"
	"strconv"

	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/embedded"
)

// NewSLogProvider returns a [log.LoggerProvider] thats writes logs to the
// provided [slog.Logger].
func NewSLogProvider(target *slog.Logger) log.LoggerProvider {
	return &slogProvider{
		Target: target,
	}
}

// slogProvider adapts an [slog.Logger] to the OpenTelemetry
// [log.LoggerProvider] interface.
type slogProvider struct {
	embedded.LoggerProvider

	// Target is the underlying [slog.Logger] that logs are written to.
	Target *slog.Logger
}

// Logger returns a new [Logger] with the provided name and configuration.
func (p *slogProvider) Logger(name string, _ ...log.LoggerOption) log.Logger {
	return &standardLogger{Target: p.Target.WithGroup(name)}
}

type standardLogger struct {
	embedded.Logger
	Target *slog.Logger
}

func (l *standardLogger) Emit(ctx context.Context, rec log.Record) {
	var (
		attrs   []slog.Attr
		message = "?"
	)

	switch rec.Body().Type() {
	case attribute.EMPTY:
		// ignore
	case attribute.STRING:
		message = rec.Body().AsString()
	default:
		attrs = append(
			attrs,
			slogAttrFromLogValue("body", rec.Body()),
		)
	}

	if ev := rec.EventName(); ev != "" {
		attrs = append(attrs, slog.String("event", ev))
	}

	rec.WalkAttributes(
		func(kv attribute.KeyValue) bool {
			attrs = append(
				attrs,
				slogAttrFromLogValue(kv.Key, kv.Value),
			)
			return true
		},
	)

	if !rec.Timestamp().IsZero() {
		attrs = append(attrs, slog.Time("timestamp", rec.Timestamp()))
	}

	if !rec.ObservedTimestamp().IsZero() {
		attrs = append(attrs, slog.Time("observed_timestamp", rec.ObservedTimestamp()))
	}

	l.Target.LogAttrs(
		ctx,
		slogLevelFromLogSeverity(rec.Severity()),
		message,
		attrs...,
	)
}

func (l *standardLogger) Enabled(ctx context.Context, p log.EnabledParameters) bool {
	return l.Target.Enabled(ctx, slogLevelFromLogSeverity(p.Severity))
}

// slogLevelFromLogSeverity maps an OpenTelemetry [log.Severity] to a
// [slog.Level].
func slogLevelFromLogSeverity(sev log.Severity) slog.Level {
	level := slog.LevelDebug

	switch {
	case sev >= log.SeverityError:
		level = slog.LevelError
	case sev >= log.SeverityWarn:
		level = slog.LevelWarn
	case sev >= log.SeverityInfo:
		level = slog.LevelInfo
	}

	return level
}

// slogAttrFromLogValue converts an OpenTelemetry [log.Value] to an
// [slog.Attr].
func slogAttrFromLogValue(k attribute.Key, v attribute.Value) slog.Attr {
	key := string(k)

	switch v.Type() {
	case attribute.EMPTY:
		return slog.Any(key, nil)

	case attribute.BOOL:
		return slog.Bool(key, v.AsBool())

	case attribute.FLOAT64:
		return slog.Float64(key, v.AsFloat64())

	case attribute.INT64:
		return slog.Int64(key, v.AsInt64())

	case attribute.STRING:
		return slog.String(key, v.AsString())

	case attribute.BYTESLICE:
		return slog.Any(key, v.AsByteSlice())

	case attribute.SLICE,
		attribute.INT64SLICE,
		attribute.FLOAT64SLICE,
		attribute.STRINGSLICE:
		var attrs []slog.Attr
		for i, elem := range v.AsSlice() {
			attrs = append(
				attrs,
				slogAttrFromLogValue(
					attribute.Key(strconv.Itoa(i)),
					elem,
				),
			)
		}
		return slog.GroupAttrs(key, attrs...)

	case attribute.MAP:
		var attrs []slog.Attr
		for _, pair := range v.AsMap() {
			attrs = append(
				attrs,
				slogAttrFromLogValue(
					pair.Key,
					pair.Value,
				),
			)
		}
		return slog.GroupAttrs(key, attrs...)

	default:
		return slog.String(key, v.String())
	}
}
