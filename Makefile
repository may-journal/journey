# Targets are documented in README.md.

CHROME ?= $(HOME)/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing
OUT ?= dist

PORT ?= 8790

.PHONY: build serve test check counts check-page

build:
	node scripts/build.ts $(OUT)

serve: build
	python3 -m http.server $(PORT) --bind 0.0.0.0 --directory $(OUT)

test:
	npx vitest run --coverage

check:
	fitness

counts:
	node scripts/counts.ts $(ARGS)

check-page:
	CHROME="$(CHROME)" node scripts/check-page.ts out
