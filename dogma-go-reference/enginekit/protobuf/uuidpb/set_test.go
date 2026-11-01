package uuidpb_test

import (
	"maps"
	"slices"
	"testing"

	"github.com/dogmatiq/enginekit/protobuf/uuidpb"
	. "github.com/dogmatiq/enginekit/protobuf/uuidpb"
	"github.com/dogmatiq/enginekit/x/xrapid"
	"pgregory.net/rapid"
)

func TestSet(t *testing.T) {
	t.Parallel()

	rapid.Check(t, func(t *rapid.T) {
		var (
			subject  *Set
			expected = map[string]struct{}{}
		)

		t.Repeat(
			map[string]func(*rapid.T){
				"add a new member": func(t *rapid.T) {
					if subject == nil {
						subject = &Set{}
					}

					v := uuidpb.Generate()

					subject.Add(v)
					expected[v.AsString()] = struct{}{}
				},
				"add an existing member": func(t *rapid.T) {
					v := xrapid.SampledFromSeq(maps.Keys(expected)).Draw(t, "existing member")

					subject.Add(uuidpb.MustParse(v))
				},
				"delete a member": func(t *rapid.T) {
					v := xrapid.SampledFromSeq(maps.Keys(expected)).Draw(t, "existing member")
					subject.Delete(uuidpb.MustParse(v))
					delete(expected, v)
				},
				"delete a non-member": func(t *rapid.T) {
					v := uuidpb.Generate()
					subject.Delete(v)
				},
				"clear the set": func(t *rapid.T) {
					subject.Clear()
					clear(expected)
				},
				"diff with intersecting set": func(t *rapid.T) {
					v := xrapid.SampledFromSeq(maps.Keys(expected)).Draw(t, "existing member")
					other := uuidpb.NewSet(uuidpb.MustParse(v))
					subject = subject.Diff(other)
					delete(expected, v)
				},
				"diff with disjoint set": func(t *rapid.T) {
					other := uuidpb.NewSet(uuidpb.Generate())
					subject = subject.Diff(other)
				},
				"diff with nil set": func(t *rapid.T) {
					subject = subject.Diff(nil)
				},
				"": func(t *rapid.T) {
					if got, want := subject.Len(), len(expected); got != want {
						t.Fatalf("unexpected length: got %d, want %d", got, want)
					}

					if got, want := subject.IsEmpty(), len(expected) == 0; got != want {
						t.Fatalf("unexpected IsEmpty() result: got %v, want %v", got, want)
					}

					want := slices.Sorted(maps.Keys(expected))

					// check Has()
					{
						if subject.Has(uuidpb.Generate()) {
							t.Fatalf("did not expect random value to be in the set")
						}

						for k := range expected {
							if !subject.Has(uuidpb.MustParse(k)) {
								t.Fatalf("expected %q to be in the set", k)
							}
						}
					}

					// check All()
					{
						var got []string

						for v := range subject.All() {
							got = append(got, v.AsString())

							_, ok := expected[v.AsString()]
							if !ok {
								t.Fatalf("set contains an unexpected member: %q", v)
							}
						}

						slices.Sort(got)
						if !slices.Equal(got, want) {
							t.Fatalf("unexpected keys: got %v, want %v", got, want)
						}

						// partial iteration (coverage)
						for range subject.All() {
							break
						}
					}

					// check Clone()
					{
						clone := subject.Clone()

						if clone.Len() != subject.Len() {
							t.Fatalf("unexpected length of cloned set: got %d, want %d", clone.Len(), subject.Len())
						}

						for v := range expected {
							if !clone.Has(uuidpb.MustParse(v)) {
								t.Fatalf("expected %q to be in the cloned set", v)
							}
						}

						if clone != nil {
							v := uuidpb.Generate()
							clone.Add(v)

							if subject.Has(v) {
								t.Fatalf("adding to cloned set modified the original set")
							}
						}
					}

					// check IsEqual()
					{
						if !subject.IsEqual(subject) {
							t.Fatalf("expected set to be equal to itself")
						}

						clone := subject.Clone()

						if !clone.IsEqual(subject) {
							t.Fatalf("expected cloned set to be equal to the original set")
						}

						if subject.IsEmpty() {
							if !subject.IsEqual(nil) {
								t.Fatalf("expected empty set to be equal to nil")
							}

							if !(*Set)(nil).IsEqual(subject) {
								t.Fatalf("expected nil to be equal to empty set")
							}
						}
					}

					// check Delta()
					{
						added := uuidpb.Generate()
						var shared *uuidpb.UUID

						other := uuidpb.NewSet(added)

						if !subject.IsEmpty() {
							v := xrapid.SampledFromSeq(maps.Keys(expected)).Draw(t, "common member")
							shared = uuidpb.MustParse(v)
							other.Add(shared)
						}

						add, remove := subject.Delta(other)

						if !add.Has(added) {
							t.Fatalf("expected %q to be in the add set", added)
						}

						if shared != nil {
							if add.Has(shared) {
								t.Fatalf("did not expect %q to be in the add set", shared)
							}

							if remove.Has(shared) {
								t.Fatalf("did not expect %q to be in the remove set", shared)
							}
						}

						for k := range expected {
							if k == shared.AsString() {
								continue
							}
							if !remove.Has(uuidpb.MustParse(k)) {
								t.Fatalf("expected %q to be in the remove set", k)
							}
						}
					}
				},
			},
		)
	})

	t.Run("func String()", func(t *testing.T) {
		v1 := MustParse("e9ba3d40-273f-445b-a2b5-0498beb6953c")
		v2 := MustParse("015ab018-80aa-4c31-982c-48e19a4d5a49")

		subject := uuidpb.NewSet(v1, v2)
		got := subject.String()
		want := `{015ab018-80aa-4c31-982c-48e19a4d5a49, e9ba3d40-273f-445b-a2b5-0498beb6953c}`

		if got != want {
			t.Fatalf("unexpected String() output: got %q, want %q", got, want)
		}
	})

	t.Run("func GoString()", func(t *testing.T) {
		v1 := MustParse("e9ba3d40-273f-445b-a2b5-0498beb6953c")
		v2 := MustParse("015ab018-80aa-4c31-982c-48e19a4d5a49")

		subject := uuidpb.NewSet(v1, v2)
		got := subject.GoString()
		want := `uuidpb.NewSet(uuidpb.MustParse("015ab018-80aa-4c31-982c-48e19a4d5a49"), uuidpb.MustParse("e9ba3d40-273f-445b-a2b5-0498beb6953c"))`

		if got != want {
			t.Fatalf("unexpected GoString() output: got %q, want %q", got, want)
		}
	})
}
