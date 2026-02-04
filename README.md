# UX Research Tool

A lightweight, local-first UX research tool that helps you write structured reports and save them as categorized Markdown files.

## What It Does

- Create repeatable sections with rich-text formatting.
- Format text as bold, italic, strikethrough, bulleted lists, and numbered lists.
- Save reports as Markdown with YAML front matter.
- Organize reports by category folders.

## Run Locally

1. Create a folder for uxr-tool in your Sites directory

2. Open a terminal and start a local server:

```bash
cd /Users/[user]/Sites/[directory-name]
python3 -m http.server 8000
```

3. Open the app in your browser:

- `http://localhost:8000`

> Note: Folder saving works best in Chrome or Edge (File System Access API).

## How To Use

1. Click **Set Base Folder** and choose your main directory for reports.
2. Choose a category (or add a new one).
3. Fill in the report title, author, and summary.
4. Add or edit sections as needed.
5. Click **Save Markdown**.

### Saved File Format

Reports are saved to:

```
<base folder>/<category>/<report-title>-YYYY-MM-DD.md
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

- Runs entirely in the browser.
- Uses the File System Access API when available.
- Falls back to file download if folder saving is unsupported.
