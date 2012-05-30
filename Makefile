REPORTER = spec

test:
	@rm -rf lib-cov
	@jscoverage lib lib-cov
	@NODE_ENV=test ./node_modules/.bin/mocha test/*-test.js test/*/*-test.js $(OPT) --reporter $(REPORTER)

test-bail:
	$(MAKE) test OPT=--bail

test-cov:
	@APISERVER_COV=1 $(MAKE) test REPORTER=html-cov > coverage.html
	@open -g coverage.html

.PHONY: test test-bail test-cov