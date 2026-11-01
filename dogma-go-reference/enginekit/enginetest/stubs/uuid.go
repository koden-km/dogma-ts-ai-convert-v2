package stubs

import (
	"strconv"
	"sync/atomic"

	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
)

// UUIDSequence is a generator of deterministic UUIDs for use in tests.
type UUIDSequence struct {
	ns    atomic.Pointer[uuidpb.UUID]
	count atomic.Uint32
}

// Next returns the next UUID in the sequence.
func (g *UUIDSequence) Next() *uuidpb.UUID {
	idx := g.count.Add(1) - 1
	return g.At(int(idx))
}

// At returns the UUID at the given position in the sequence.
func (g *UUIDSequence) At(idx int) *uuidpb.UUID {
	ns := g.ns.Load()

	if ns == nil {
		ns = uuidpb.Generate()

		if !g.ns.CompareAndSwap(nil, ns) {
			ns = g.ns.Load()
		}
	}

	return uuidpb.Derive(ns, strconv.Itoa(idx))
}

// Count returns the number of UUIDs that have been generated so far.
func (g *UUIDSequence) Count() int {
	return int(g.count.Load())
}
