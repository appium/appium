current_version = $$(git branch 2>/dev/null | sed -e '/^[^*]/d' -e 's/* \(.*\)/\1/')
npm_bin= $$(npm bin)

all: test
clean:
	@rm -rf ./node_modules
install:
	@npm install
pull:
	@git pull origin ${current_version}
push:
	@git push origin ${current_version}
.PHONY: test
