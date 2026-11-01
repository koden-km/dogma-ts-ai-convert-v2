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

func TestMap(t *testing.T) {
	t.Parallel()

	rapid.Check(t, func(t *rapid.T) {
		var (
			subject  *Map[int]
			expected = map[string]int{}
		)

		t.Repeat(
			map[string]func(*rapid.T){
				"add a new key": func(t *rapid.T) {
					if subject == nil {
						subject = &Map[int]{}
					}

					k := uuidpb.Generate()
					v := rapid.Int().Draw(t, "value")

					subject.Set(k, v)
					expected[k.AsString()] = v
				},
				"overwrite an existing key": func(t *rapid.T) {
					k := xrapid.SampledFromSeq(maps.Keys(expected)).Draw(t, "existing key")
					v := rapid.Int().Draw(t, "value")

					subject.Set(uuidpb.MustParse(k), v)
					expected[k] = v
				},
				"delete an existing key": func(t *rapid.T) {
					k := xrapid.SampledFromSeq(maps.Keys(expected)).Draw(t, "existing key")
					subject.Delete(uuidpb.MustParse(k))
					delete(expected, k)
				},
				"delete a key that is not in the map": func(t *rapid.T) {
					k := uuidpb.Generate()
					subject.Delete(k)
				},
				"clear the map": func(t *rapid.T) {
					subject.Clear()
					clear(expected)
				},
				"": func(t *rapid.T) {
					if subject.Len() != len(expected) {
						t.Fatalf("unexpected length: got %d, want %d", subject.Len(), len(expected))
					}

					if got, want := subject.IsEmpty(), len(expected) == 0; got != want {
						t.Fatalf("unexpected IsEmpty() result: got %v, want %v", got, want)
					}

					wantKeys := slices.Sorted(maps.Keys(expected))
					wantValues := slices.Sorted(maps.Values(expected))

					// check Get()
					{
						_, ok := subject.Get(uuidpb.Generate())
						if ok {
							t.Fatalf("did not expect random key to be in the map")
						}

						for k, v := range expected {
							x, ok := subject.Get(uuidpb.MustParse(k))
							if !ok {
								t.Fatalf("expected key %q to be in the map", k)
							}

							if x != v {
								t.Fatalf("unexpected value for key %q: got %d, want %d", k, x, v)
							}
						}
					}

					// check Has()
					{
						if subject.Has(uuidpb.Generate()) {
							t.Fatalf("did not expect random key to be in the map")
						}

						for k := range expected {
							if !subject.Has(uuidpb.MustParse(k)) {
								t.Fatalf("expected key %q to be in the map", k)
							}
						}
					}

					// check All()
					{
						var gotKeys []string

						for k, v := range subject.All() {
							gotKeys = append(gotKeys, k.AsString())

							x, ok := expected[k.AsString()]
							if !ok {
								t.Fatalf("map contains an unexpected key: %q", k)
							}

							if x != v {
								t.Fatalf("unexpected value for key %q: got %d, want %d", k, v, x)
							}
						}

						slices.Sort(gotKeys)
						if !slices.Equal(gotKeys, wantKeys) {
							t.Fatalf("unexpected keys: got %v, want %v", gotKeys, wantKeys)
						}

						// partial iteration (coverage)
						for range subject.All() {
							break
						}
					}

					// check Keys()
					{
						var gotKeys []string
						for k := range subject.Keys() {
							gotKeys = append(gotKeys, k.AsString())
						}
						slices.Sort(gotKeys)

						if !slices.Equal(gotKeys, wantKeys) {
							t.Fatalf("unexpected keys: got %v, want %v", gotKeys, wantKeys)
						}

						// partial iteration (coverage)
						for range subject.Keys() {
							break
						}
					}

					// check Values()
					{
						gotValues := slices.Sorted(subject.Values())

						if !slices.Equal(gotValues, wantValues) {
							t.Fatalf("unexpected values: got %v, want %v", gotValues, wantValues)
						}

						// partial iteration (coverage)
						for range subject.Values() {
							break
						}
					}

					// check Clone()
					{
						clone := subject.Clone()

						if clone.Len() != subject.Len() {
							t.Fatalf("unexpected length of cloned map: got %d, want %d", clone.Len(), subject.Len())
						}

						for k, v := range expected {
							x, ok := clone.Get(uuidpb.MustParse(k))
							if !ok {
								t.Fatalf("expected key %q to be in the cloned map", k)
							}

							if x != v {
								t.Fatalf("unexpected value for key %q in cloned map: got %d, want %d", k, x, v)
							}
						}

						if clone != nil {
							k := uuidpb.Generate()
							clone.Set(k, 42)

							if subject.Has(k) {
								t.Fatalf("adding to cloned map modified the original map")
							}
						}
					}
				},
			},
		)
	})
}
