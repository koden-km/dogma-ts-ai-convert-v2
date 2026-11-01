package messaginggrpc

import (
	uuidpb "github.com/dogmatiq/enginekit/protobuf/uuidpb"
	codes "google.golang.org/grpc/codes"
	status "google.golang.org/grpc/status"
)

// UnrecognizedApplicationError returns an error indicating that the given
// application is not recognized by the server.
func UnrecognizedApplicationError(key *uuidpb.UUID) error {
	s, err := status.
		New(codes.NotFound, "unrecognized application").
		WithDetails(
			NewUnrecognizedApplicationBuilder().
				WithApplicationKey(key).
				Build(),
		)

	if err != nil {
		panic(err)
	}

	return s.Err()
}

// UnrecognizedEventStreamError returns an error indicating that the given
// stream is not recognized by the server.
func UnrecognizedEventStreamError(id *uuidpb.UUID) error {
	s, err := status.
		New(codes.NotFound, "unrecognized event stream").
		WithDetails(
			NewUnrecognizedEventStreamBuilder().
				WithEventStreamId(id).
				Build(),
		)

	if err != nil {
		panic(err)
	}

	return s.Err()
}

// UnrecognizedCommandTypeError returns an error indicating that the given
// command type is not recognized by the server, or is not executable within
// the target application.
func UnrecognizedCommandTypeError(id *uuidpb.UUID) error {
	s, err := status.
		New(codes.InvalidArgument, "unrecognized command type").
		WithDetails(
			NewUnrecognizedCommandTypeBuilder().
				WithMessageTypeId(id).
				Build(),
		)

	if err != nil {
		panic(err)
	}

	return s.Err()
}

// UnrecognizedEventTypeError returns an error indicating that the given event
// type is not recognized by the server.
func UnrecognizedEventTypeError(id *uuidpb.UUID) error {
	s, err := status.
		New(codes.InvalidArgument, "unrecognized event type").
		WithDetails(
			NewUnrecognizedEventTypeBuilder().
				WithMessageTypeId(id).
				Build(),
		)

	if err != nil {
		panic(err)
	}

	return s.Err()
}

// MalformedMessageError returns an error indicating that a message's binary
// data could not be unmarshaled as the given message type.
func MalformedMessageError(id *uuidpb.UUID) error {
	s, err := status.
		New(codes.InvalidArgument, "malformed message").
		WithDetails(
			NewMalformedMessageBuilder().
				WithMessageTypeId(id).
				Build(),
		)

	if err != nil {
		panic(err)
	}

	return s.Err()
}

// InvalidMessageError returns an error indicating that a message of the given
// type failed the application's validation logic. reason is a human-readable
// description of the validation failure.
func InvalidMessageError(id *uuidpb.UUID, reason string) error {
	s, err := status.
		New(codes.InvalidArgument, "invalid message: "+reason).
		WithDetails(
			NewInvalidMessageBuilder().
				WithMessageTypeId(id).
				Build(),
		)

	if err != nil {
		panic(err)
	}

	return s.Err()
}
