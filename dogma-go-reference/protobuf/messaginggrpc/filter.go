package messaginggrpc

import (
	"errors"
	"fmt"
)

// Validate returns an error if x matches no message types or contains an
// invalid message type ID.
func (x *MessageFilter) Validate() error {
	if x.GetAll() != nil {
		return nil
	}
	ids := x.GetSpecific().GetIds()
	if len(ids) == 0 {
		return errors.New("message filter must match all message types or at least one specific type")
	}
	for i, id := range ids {
		if err := id.Validate(); err != nil {
			return fmt.Errorf("invalid message type ID at index %d: %w", i, err)
		}
	}
	return nil
}
