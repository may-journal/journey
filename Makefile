# Targets are documented in README.md.

CHROME ?= $(HOME)/Library/Caches/ms-playwright/chromium-1243/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing
PORT ?= 8790

.PHONY: serve test check check-page

serve:
	python3 -m http.server $(PORT)

test:
	npx vitest run --coverage

check:
	"$(HOME)/.local/share/may-journal/fitness/fitness-install" --version latest

check-page:
	CHROME="$(CHROME)" node scripts/check-page.js out
