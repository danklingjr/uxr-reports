# UX Research Tool

A lightweight, local-first UX research tool that helps you write structured reports and save them as categorized Markdown files.

## What It Does

- Create repeatable sections with rich-text formatting.
- Format text as bold, italic, strikethrough, bulleted lists, and numbered lists.
- Save reports as Markdown with YAML front matter.
- Organize reports by category folders.

## Run Locally

1. Install dependencies:

```bash
cd /Users/dkling/Sites/uxr-tool
npm install
```

2. Start the app:

```bash
npm start
```

This launches the Electron desktop app and reads/writes to the `reports/` folder in this project.

## Installable Mac App

1. Build an unsigned Mac app:

```bash
npm run dist:mac
```

2. Grab the `.dmg` from `dist/` and share it.

> On first launch, macOS Gatekeeper may block the app. Users can right-click the app and choose **Open** once to allow it.

## How To Use

1. Choose a category (or add a new one).
2. Fill in the report title, author, and summary.
3. Add or edit sections as needed.
4. Click **Save Markdown**.

### Saved File Format

Reports are saved to:

```
reports/<category>/<report-title>-YYYY-MM-DD.md
```

Each Markdown file includes front matter like:

```md
---
title: "Report Title"
date: 2026-02-04
category: "Category Name"
author: "Optional"
---
```

## Tech Notes

- Runs as a local Electron app.
- Reads and writes directly to the `reports/` folder in this repo.
