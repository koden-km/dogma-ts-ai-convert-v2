# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog], and this project adheres to
[Semantic Versioning].

<!-- references -->

[keep a changelog]: https://keepachangelog.com/en/1.0.0/
[semantic versioning]: https://semver.org/spec/v2.0.0.html
[bc]: https://github.com/dogmatiq/.github/blob/main/VERSIONING.md#changelogs

## [Unreleased]

### Changed

- Documented that `ReadEvents` returns `INVALID_ARGUMENT` for a missing or
  invalid stream ID.

## [0.7.0] - 2026-11-06

### Added

- Added Go `AsMultiEnvelopes()` and TypeScript `asMultiEnvelopes()` to group
  consecutive envelopes with equivalent headers into multi-envelopes while
  preserving message order.

### Changed

- **[BC]** TypeScript `getExtension()` and `getBaggage()` now throw when the
  requested value is absent. Use `tryGetExtension()` and `tryGetBaggage()`
  for the previous behavior of returning `undefined`. Both forms still throw
  when the selected value cannot be decoded.
- **[BC]** Changed `WatchEvents` to return `ABORTED` instead of
  `RESOURCE_EXHAUSTED` when a client cannot keep up, so that it can't be
  confused with `RESOURCE_EXHAUSTED` errors produced by gRPC itself or by
  proxies.

### Removed

- **[BC]** Removed `EventStreamConsumerTooSlow` and the Go helper
  `EventStreamConsumerTooSlowError()`. The `ABORTED` code alone identifies the
  error.
- **[BC]** Removed `UnrecognizedEventStream` and the Go helper
  `UnrecognizedEventStreamError()`. `ReadEvents` still returns `NOT_FOUND` for
  an unrecognized stream ID, without error details.

## [0.6.0] - 2026-11-06

### Added

- Restored `MultiEnvelope` and its Go and TypeScript batching, expansion and
  validation helpers.

### Changed

- **[BC]** Changed `EventStreamSegment.envelopes` to contain `MultiEnvelope`
  values again, preserving message order within and across multi-envelopes.

## [0.5.0] - 2026-11-06

### Added

- Added `MessageFilter` with explicit all-types and specific-types
  selections, and Go and TypeScript validation helpers.
- Added `EventStreamConsumerTooSlow` and the Go helper
  `EventStreamConsumerTooSlowError()` for `RESOURCE_EXHAUSTED` errors when a
  client cannot keep up and event stream delivery can no longer continue
  contiguously.

### Changed

- **[BC]** Changed `EventStreamSegment.envelopes` to contain individual
  `Envelope` values instead of `MultiEnvelope` values.
- **[BC]** Replaced `message_type_ids` in `WatchEventsRequest` and
  `ReadEventsRequest` with a required `filter`. Missing filters,
  filters with no selection, and empty specific-type selections are invalid
  and result in `INVALID_ARGUMENT` from either RPC.
- Clarified event matching, stream discovery and segment continuity requirements
  for `WatchEvents` and `ReadEvents`.
- Changed `WatchEvents` to return `RESOURCE_EXHAUSTED` with an attached
  `EventStreamConsumerTooSlow` detail when a client cannot keep up and delivery
  can no longer continue contiguously.

### Removed

- **[BC]** Removed `MultiEnvelope` and its Go and TypeScript batching,
  expansion and validation helpers. Use individual `Envelope` values instead.

### Fixed

- Fixed TypeScript `validateUUID()` accepting negative or overflowing UUID
  components when their version and variant bits were otherwise valid.

## [0.4.1] - 2026-11-04

### Added

- Added the TypeScript package to the public npm registry as
  `@dogmatiq/protobuf`.

## [0.4.0] - 2026-11-04

### Changed

- **[BC]** An empty `message_type_ids` in `WatchEventsRequest` and
  `ReadEventsRequest` now matches every event, instead of matching none.

## [0.3.0] - 2026-11-04

### Added

- Added `EventStreamConsumerAPI.WatchEvents`, a server-streaming method that
  delivers events of the requested message types as they are appended to any
  stream, for as long as the call is open. The first segment received for a
  stream tells the client that the stream exists and where the feed begins.
- Added `EventStreamConsumerAPI.ReadEvents`, which delivers the events of the
  requested message types from a single stream, from a given offset to the end
  of the stream, then closes.
- Added `EventStreamSegment`, the output of both methods. It describes the
  half-open range `[begin_offset, end_offset)` of one stream and carries the
  matching events within it.

### Removed

- **[BC]** Removed `EventStreamConsumerAPI.ListEventStreams`,
  `ListEventStreamsRequest`, `ListEventStreamsResponse` and `EventStream`.
  Streams are discovered from the segments delivered by `WatchEvents`.
- **[BC]** Removed `EventStreamConsumerAPI.ConsumeEvents`,
  `ConsumeEventsRequest` and `ConsumeEventsResponse` in favor of `ReadEvents`.
  The server no longer closes a call when it believes it cannot produce new
  events of the requested types; `ReadEvents` closes when it reaches the end
  of the stream.

## [0.2.0] - 2026-11-02

### Added

- Added `Header.Validate()`, `Body.Validate()` and `Message.Validate()` to the
  Go `envelopepb` package.
- Added `validateHeader()`, `validateBody()` and `validateMessage()` to the
  TypeScript `envelopepb` package.

### Changed

- **[BC]** `envelopepb.SetExtension()` and `SetBaggage()` now accept any value
  with the relevant getter and setter methods, such as a `*Header` or `*Body`,
  and accept the value to set as a `proto.Message`. They are no longer generic,
  so calls that specify type arguments explicitly must remove them.
- `setExtension()` and `setBaggage()` in the TypeScript `envelopepb` package now
  accept a `Header` or a `Body`.

### Fixed

- `envelopepb.SetExtension()` and `SetBaggage()` now panic if the value is a nil
  pointer, as well as when it is `nil`.

## [0.1.0] - 2026-11-02

- Initial release.

<!-- references -->

[unreleased]: https://github.com/dogmatiq/protobuf
[unreleased]: https://github.com/dogmatiq/protobuf
[0.1.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.1.0
[0.2.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.2.0
[0.3.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.3.0
[0.4.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.4.0
[0.4.1]: https://github.com/dogmatiq/protobuf/releases/tag/v0.4.1
[0.5.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.5.0
[0.6.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.6.0
[0.7.0]: https://github.com/dogmatiq/protobuf/releases/tag/v0.7.0

<!-- version template
## [0.0.1] - YYYY-MM-DD

### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security
-->
