module github.com/dogmatiq/enginekit

go 1.27

require (
	github.com/dogmatiq/dogma v0.25.0
	github.com/dogmatiq/primo v0.4.4
	github.com/dogmatiq/protobuf v0.7.0
	github.com/dogmatiq/spruce v0.2.4
	github.com/google/go-cmp v0.7.0
	go.opentelemetry.io/otel v1.47.0
	go.opentelemetry.io/otel/log v1.47.0
	go.opentelemetry.io/otel/metric v1.47.0
	go.opentelemetry.io/otel/trace v1.47.0
	golang.org/x/exp v0.0.0-20251125195548-87e1e737ad39
	google.golang.org/grpc v1.85.0
	google.golang.org/protobuf v1.36.12
	pgregory.net/rapid v1.3.0
)

require (
	github.com/cespare/xxhash/v2 v2.3.0 // indirect
	github.com/dave/jennifer v1.7.1 // indirect
	golang.org/x/net v0.60.0 // indirect
	golang.org/x/sys v0.48.0 // indirect
	golang.org/x/text v0.42.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20260817212433-ac3dfec99bb1 // indirect
	google.golang.org/grpc/cmd/protoc-gen-go-grpc v1.6.2 // indirect
)

tool (
	github.com/dogmatiq/primo/cmd/protoc-gen-go-primo
	google.golang.org/grpc/cmd/protoc-gen-go-grpc
	google.golang.org/protobuf/cmd/protoc-gen-go
)
