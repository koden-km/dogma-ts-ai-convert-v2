package messaginggrpc_test

import (
	"testing"

	"github.com/dogmatiq/protobuf/messaginggrpc"
	"github.com/dogmatiq/protobuf/uuidpb"
	"google.golang.org/protobuf/types/known/emptypb"
)

func TestMessageFilter_Validate(t *testing.T) {
	specific := func(ids ...*uuidpb.UUID) *messaginggrpc.MessageFilter {
		return messaginggrpc.NewMessageFilterBuilder().
			WithSpecific(messaginggrpc.NewMessageFilter_MessageTypesBuilder().WithIds(ids).Build()).Build()
	}
	for _, tc := range []struct {
		name   string
		filter *messaginggrpc.MessageFilter
		valid  bool
	}{
		{"missing filter", nil, false},
		{"missing selection", &messaginggrpc.MessageFilter{}, false},
		{"all message types", messaginggrpc.NewMessageFilterBuilder().WithAll(&emptypb.Empty{}).Build(), true},
		{"empty specific types", specific(), false},
		{"one specific type", specific(uuidpb.Generate()), true},
		{"several specific types", specific(uuidpb.Generate(), uuidpb.Generate()), true},
		{"missing type ID", specific(nil), false},
		{"invalid type ID", specific(uuidpb.MustParse("01890a5d-ac96-774b-bcce-b302099a8057")), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			err := tc.filter.Validate()
			if tc.valid && err != nil {
				t.Fatalf("valid filter rejected: %v", err)
			}
			if !tc.valid && err == nil {
				t.Fatal("invalid filter accepted")
			}
		})
	}
}
