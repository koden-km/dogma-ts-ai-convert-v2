package maps

import (
	"iter"
	"slices"
)

type ordered[K, V, I any] interface {
	*I

	// ptr returns a pointer to the map's key/value pairs.
	ptr() *[]Pair[K, V]

	// cmp compares two keys.
	cmp(K, K) int
}

func orderedFromUnsortedPairs[K, V any, M ordered[K, V, I], I any](
	pairs []Pair[K, V],
) M {
	var m M = new(I)

	for _, p := range pairs {
		orderedSet(m, p.Key, p.Value)
	}

	return m
}

func orderedFromSortedPairs[K, V any, M ordered[K, V, I], I any](
	pairs []Pair[K, V],
) M {
	var m M = new(I)
	*m.ptr() = pairs
	return m
}

func orderedFromSeq[K, V any, M ordered[K, V, I], I any](
	pairs iter.Seq2[K, V],
) M {
	var m M = new(I)

	for k, v := range pairs {
		orderedSet(m, k, v)
	}

	return m
}

func orderedSearch[K, V any, M ordered[K, V, I], I any](
	m M,
	k K,
) (int, bool) {
	if m == nil {
		return -1, false
	}

	return slices.BinarySearchFunc(
		*m.ptr(),
		k,
		func(p Pair[K, V], k K) int {
			return m.cmp(p.Key, k)
		},
	)
}

func orderedSet[K, V any, M ordered[K, V, I], I any](
	m M,
	k K,
	v V,
) M {
	if m == nil {
		panic("Set() called on a nil map")
	}

	pairs := m.ptr()

	if i, ok := orderedSearch(m, k); ok {
		(*pairs)[i].Value = v
	} else {
		*pairs = slices.Insert(*pairs, i, Pair[K, V]{k, v})
	}

	return m
}

func orderedUpdate[K, V any, M ordered[K, V, I], I any](
	m M,
	k K,
	fn func(*V),
) {
	if m == nil {
		panic("Update() called on a nil map")
	}

	pairs := m.ptr()

	if i, ok := orderedSearch(m, k); ok {
		fn(&(*pairs)[i].Value)
	} else {
		var v V
		fn(&v)
		*pairs = slices.Insert(*pairs, i, Pair[K, V]{k, v})
	}
}

func orderedRemove[K, V any, M ordered[K, V, I], I any](
	m M,
	keys ...K,
) {
	if m == nil {
		return
	}

	pairs := m.ptr()

	for _, k := range keys {
		if len(*pairs) == 0 {
			return
		}

		if i, ok := orderedSearch(m, k); ok {
			*pairs = slices.Delete(*pairs, i, i+1)
		}
	}
}

func orderedClear[K, V any, M ordered[K, V, I], I any](
	m M,
) {
	if m == nil {
		return
	}

	pairs := m.ptr()
	clear(*pairs)
	*pairs = (*pairs)[:0]
}

func orderedLen[K, V any, M ordered[K, V, I], I any](
	m M,
) int {
	if m == nil {
		return 0
	}

	return len(*m.ptr())
}

func orderedHas[K, V any, M ordered[K, V, I], I any](
	m M,
	keys ...K,
) bool {
	for _, k := range keys {
		if _, ok := orderedSearch(m, k); !ok {
			return false
		}
	}

	return true
}

func orderedGet[K, V any, M ordered[K, V, I], I any](
	m M,
	k K,
) V {
	v, _ := orderedTryGet(m, k)
	return v
}

func orderedTryGet[K, V any, M ordered[K, V, I], I any](
	m M,
	k K,
) (V, bool) {
	if i, ok := orderedSearch(m, k); ok {
		p := m.ptr()
		return (*p)[i].Value, true
	}

	var zero V
	return zero, false
}

func orderedClone[K, V any, M ordered[K, V, I], I any](
	m M,
) M {
	var pairs []Pair[K, V]

	if m != nil {
		pairs = slices.Clone(*m.ptr())
	}

	return orderedFromSortedPairs[K, V, M](pairs)
}

func orderedMerge[K, V any, M ordered[K, V, I], I any](
	x, y M,
) M {
	lenX := orderedLen(x)
	lenY := orderedLen(y)

	if lenX == 0 {
		return orderedClone(y)
	}

	if lenY == 0 {
		return orderedClone(x)
	}

	pairsX, pairsY := *x.ptr(), *y.ptr()
	indexX, indexY := 0, 0

	pairs := make([]Pair[K, V], 0, max(lenX, lenY))

	for {
		if indexX >= lenX {
			pairs = append(pairs, pairsY[indexY:]...)
			break
		}

		if indexY >= lenY {
			pairs = append(pairs, pairsX[indexX:]...)
			break
		}

		pairX, pairY := pairsX[indexX], pairsY[indexY]

		c := x.cmp(pairX.Key, pairY.Key)

		if c < 0 {
			pairs = append(pairs, pairX)
			indexX++
		} else if c > 0 {
			pairs = append(pairs, pairY)
			indexY++
		} else {
			pairs = append(pairs, pairY)
			indexX++
			indexY++
		}
	}

	return orderedFromSortedPairs[K, V, M](pairs)
}

func orderedSelect[K, V any, M ordered[K, V, I], I any](
	m M,
	pred func(K, V) bool,
) M {
	var pairs []Pair[K, V]

	if m != nil {
		for _, pair := range *m.ptr() {
			if pred(pair.Key, pair.Value) {
				pairs = append(pairs, pair)
			}
		}
	}

	return orderedFromSortedPairs[K, V, M](pairs)
}

func orderedProject[K, V any, M ordered[K, V, I], I any](
	m M,
	transform func(K, V) (K, V, bool),
) M {
	var out M = new(I)

	if m != nil {
		for _, pair := range *m.ptr() {
			if k, v, ok := transform(pair.Key, pair.Value); ok {
				orderedSet(out, k, v)
			}
		}
	}

	return out
}

func orderedAll[K, V any, M ordered[K, V, I], I any](
	m M,
) iter.Seq2[K, V] {
	return func(yield func(K, V) bool) {
		if m != nil {
			for _, p := range *m.ptr() {
				if !yield(p.Key, p.Value) {
					return
				}
			}
		}
	}
}

func orderedReverse[K, V any, M ordered[K, V, I], I any](
	m M,
) iter.Seq2[K, V] {
	return func(yield func(K, V) bool) {
		if m != nil {
			pairs := *m.ptr()

			for i := len(pairs) - 1; i >= 0; i-- {
				p := pairs[i]
				if !yield(p.Key, p.Value) {
					return
				}
			}
		}
	}
}

func orderedKeys[K, V any, M ordered[K, V, I], I any](
	m M,
) iter.Seq[K] {
	return func(yield func(K) bool) {
		if m != nil {
			for _, p := range *m.ptr() {
				if !yield(p.Key) {
					return
				}
			}
		}
	}
}

func orderedReverseKeys[K, V any, M ordered[K, V, I], I any](
	m M,
) iter.Seq[K] {
	return func(yield func(K) bool) {
		if m != nil {
			pairs := *m.ptr()

			for i := len(pairs) - 1; i >= 0; i-- {
				if !yield(pairs[i].Key) {
					return
				}
			}
		}
	}
}

func orderedValues[K, V any, M ordered[K, V, I], I any](
	m M,
) iter.Seq[V] {
	return func(yield func(V) bool) {
		if m != nil {
			for _, p := range *m.ptr() {
				if !yield(p.Value) {
					return
				}
			}
		}
	}
}

func orderedReverseValues[K, V any, M ordered[K, V, I], I any](
	m M,
) iter.Seq[V] {
	return func(yield func(V) bool) {
		if m != nil {
			pairs := *m.ptr()

			for i := len(pairs) - 1; i >= 0; i-- {
				if !yield(pairs[i].Value) {
					return
				}
			}
		}
	}
}
