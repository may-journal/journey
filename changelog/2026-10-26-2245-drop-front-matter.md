### 2026.10.26.2245

- Docs: `fitness strip-front-matter` deletes `fitnessFunctions` and `relatedConfigurations` from every Markdown file and drops each emptied block.
- Docs: other front matter keys, such as an issue template's `name` and `labels`, stay as they were.
- Docs: no check reads either key, so no new file needs them.
