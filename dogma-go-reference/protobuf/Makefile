# The TypeScript sources live alongside the .proto files in each package
# directory, rather than in "src".
JS_SOURCE_FILES += $(shell PATH="$(PATH)" git-find . -path '*/*' -name '*.ts' -not -name '*.test.ts')

-include .makefiles/Makefile
-include .makefiles/pkg/protobuf/v2/Makefile
-include .makefiles/pkg/protobuf/v2/with-primo.mk
-include .makefiles/pkg/go/v1/Makefile
-include .makefiles/pkg/js/v1/Makefile
-include .makefiles/pkg/js/v1/with-pnpm.mk
-include .makefiles/pkg/js/v1/with-tsc.mk
-include .makefiles/pkg/js/v1/with-arethetypeswrong.mk
-include .makefiles/pkg/js/v1/with-publint.mk
-include .makefiles/pkg/vscode/v1/Makefile
-include .makefiles/pkg/changelog/v2/Makefile

.makefiles/%:
	@curl -sfL https://makefiles.dev/v1 | bash /dev/stdin "$@"
