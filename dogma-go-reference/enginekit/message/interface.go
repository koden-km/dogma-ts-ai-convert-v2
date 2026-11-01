package message

import (
	"fmt"
	"reflect"

	"github.com/dogmatiq/dogma"
)

var (
	commandInterface  = reflect.TypeFor[dogma.Command]()
	eventInterface    = reflect.TypeFor[dogma.Event]()
	deadlineInterface = reflect.TypeFor[dogma.Deadline]()
)

// tryInterfaceOf returns the message interface that r implements, or nil if it
// does not implement any of the message interfaces.
func tryInterfaceOf(r reflect.Type) reflect.Type {
	if r == nil {
		panic("message type must not be nil")
	}

	if r.Implements(commandInterface) {
		return commandInterface
	}

	if r.Implements(eventInterface) {
		return eventInterface
	}

	if r.Implements(deadlineInterface) {
		return deadlineInterface
	}

	return nil
}

// interfaceOf returns the message interface that r implements, or nil if it
// does not implement any of the message interfaces.
func interfaceOf(r reflect.Type) reflect.Type {
	if i := tryInterfaceOf(r); i != nil {
		return i
	}

	panic(fmt.Sprintf("%s does not implement dogma.Command, dogma.Event or dogma.Deadline", r))
}

func guardAgainstNonMessage(r reflect.Type) {
	interfaceOf(r)
}
