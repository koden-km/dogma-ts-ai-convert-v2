package renderer

import (
	"io"
	"strings"
)

// Renderer writes multi-line output to an io.Writer.
type Renderer struct {
	Target io.Writer

	count int
	err   error

	indents  []bool
	sameLine bool
}

// StartChild increases the indentation level and adds a bullet point.
func (r *Renderer) StartChild() {
	r.indents = append(r.indents, true)
}

// EndChild decreases the indentation level.
func (r *Renderer) EndChild() {
	r.indents = r.indents[:len(r.indents)-1]
}

// Print writes several strings to the output.
func (r *Renderer) Print(str ...string) {
	for _, s := range str {
		r.print(s)
	}
}

// Printf writes a formatted string to the output.
func (r *Renderer) Printf(format string, args ...any) {
	r.print(Inflect(format, args...))
}

// Done returns the number of bytes written and any error that occurred.
func (r *Renderer) Done() (int, error) {
	return r.count, r.err
}

func (r *Renderer) print(s string) {
	for s != "" && r.err == nil {
		if !r.sameLine {
			for i, isFirstLine := range r.indents {
				r.write("  ")

				if isFirstLine {
					r.write("- ")
				} else {
					r.write("  ")
				}

				r.indents[i] = false
			}

			r.sameLine = true
		}

		i := strings.IndexByte(s, '\n')

		if i == -1 {
			// There are no more line break characters, simply write the
			// remainder of the buffer and we're done.
			r.write(s)
			return
		}

		// Write the remainder of this line including the line break character,
		// and trim the beginning of the buffer.
		r.write(s[:i+1])
		s = s[i+1:]
		r.sameLine = false
	}
}

func (r *Renderer) write(s string) {
	if r.err == nil {
		n, err := io.WriteString(r.Target, s)
		r.count += n
		r.err = err
	}
}
