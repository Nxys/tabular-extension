# Publish to GitHub

## Prerequisites

- `build/tabular-extension-v0.1.0.zip` already exists
- `GITHUB_TOKEN` or `GH_TOKEN` has repository write access

## Command

```bash
GITHUB_TOKEN=YOUR_TOKEN node build/github-publish.cjs
```

## What It Does

- Updates repository About `description`
- Updates repository `topics`
- Sets repository `website` to the `v0.1.0` release URL
- Creates the `v0.1.0` GitHub release if it does not exist
- Uploads `tabular-extension-v0.1.0.zip` to the release assets
