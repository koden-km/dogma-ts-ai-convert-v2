package sets_test

import (
	"iter"
	"testing"

	"pgregory.net/rapid"
)

type contract[T, I any] interface {
	*I

	Add(members ...T)
	Remove(members ...T)
	Clear()

	Len() int
	Has(members ...T) bool
	IsEqual(*I) bool
	IsSuperset(*I) bool
	IsSubset(*I) bool
	IsStrictSuperset(*I) bool
	IsStrictSubset(*I) bool

	Clone() *I
	Union(*I) *I
	Intersection(*I) *I
	Select(func(T) bool) *I

	All() iter.Seq[T]
}

type orderedContract[T, S any] interface {
	contract[T, S]

	Reverse() iter.Seq[T]
}

func testSet[
	S contract[T, I],
	T, I any,
](
	t *testing.T,
	newSet func(...T) S,
	fromSeq func(iter.Seq[T]) S,
	fromKeys func(iter.Seq2[T, any]) S,
	fromValues func(iter.Seq2[any, T]) S,
	isEqual func(T, T) bool,
	pred func(T) bool,
	gen *rapid.Generator[T],
) {
	t.Parallel()
	t.Helper()

	rapid.Check(t, func(t *rapid.T) {
		var (
			subject  S
			expected []T
		)

		add := func(m T) {
			expected = append(expected, m)
		}

		remove := func(m T) {
			for i, v := range expected {
				if isEqual(m, v) {
					expected[i] = expected[len(expected)-1]
					expected = expected[:len(expected)-1]
					return
				}
			}
		}

		has := func(m T) bool {
			for _, v := range expected {
				if isEqual(m, v) {
					return true
				}
			}
			return false
		}

		drawMember := func(t *rapid.T) T {
			if len(expected) == 0 {
				t.Skip("set is empty")
			}

			return rapid.
				SampledFrom(expected).
				Draw(t, "existing member")
		}

		drawNonMember := func(t *rapid.T) T {
			for {
				m := gen.Draw(t, "non-member")
				if !has(m) {
					return m
				}
				t.Logf("[rapid] discard member %#v, already in the set", m)
			}
		}

		newDisjointSet := func(t *rapid.T, min, max int) S {
			n := rapid.
				IntRange(min, max).
				Draw(t, "number of members")

			s := newSet()

			for range n {
				s.Add(drawNonMember(t))
			}

			return s
		}

		t.Repeat(
			map[string]func(*rapid.T){
				"replace the subject with a new one": func(t *rapid.T) {
					expected = nil

					n := rapid.
						IntRange(0, 10).
						Draw(t, "number of members")

					for range n {
						add(drawNonMember(t))
					}

					subject = newSet(expected...)
				},
				"replace the subject with a new one constructed from a sequence": func(t *rapid.T) {
					expected = nil

					n := rapid.
						IntRange(0, 10).
						Draw(t, "number of members")

					for range n {
						add(drawNonMember(t))
					}

					subject = fromSeq(
						func(yield func(T) bool) {
							for _, m := range expected {
								if !yield(m) {
									return
								}
							}
						},
					)
				},
				"replace the subject with a new one constructed from the keys of a sequence": func(t *rapid.T) {
					expected = nil

					n := rapid.
						IntRange(0, 10).
						Draw(t, "number of members")

					for range n {
						add(drawNonMember(t))
					}

					subject = fromKeys(
						func(yield func(T, any) bool) {
							for _, m := range expected {
								if !yield(m, nil) {
									return
								}
							}
						},
					)
				},
				"replace the subject with a new one constructed from the values of a sequence": func(t *rapid.T) {
					expected = nil

					n := rapid.
						IntRange(0, 10).
						Draw(t, "number of members")

					for range n {
						add(drawNonMember(t))
					}

					subject = fromValues(
						func(yield func(any, T) bool) {
							for _, m := range expected {
								if !yield(nil, m) {
									return
								}
							}
						},
					)
				},
				"set the subject to nil": func(t *rapid.T) {
					subject = nil
					expected = nil
				},
				"add a non-member": func(t *rapid.T) {
					m := drawNonMember(t)

					if subject != nil {
						add(m)
					} else {
						defer func() {
							want := "Add() called on a nil set"
							got := recover()
							if got != want {
								t.Fatalf("unexpected panic value: got %#v, want %#v", got, want)
							}
						}()
					}

					subject.Add(m)
				},
				"re-add an existing member": func(t *rapid.T) {
					m := drawMember(t)
					subject.Add(m)
				},
				"remove a member": func(t *rapid.T) {
					m := drawMember(t)
					subject.Remove(m)
					remove(m)
				},
				"remove a non-member": func(t *rapid.T) {
					m := drawNonMember(t)
					subject.Remove(m)
				},
				"remove multiple members": func(t *rapid.T) {
					if subject.Len() < 2 {
						t.Skip("set has fewer than 2 members")
					}

					m1 := drawMember(t)
					remove(m1)

					m2 := drawMember(t)
					remove(m2)

					subject.Remove(m1, m2)
				},
				"remove nothing": func(t *rapid.T) {
					subject.Remove()
				},
				"check for membership": func(t *rapid.T) {
					m := drawMember(t)
					if !subject.Has(m) {
						t.Fatalf("expected %#v to be a member", m)
					}
				},
				"check for non-membership": func(t *rapid.T) {
					m := drawNonMember(t)
					if subject.Has(m) {
						t.Fatalf("did not expect %#v to be a member", m)
					}
				},
				"check for membership of multiple members": func(t *rapid.T) {
					if subject.Len() < 2 {
						t.Skip("set has fewer than 2 members")
					}

					m1 := drawMember(t)
					m2 := drawMember(t)

					if !subject.Has(m1, m2) {
						t.Fatalf("expected %#v and %#v to be members", m1, m2)
					}
				},
				"check for non-membership of multiple members": func(t *rapid.T) {
					m1 := drawNonMember(t)
					m2 := drawNonMember(t)

					if subject.Has(m1, m2) {
						t.Fatalf("did not expect %#v and %#v to be members", m1, m2)
					}
				},
				"check for non-membership of one of the given members": func(t *rapid.T) {
					m1 := drawMember(t)
					m2 := drawNonMember(t)

					if subject.Has(m1, m2) {
						t.Fatalf("did not expect %#v and %#v to be members", m1, m2)
					}

					if subject.Has(m2, m1) {
						t.Fatalf("did not expect %#v and %#v to be members", m2, m1)
					}
				},
				"check for membership of nothing": func(t *rapid.T) {
					if !subject.Has() {
						t.Fatal("expected Has() with no arguments to return true")
					}
				},
				"clear the set": func(t *rapid.T) {
					subject.Clear()
					expected = nil
				},
				"clone the set": func(t *rapid.T) {
					snapshot := subject
					subject = subject.Clone()

					if subject == nil {
						t.Fatal("the result of a clone should never be nil")
					}

					if snapshot != nil {
						m := drawNonMember(t)
						snapshot.Add(m)

						if subject.Has(m) {
							t.Fatal("expected clone to be a shallow copy")
						}
					}
				},
				"union with disjoint set": func(t *rapid.T) {
					s := newDisjointSet(t, 0, 3)

					for m := range s.All() {
						add(m)
					}

					subject = subject.Union(s)
				},
				"union with itself": func(t *rapid.T) {
					subject = subject.Union(subject)
					if subject == nil {
						t.Fatal("the result of a union should never be nil")
					}
				},
				"union with a nil set": func(t *rapid.T) {
					subject = subject.Union(nil)
					if subject == nil {
						t.Fatal("the result of a union should never be nil")
					}
				},
				"intersection with an overlapping set": func(t *rapid.T) {
					s := newDisjointSet(t, 0, 3)

					m := drawMember(t)
					s.Add(m)

					expected = []T{m}
					subject = subject.Intersection(s)
					if subject == nil {
						t.Fatal("the result of an intersection should never be nil")
					}
				},
				"intersection with disjoint set": func(t *rapid.T) {
					s := newDisjointSet(t, 0, 3)

					expected = nil
					subject = subject.Intersection(s)
					if subject == nil {
						t.Fatal("the result of an intersection should never be nil")
					}
				},
				"interesection with itself": func(t *rapid.T) {
					subject = subject.Intersection(subject)
					if subject == nil {
						t.Fatal("the result of an intersection should never be nil")
					}
				},
				"intersection with a nil set": func(t *rapid.T) {
					expected = nil
					subject = subject.Intersection(nil)
					if subject == nil {
						t.Fatal("the result of an intersection should never be nil")
					}
				},
				"select a subset": func(t *rapid.T) {
					subject = subject.Select(
						func(m T) bool {
							if pred(m) {
								return true
							} else {
								remove(m)
								return false
							}
						},
					)

					if subject == nil {
						t.Fatal("the result of a selection should never be nil")
					}
				},
				"": func(t *rapid.T) {
					if subject.Len() != len(expected) {
						t.Fatalf("unexpected length: got %d, want %d", subject.Len(), len(expected))
					}

					for m := range subject.All() {
						if !has(m) {
							t.Fatalf("set contains an unexpected member: %#v", m)
						}
					}

					if !subject.IsEqual(subject) {
						t.Fatal("expected the set to be equal to itself")
					}

					if !subject.IsSuperset(subject) {
						t.Fatal("expected the set to be a (non-strict) superset of itself")
					}

					if !subject.IsSubset(subject) {
						t.Fatal("expected the set to be a (non-strict) subset of itself")
					}

					if subject.IsStrictSuperset(subject) {
						t.Fatal("did not expect the set to be a strict superset of itself")
					}

					if subject.IsStrictSubset(subject) {
						t.Fatal("did not expect the set to be a strict subset of itself")
					}

					if len(expected) == 0 {
						if !subject.IsEqual(nil) {
							t.Fatal("empty set should be equal to nil")
						}

						if !subject.IsSuperset(nil) {
							t.Fatal("empty set should be a superset of nil")
						}

						if !subject.IsSubset(nil) {
							t.Fatal("empty set should be a subset of nil")
						}

						if subject.IsStrictSuperset(nil) {
							t.Fatal("empty set should not be a strict superset of nil")
						}

						if subject.IsStrictSubset(nil) {
							t.Fatal("empty set should not be a strict subset of nil")
						}
					} else {
						if subject.IsEqual(nil) {
							t.Fatal("non-empty set should not be equal to nil")
						}

						if !subject.IsSuperset(nil) {
							t.Fatal("non-empty set should be a superset of nil")
						}

						if subject.IsSubset(nil) {
							t.Fatal("non-empty set should not be a subset of nil")
						}

						if !subject.IsStrictSuperset(nil) {
							t.Fatal("non-empty set should be a strict superset of nil")
						}

						if subject.IsStrictSubset(nil) {
							t.Fatal("non-empty set should not be a strict subset of nil")
						}
					}

					equivalent := newSet()

					for _, m := range expected {
						if subject.IsEqual(equivalent) {
							t.Fatal("set should not be equal to its subset")
						}

						if !subject.IsSuperset(equivalent) {
							t.Fatal("set should be a superset of its subset")
						}

						if subject.IsSubset(equivalent) {
							t.Fatal("set should not be a subset of its own subset")
						}

						if !subject.IsStrictSuperset(equivalent) {
							t.Fatal("set should be a strict superset of its subset")
						}

						if subject.IsStrictSubset(equivalent) {
							t.Fatal("set should not be a strict subset of its subset")
						}

						equivalent.Add(m)
					}

					if !subject.IsEqual(equivalent) {
						t.Fatal("expected the set to be equal to its equivalent")
					}

					if !subject.IsSuperset(equivalent) {
						t.Fatal("expected the set to be a (non-strict) superset of its equivalent")
					}

					if !subject.IsSubset(equivalent) {
						t.Fatal("expected the set to be a (non-strict) subset of its equivalent")
					}

					if subject.IsStrictSuperset(equivalent) {
						t.Fatal("did not expect the set to be a strict superset of its equivalent")
					}

					if subject.IsStrictSubset(equivalent) {
						t.Fatal("did not expect the set to be a strict subset of its equivalent")
					}

					if n := subject.Len(); n != 0 {
						disjoint := newSet()

						for range n {
							m := drawNonMember(t)
							disjoint.Add(m)
						}

						if subject.IsEqual(disjoint) {
							t.Fatal("did not expect the set to be equal to a disjoint set")
						}

						if subject.IsSuperset(disjoint) {
							t.Fatal("did not expect the set to be a superset of a disjoint set")
						}

						if subject.IsSubset(disjoint) {
							t.Fatal("did not expect the set to be a subset of a disjoint set")
						}

						if subject.IsStrictSuperset(disjoint) {
							t.Fatal("did not expect the set to be a strict superset of a disjoint set")
						}

						if subject.IsStrictSubset(disjoint) {
							t.Fatal("did not expect the set to be a strict subset of a disjoint set")
						}
					}
				},
			},
		)
	})
}

func testOrderedSet[
	S orderedContract[T, I],
	T, I any,
](
	t *testing.T,
	newSet func(...T) S,
	fromSeq func(iter.Seq[T]) S,
	fromKeys func(iter.Seq2[T, any]) S,
	fromValues func(iter.Seq2[any, T]) S,
	cmp func(T, T) int,
	pred func(T) bool,
	gen *rapid.Generator[T],
) {
	t.Helper()

	testSet(
		t,
		newSet,
		fromSeq,
		fromKeys,
		fromValues,
		func(x, y T) bool { return cmp(x, y) == 0 },
		pred,
		gen,
	)

	t.Run("members are iterated in order", func(t *testing.T) {
		t.Parallel()

		rapid.Check(t, func(t *rapid.T) {
			subject := newSet()

			n := rapid.
				IntRange(0, 10).
				Draw(t, "number of members")

			for range n {
				m := gen.Draw(t, "member")
				subject.Add(m)
			}

			var prev *T
			for m := range subject.All() {
				if prev != nil {
					if cmp(m, *prev) <= 0 {
						t.Fatalf("members are not in order: %#v <= %#v", m, prev)
					}
				}
				prev = &m
			}

			prev = nil
			for m := range subject.Reverse() {
				if prev != nil {
					if cmp(m, *prev) >= 0 {
						t.Fatalf("members are not in reverse order: %#v >= %#v", m, prev)
					}
				}
				prev = &m
			}
		})
	})
}
