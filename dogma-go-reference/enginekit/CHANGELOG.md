# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog], and this project adheres to
[Semantic Versioning].

<!-- references -->

[keep a changelog]: https://keepachangelog.com/en/1.0.0/
[semantic versioning]: https://semver.org/spec/v2.0.0.html
[bc]: https://github.com/dogmatiq/.github/blob/main/VERSIONING.md#changelogs

## [0.27.7] - 2026-10-25

### Added

- Added `envelopepb.MustGetExtension()` and `envelopepb.MustGetBaggage()`.

## [0.27.6] - 2026-10-25

### Added

- Added `xsync.Signal`.

## [0.27.5] - 2026-10-08

### Added

- Added `uuidpb.Map.IsEmpty()`.

## [0.27.4] - 2026-10-08

### Added

- Added `uuidpb.Set.IsEmpty()`.

### Fixed

- Fixed issue with `uuidpb.Set.IsEqual()` that treated `nil` and a non-`nil`
  empty set as inequal.

## [0.27.3] - 2026-10-07

### Added

- Added `uuidpb.Set.String()` and `DapperString()`.

## [0.27.2] - 2026-10-07

### Added

- Added `uuidpb.Set.GoString()`.

## [0.27.1] - 2026-10-07

### Added

- Added `uuidpb.NewSet()`.
- Added `uuidpb.Set.Diff()` and `BidirectionalDiff()`.

### Deprecated

- Deprecated the `collections/constraints`, `collections/maps`, and `collections/sets` packages.

## [0.27.0] - 2026-09-28

### Added

- Added `messaginggrpc.CommandExecutorAPI`, a gRPC service for executing
  commands within a hosted Dogma application, with support for observing the
  events recorded as a result.
- Added `messaginggrpc.EventStreamConsumerAPI`, ported from
  `eventstreamgrpc.ConsumeAPI` (see below).
- Added `envelopepb.Envelope.AsMultiEnvelope()`.
- Added `envelopepb.MultiEnvelope.AppendBodies()` and `TryAppendEnvelope()`.
- Added severity text to OpenTelemetry log messages.

### Removed

- **[BC]** Removed the `eventstreamgrpc` package. It was unused, and has been
  replaced by `messaginggrpc.EventStreamConsumerAPI`.

## [0.26.5] - 2026-06-10

### Changed

- `envelopepb.EffectPacker.PackCommand()`, `PackEvent()`, and
  `PackDeadline()` now return the packed envelope.

## [0.26.4] - 2026-05-16

### Added

- Added generic `envelopepb.SetExtension[T]()`, `GetExtension[T]()`,
  `SetBaggage[T]()` and `GetBaggage[T]()` helpers for attaching and reading
  extensions/baggage on an `envelopepb.Body` after packing.
- Added `envelopepb.EventStreamPosition`, an extension message that identifies
  the stream from which an event was obtained, and the event's offset within
  that stream.

## [0.26.3] - 2026-05-09

### Changed

- `envelopepb.Unpack()` is now generic: `Unpack[T dogma.Message](env) (T, error)`.
  `T` may be a message interface such as `dogma.Command` or a concrete message
  type.

## [0.26.2] - 2026-05-08

### Added

- Added `envelopepb.MultiEnvelope.All()`.

## [0.26.1] - 2026-05-07

### Fixed

- Fixed `AggregateRootStub.MarshalBinary()` / `UnmarshalBinary()` round-trip.
  The stub now uses the Dogma message registry to serialize event type IDs
  alongside binary data, allowing concrete types to be reconstructed on
  unmarshal.

### Added

- Added `MarshalBinaryFunc` and `UnmarshalBinaryFunc` fields to
  `AggregateRootStub` and `ProcessRootStub`, allowing tests to override the
  default marshal/unmarshal behavior.

## [0.26.0] - 2026-05-05

### Changed

- **[BC]** Renamed "timeout" to "deadline" throughout, per Dogma v0.24.0.

### Removed

- **[BC]** Removed `enginetest.Run()` blackbox engine tests.

## [0.25.0] - 2026-05-01

### Added

- Added `MarshalText()` and `UnmarshalText()` methods to `uuidpb.UUID` and
  `identitypb.Identity`, implementing the `encoding.TextMarshaler` and
  `encoding.TextUnmarshaler` interfaces.
- Added `Latch.WaitContext()`.
- Added `Future.Wait()`.

### Changed

- Changed `identitypb.Identity.Format()` to use `<uuid> <name>` representation
  for the `%s` verb, with `?` as a placeholder when the name is empty.
- **[BC]** Renamed `Future.Wait()` to `Future.WaitContext()`.

## [0.24.1] - 2026-04-28

### Added

- Added `UntypedAggregateMessageHandler` and `UntypedProcessMessageHandler`
  interfaces to the `config` package.
- Added `Implementation()` method to `Aggregate`, `Process`, `Integration`, and
  `Projection` types in the `config` package.

## [0.24.0] - 2026-04-25

### Changed

- **[BC]** `runtimeconfig.FromAggregate()` and `runtimeconfig.FromProcess()` are
  now generic, accepting `dogma.AggregateMessageHandler[R]` and
  `dogma.ProcessMessageHandler[R]` respectively.
- **[BC]** `AggregateMessageHandlerStub` and `ProcessMessageHandlerStub` are now
  generic, parameterized by their root type.

## [0.23.2] - 2026-04-24

- Added `ended` parameter to `ProcessRootStub.ProcessInstanceDescription()`.

## [0.23.1] - 2026-04-24

### Fixed

- Fixed reference to untagged `dogmatiq/primo` dependency in `go.mod` file.

## [0.23.0] - 2026-04-24

### Added

- Added `AggregateRootStub.AggregateInstanceDescription()` and
  `ProcessRootStub.ProcessInstanceDescription()`.

### Changed

- **[BC]** Migrated all `.proto` files to [edition 2024](https://protobuf.dev/editions/overview/).
  All generated code now exposes [opaque protobuf API](https://protobuf.dev/reference/go/go-generated-opaque/).

## [0.22.0] - 2026-04-17

### Added

- Added `envelopepb.Header.Baggage`, `Body.Baggage`, `WithExtension()`, and
  `WithBaggage()` for working with `google.protobuf.Any` extension values.
- Added `envelopepb.Packer.PackEffects()` and `envelopepb.EffectPacker` for
  packing messages produced while handling a causal message.

### Changed

- **[BC]** Changed `envelopepb.Header.Extensions` and `Body.Extensions` to use
  repeated `google.protobuf.Any` values instead of the `envelopepb.Extensions`
  wrapper.
- **[BC]** Reworked the packer API around `envelopepb.Packer.PackCommand()`,
  `PackEffects()`, and `EffectPacker`.

### Removed

- **[BC]** Removed `envelopepb.Extensions`, `envelopepb.Packer.Pack()`,
  `CausedBy()`, `MultiPacker`, `PackOption`, `SourcePackOption`,
  `BodyPackOption`, `WithCause()`, `WithHandler()`, and `WithCreatedAt()`.

## [0.21.0] - 2026-04-14

### Added

- Added `envelopepb.Header`, `Body`, `Source`, `Message`, `Extensions`, and
  `MultiEnvelope`.
- Added `envelopepb.Packer.CausedBy()` and `envelopepb.MultiPacker` for
  incrementally building `MultiEnvelope` values.

### Changed

- **[BC]** Changed `envelopepb.Envelope` to use nested `Header` and `Body`
  messages.
- **[BC]** Changed `envelopepb.PackOption` from a function type to an
  interface, and split option roles into `envelopepb.SourcePackOption` and
  `envelopepb.BodyPackOption`.

## [0.20.1] - 2026-04-06

### Added

- Added `xsync.Latch`
- Added `envelopepb.Envelope.IdempotencyKey` field and the
  `envelopepb.WithIdempotencyKey()` packer option.

### Changed

**[BC]** The `eventstreamgrpc` package has been updated to refer to event types
using the type ID registered with Dogma, instead of the deprecated "portable
name".

### Removed

- **[BC]** Removed `eventstreamgrpc.EventType`.

## [0.20.0] - 2026-01-29

### Added

- Added `stubs.UUIDSequence.Count()` method.
- Added `telemetry.Provider.WithAttrs()` method.
- Added `xrapid.Uint64Range()` function.
- Added `xrapid.SamplesFromSeq2()` function.

### Removed

- **[BC]** Removed `telemetry.Provider.Attrs` field.

### Fixed

- `xrapid.Envelope()` now always generates valid message envelopes.
- `xrapid.Identity()` now always generates valid identities.

## [0.19.19] - 2025-12-18

### Added

- Added `stubs.UUIDSequence`.

### Fixed

- Fixed `uuidpb.UUID.Validate()` to accept both Version 4 and Version 5 UUIDs.

## [0.19.18] - 2025-12-17

### Added

- Added `xsync.Future`.
- Added `xsync.SucceedOnce`.
- Added `xatomic.Value`.
- Added `uuidpb.Set` and `Map` types.

## [0.19.17] - 2025-12-08

### Added

- Added support for Dogma v0.19.0 "concurrency preferences" to `config` package.

## [0.19.16] - 2025-12-05

### Added

- Added `telemetry.NewSLogProvider()`, which adapts an `slog.Logger` to the
  OpenTelemetry `log.LoggerProvider` interface.

## [0.19.15] - 2025-12-05

### Added

- Added global attributes to `telemetry.Provider` that are applied to all spans,
  metrics and log records created by the provider.

## [0.19.14] - 2025-12-04

- Remove use of `slog.GroupAttrs()`, which is only available as of Go v1.25 (the
  module targets Go v1.24).

## [0.19.13] - 2025-12-04

### Fixed

- Remove use of `slog.GroupAttrs()`, which is only available as of Go v1.25 (the
  module targets Go v1.24).

## [0.19.12] - 2025-12-04

### Added

- Added `uuidpb.FromBytes()`.
- Added `uuidpb.UUID.AsByteArray()`.

## [0.19.11] - 2025-12-02

### Fixed

- Ensure `telemetry.Recorder` attributes are added to spans and log messages.

## [0.19.10] - 2025-12-02

### Fixed

- Ensure `telemetry.Span` attributes set on span creation are added to log
  records.

## [0.19.9] - 2025-12-02

### Added

- Added `telemetry` package.

## [0.19.8] - 2025-11-30

### Changed

- Improved `uuidpb.UUID.Format()` and `identitypb.Identity.Format()` to handle
  `%#v` verb by rendering Go syntax that can be used to recreate the value using
  functions from their respective packages, instead of the default Protocol
  Buffers struct representation.

## [0.19.7] - 2025-11-23

### Added

- Added functions to the `uuidpb` package for parsing RFC 9562 UUID strings
  directly into their various binary representations:
  - `ParseAsByteArray()` is equivalent to `AsByteArray(Parse(x))` but avoids all allocations.
  - `ParseIntoBytes()` is equivalent to `CopyBytes(Parse(x), dst)`, but avoids all allocations.
  - `ParseAsBytes()` is equivalent to `Parse(x).AsBytes()`, but avoids the intermediate `uuidpb.UUID` allocation.
  - Each function has a `MustXXX()` variant that panics instead of returning an error.

## [0.19.6] - 2025-11-22

### Added

- Added `stubs.ProjectionCompactScopeStub` and `stubs.ProjectionResetScopeStub`.

## [0.19.5] - 2025-11-22

### Added

- Added `stubs.ProjectionMessageHandlerStub.Reset()` method.

## [0.19.4] - 2025-10-11

### Added

- Added `identitypb.Parse()` and `MustParse()`.

### Fixed

- Fixed `identitypb.Identity.Equal()` to correctly compare identity keys.

## [0.19.3] - 2025-10-11

### Added

- Added `stubs.MessageTypeUUID()`.

## [0.19.2] - 2025-10-11

### Added

- Added `uuidtest.Sequence` package for generating sequences of deterministic
  UUIDs for use in tests.

## [0.19.1] - 2025-10-11

### Added

- Added `config.RouteSet().MessageTypeSet()`.

## [0.19.0] - 2025-10-11

### Changed

- **[BC]** Changed `envelopepb.Packer.Unpack()` method to a global function.

## [0.18.2] - 2025-10-11

### Changed

- Relaxed requirements of `message.Kind[Of|For]()` and `Type[Of|For]()` to allow
  calling with interface types.

## [0.18.1] - 2025-10-10

### Changed

- Relaxed type constraint on `message.TypeFor()` to allow any type that
  implements `dogma.Message` (not just those with pointer receivers). This
  allows use of `TypeFor()` in generic code that does not itself have a pointer
  constraint.

## [0.18.0] - 2025-10-10

### Added

- Added `MarshalBinary()` and `UnmarshalBinary()` methods to all stub types.
- Added `envelopepb.Envelope.TypeId` field, which stores the UUID that uniquely
  identifies the message type.

### Changed

- Changed message stubs to use pointer receivers.
- **[BC]** `message.TypeFor()` now requires its type parameter to be a pointer.

### Removed

- **[BC]** Removed `marshaler` package. Messages, aggregate roots and process
  roots are now responsible for their own marshaling.
- **[BC]** Removed `envelopepb.Transcoder`.
- **[BC]** Removed `stubs.Marshaler`.
- **[BC]** Removed `envelopepb.Envelope.MediaType`.

## [0.17.0] - 2025-09-14

**[BC]** This release includes updates for compatibility with [Dogma v0.16.0],
which itself includes a large numbers of breaking changes.

[Dogma v0.16.0]: https://github.com/dogmatiq/dogma/releases/v0.16.0

### Added

- Added `uuidpb.Derive()`, which returns a UUID derived from a namespace and
  name(s) using SHA-1 hashing.
- Added `uuidpb.CopyBytes()`, which copies the bytes of a UUID into a byte
  slice.
- Added support for `%q` verb when formatting `uuidpb.UUID` values.

### Fixed

- Set `IsSuperset()` and `IsSubset()` methods no longer produce incorrect
  results when the argument is `nil`.

## [0.16.2] - 2025-06-24

### Added

- Added `Update()` method to all map types.
- Added basic tests for processes to `enginetest`.

### Changed

- The `Set()` method on all map types now returns the map, to allow for easier
  in-line map building.

## [0.16.1] - 2024-10-05

### Added

- Added `message` package, which is a largely drop-in replacement for
  `configkit/message`.

## [0.16.0] - 2024-10-03

### Added

- Added `maps.NewFromSeq()` (and variants) which construct map types from
  `iter.Seq2` sequences.
- Added `sets.NewFromSeq()` (and variants) which construct set types from
  `iter.Seq` sequences.
- Added `sets.NewFromKeys()` (and variants) which construct set types from
  the keys of `iter.Seq2` sequences.
- Added `sets.NewFromValues()` (and variants) which construct set types from
  the values of `iter.Seq2` sequences.
- Added `Intersection()` method to all set types.

### Changed

- **[BC]** Changed message stubs to accept validation scopes.
- The results of `Clone()`, `Merge()`, `Select()` and `Project()` on any map
  type are now guaranteed to be non-nil.
- The results of `Clone()`, `Union()` and `Project()` on any set type are now
  guaranteed to be non-nil.

### Removed

- **[BC]** Removed `cmp` parameter from `maps.NewOrderedByComparator()` and its
  variants. The comparator logic must now be totally encapsulated by the
  comparator type alone.

## [0.15.1] - 2024-10-02

### Removed

- Removed `nocopy` protection from collection types.

## [0.15.0] - 2024-10-02

### Added

- Added `sets.Proto` which is an unordered set of `proto.Message` values.
- Added `maps.Proto` which is an unordered map of `proto.Message` keys to
  arbitrary values.

### Changed

- **[BC]** Split `collection` package into separate `collections/maps` and
  `collections/sets` packages.

## [0.14.0] - 2024-09-30

### Added

- Added `collection.OrderedSet` and `UnorderedSet`.
- Added `collection.OrderedMap`.

### Removed

- **[BC]** Removed `uuidpb.OrderedSet` and `Map`, use `collections.OrderedSet`
  and `OrderedMap` instead.

## [0.13.0] - 2024-09-30

### Added

- Added `Marshaler.UnmarshalTypeFromMediaType()`.

### Removed

- Removed `Envelope.PortableName`. The `MediaType` field is now guaranteed to
  include the portable name as a parameter.
- Removed `Packet.PortableName()`.

## [0.12.2] - 2024-09-30

### Fixed

- Fixed error in `Marshaler.MarshalAs()` when passed a media-type that is
  unsupported because it does not have a `type` parameter. The implementation
  now correctly returns `false` instead.

## [0.12.1] - 2024-09-29

### Added

- Added `identitypb.Identity.Equal()`.
- Added `envelopepb.Packer` and `Transcoder` types.

## [0.12.0] - 2024-09-29

### Changed

- **[BC]** Renamed `uuidpb.FromString()` to `Parse()`.

### Added

- Added `uuidpb.MustParse()`.
- Added `marshaler` package as a replacement for `dogmatiq/marshalkit`.

## [0.11.1] - 2024-09-27

### Added

- Added JSON struct tags to stub types.

## [0.11.0] - 2024-09-25

### Added

- Added `Map.All()`, which returns an iterator that ranges over all key/value
  pairs in the map.
- Added`Map.Keys()` and `Values()` methods, which return iterators that range
  over the map's keys and values, respectively.
- Added `OrderedSet.All()`, which returns an iterator that ranges over all
  values in the set, in order.
- Added `Map.Len()` and `OrderedSet.Len()`.
- Added `protobuf/configpb` and `grpc/configgrpc` packages as a replacement for
  the `configspec` package from `dogmatiq/interopspec`.

### Changed

- Bumped minimum Go version to v1.23.
- **[BC]** `Map` is now a struct instead of an actual Go map. Iteration is
  provided by a new `All()` method that returns an iterator.
- **[BC]** `Set` has been renamed to `OrderedSet`, and is now a struct instead
  of a slice. Iteration is provided by a new `All()` method that returns an
  iterator.

### Removed

- **[BC]** Removed `MapKey` type.

## [0.10.3] - 2024-08-21

### Added

- Added the `enginetest/stubs` package as a replacement for the deprecated
  `github.com/dogmatiq/dogma/fixtures` package.

## [0.10.2] - 2024-04-08

### Added

- Added `uuidpb.Map.Has()`.

### Fixed

- Fixed unsigned integer overflow in `uuidpb.Compare()`.

## [0.10.1] - 2024-04-08

### Added

- Added `uuidpb.MapKey.Format()`, `String()` and `DapperString()` methods.

## [0.10.0] - 2024-03-27

- Initial release.

> [!NOTE]
> Releases v0.9.0 and prior where part of a prior "incarnation" of the
> `enginekit` package name. These versions are still cached on go.pkg.dev, but
> are unrelated to this repository.

<!-- references -->

[Unreleased]: https://github.com/dogmatiq/enginekit
[0.10.0]: https://github.com/dogmatiq/enginekit/releases/v0.10.0
[0.10.1]: https://github.com/dogmatiq/enginekit/releases/v0.10.1
[0.10.2]: https://github.com/dogmatiq/enginekit/releases/v0.10.2
[0.10.3]: https://github.com/dogmatiq/enginekit/releases/v0.10.3
[0.11.0]: https://github.com/dogmatiq/enginekit/releases/v0.11.0
[0.11.1]: https://github.com/dogmatiq/enginekit/releases/v0.11.1
[0.12.0]: https://github.com/dogmatiq/enginekit/releases/v0.12.0
[0.12.1]: https://github.com/dogmatiq/enginekit/releases/v0.12.1
[0.12.2]: https://github.com/dogmatiq/enginekit/releases/v0.12.2
[0.13.0]: https://github.com/dogmatiq/enginekit/releases/v0.13.0
[0.14.0]: https://github.com/dogmatiq/enginekit/releases/v0.14.0
[0.15.0]: https://github.com/dogmatiq/enginekit/releases/v0.15.0
[0.15.1]: https://github.com/dogmatiq/enginekit/releases/v0.15.1
[0.16.0]: https://github.com/dogmatiq/enginekit/releases/v0.16.0
[0.16.1]: https://github.com/dogmatiq/enginekit/releases/v0.16.1
[0.16.2]: https://github.com/dogmatiq/enginekit/releases/v0.16.2
[0.17.0]: https://github.com/dogmatiq/enginekit/releases/v0.17.0
[0.18.0]: https://github.com/dogmatiq/enginekit/releases/v0.18.0
[0.18.1]: https://github.com/dogmatiq/enginekit/releases/v0.18.1
[0.18.2]: https://github.com/dogmatiq/enginekit/releases/v0.18.2
[0.19.0]: https://github.com/dogmatiq/enginekit/releases/v0.19.0
[0.19.1]: https://github.com/dogmatiq/enginekit/releases/v0.19.1
[0.19.2]: https://github.com/dogmatiq/enginekit/releases/v0.19.2
[0.19.3]: https://github.com/dogmatiq/enginekit/releases/v0.19.3
[0.19.4]: https://github.com/dogmatiq/enginekit/releases/v0.19.4
[0.19.5]: https://github.com/dogmatiq/enginekit/releases/v0.19.5
[0.19.6]: https://github.com/dogmatiq/enginekit/releases/v0.19.6
[0.19.7]: https://github.com/dogmatiq/enginekit/releases/v0.19.7
[0.19.8]: https://github.com/dogmatiq/enginekit/releases/v0.19.8
[0.19.9]: https://github.com/dogmatiq/enginekit/releases/v0.19.9
[0.19.10]: https://github.com/dogmatiq/enginekit/releases/v0.19.10
[0.19.11]: https://github.com/dogmatiq/enginekit/releases/v0.19.11
[0.19.12]: https://github.com/dogmatiq/enginekit/releases/v0.19.12
[0.19.13]: https://github.com/dogmatiq/enginekit/releases/v0.19.13
[0.19.14]: https://github.com/dogmatiq/enginekit/releases/v0.19.14
[0.19.15]: https://github.com/dogmatiq/enginekit/releases/v0.19.15
[0.19.16]: https://github.com/dogmatiq/enginekit/releases/v0.19.16
[0.19.17]: https://github.com/dogmatiq/enginekit/releases/v0.19.17
[0.19.18]: https://github.com/dogmatiq/enginekit/releases/v0.19.18
[0.19.19]: https://github.com/dogmatiq/enginekit/releases/v0.19.19
[0.20.0]: https://github.com/dogmatiq/enginekit/releases/v0.20.0
[0.20.1]: https://github.com/dogmatiq/enginekit/releases/v0.20.1
[0.21.0]: https://github.com/dogmatiq/enginekit/releases/v0.21.0
[0.22.0]: https://github.com/dogmatiq/enginekit/releases/v0.22.0
[0.23.0]: https://github.com/dogmatiq/enginekit/releases/v0.23.0
[0.23.1]: https://github.com/dogmatiq/enginekit/releases/v0.23.1
[0.23.2]: https://github.com/dogmatiq/enginekit/releases/v0.23.2
[0.24.0]: https://github.com/dogmatiq/enginekit/releases/v0.24.0
[0.24.1]: https://github.com/dogmatiq/enginekit/releases/v0.24.1
[0.25.0]: https://github.com/dogmatiq/enginekit/releases/v0.25.0
[0.26.0]: https://github.com/dogmatiq/enginekit/releases/v0.26.0
[0.26.1]: https://github.com/dogmatiq/enginekit/releases/v0.26.1
[0.26.2]: https://github.com/dogmatiq/enginekit/releases/v0.26.2
[0.26.3]: https://github.com/dogmatiq/enginekit/releases/v0.26.3
[0.26.4]: https://github.com/dogmatiq/enginekit/releases/v0.26.4
[0.26.5]: https://github.com/dogmatiq/enginekit/releases/v0.26.5
[0.27.0]: https://github.com/dogmatiq/enginekit/releases/v0.27.0
[0.27.1]: https://github.com/dogmatiq/enginekit/releases/v0.27.1
[0.27.2]: https://github.com/dogmatiq/enginekit/releases/v0.27.2
[0.27.3]: https://github.com/dogmatiq/enginekit/releases/v0.27.3
[0.27.4]: https://github.com/dogmatiq/enginekit/releases/v0.27.4
[0.27.5]: https://github.com/dogmatiq/enginekit/releases/v0.27.5
[0.27.6]: https://github.com/dogmatiq/enginekit/releases/v0.27.6
[0.27.7]: https://github.com/dogmatiq/enginekit/releases/v0.27.7

<!-- version template
## [0.0.1] - YYYY-MM-DD

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
-->
