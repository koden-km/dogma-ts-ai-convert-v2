package enum

import "fmt"

// Enum is a constraint for enumeration types.
type Enum interface {
	~int
	fmt.Stringer
}
