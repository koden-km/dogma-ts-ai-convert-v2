module github.com/dogmatiq/protobuf

go 1.26.0

require (
	github.com/dogmatiq/dapper v0.7.0
	github.com/google/go-cmp v0.7.0
	google.golang.org/grpc v1.85.0
	google.golang.org/protobuf v1.36.12
)

require (
	github.com/dave/jennifer v1.7.1 // indirect
	github.com/dogmatiq/jumble v0.1.0 // indirect
	github.com/dogmatiq/primo v0.4.4 // indirect
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
