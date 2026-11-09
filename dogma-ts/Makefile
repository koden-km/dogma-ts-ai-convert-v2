PROTOC_COMMAND ?= protoc
PROTO_JS_OPT ?= import_extension=js,erasable_syntax=true

-include .makefiles/Makefile
-include .makefiles/pkg/protobuf/v2/Makefile
-include .makefiles/pkg/js/v1/Makefile
-include .makefiles/pkg/js/v1/with-npm.mk
-include .makefiles/pkg/js/v1/with-tsc.mk

%_pb.ts: %.proto artifacts/link-dependencies.touch
	$(PROTOC_COMMAND) \
		--proto_path=. \
		--proto_path=github.com/dogmatiq/protobuf=node_modules/@dogmatiq/protobuf \
		--plugin=protoc-gen-es=node_modules/.bin/protoc-gen-es \
		--es_out=. \
		--es_opt=target=$(PROTO_JS_TARGET),$(PROTO_JS_OPT) \
		--es_opt=map_imports=github.com/dogmatiq/protobuf/:@dogmatiq/protobuf \
		$<
	$(MF_ROOT)/pkg/protobuf/v2/bin/revert-version-only-changes $@

.makefiles/%:
	@curl -sfL https://makefiles.dev/v1 | bash /dev/stdin "$@"
