const DEFAULT_CATEGORIES = ["General", "Discovery", "Usability", "Concept Test"];
const categorySelect = document.getElementById("categorySelect");
const newCategory = document.getElementById("newCategory");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const addSectionBtn = document.getElementById("addSectionBtn");
const sectionsContainer = document.getElementById("sections");
const sectionTemplate = document.getElementById("sectionTemplate");
const saveBtn = document.getElementById("saveBtn");
const searchInput = document.getElementById("searchInput");
const searchDropdown = document.getElementById("searchDropdown");
const libraryList = document.getElementById("libraryList");
const toggleLibraryBtn = document.getElementById("toggleLibraryBtn");
const libraryModal = document.getElementById("libraryModal");
const closeLibraryBtn = document.getElementById("closeLibraryBtn");
const imageModal = document.getElementById("imageModal");
const imageUrlInput = document.getElementById("imageUrlInput");
const imageAltInput = document.getElementById("imageAltInput");
const insertImageBtn = document.getElementById("insertImageBtn");
const cancelImageBtn = document.getElementById("cancelImageBtn");
const linkModal = document.getElementById("linkModal");
const linkTextInput = document.getElementById("linkTextInput");
const linkUrlInput = document.getElementById("linkUrlInput");
const insertLinkBtn = document.getElementById("insertLinkBtn");
const cancelLinkBtn = document.getElementById("cancelLinkBtn");

let categories = loadCategories();
let recentFiles = [];
let currentFileRelPath = null;
let currentFileCategory = null;
let pendingImageEditor = null;
let pendingLinkEditor = null;

function loadCategories() {
  const raw = localStorage.getItem("uxr-categories");
  if (!raw) return DEFAULT_CATEGORIES.slice();
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_CATEGORIES.slice();
  } catch (err) {
    return DEFAULT_CATEGORIES.slice();
  }
}

function saveCategories() {
  localStorage.setItem("uxr-categories", JSON.stringify(categories));
}

function renderCategories() {
  categorySelect.innerHTML = "";
  categories.forEach((cat) => {
    const option = document.createElement("option");
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
}

function addCategory() {
  const value = newCategory.value.trim();
  if (!value) return;
  if (!categories.includes(value)) {
    categories.push(value);
    saveCategories();
    renderCategories();
  }
  categorySelect.value = value;
  newCategory.value = "";
}

function addSection(title = "") {
  const clone = sectionTemplate.content.cloneNode(true);
  const section = clone.querySelector(".section");
  const titleInput = clone.querySelector(".section-title");
  const toolbar = clone.querySelector(".toolbar");
  const editor = clone.querySelector(".editor");
  const removeBtn = clone.querySelector(".remove-section");

  titleInput.value = title;

  toolbar.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const cmd = button.dataset.cmd;
    if (!cmd) return;
    editor.focus();
    if (cmd === "insertImage") {
      pendingImageEditor = editor;
      openImageModal();
      return;
    }
    if (cmd === "insertLink") {
      pendingLinkEditor = editor;
      openLinkModal();
      return;
    }
    document.execCommand(cmd, false, null);
  });

  removeBtn.addEventListener("click", () => {
    section.remove();
  });

  sectionsContainer.appendChild(clone);
}

function clearSections() {
  sectionsContainer.innerHTML = "";
}

function insertTextAtCursor(editor, text) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) {
    editor.textContent += text;
    return;
  }

  const range = selection.getRangeAt(0);
  range.deleteContents();
  const node = document.createTextNode(text);
  range.insertNode(node);
  range.setStartAfter(node);
  range.setEndAfter(node);
  selection.removeAllRanges();
  selection.addRange(range);
}

function openImageModal() {
  imageUrlInput.value = "";
  imageAltInput.value = "";
  imageModal.classList.add("open");
  imageModal.setAttribute("aria-hidden", "false");
  setTimeout(() => imageUrlInput.focus(), 0);
}

function closeImageModal() {
  imageModal.classList.remove("open");
  imageModal.setAttribute("aria-hidden", "true");
  pendingImageEditor = null;
}

function openLinkModal() {
  linkTextInput.value = "";
  linkUrlInput.value = "";
  linkModal.classList.add("open");
  linkModal.setAttribute("aria-hidden", "false");
  setTimeout(() => linkTextInput.focus(), 0);
}

function closeLinkModal() {
  linkModal.classList.remove("open");
  linkModal.setAttribute("aria-hidden", "true");
  pendingLinkEditor = null;
}

function getSections() {
  return [...sectionsContainer.querySelectorAll(".section")].map((section) => {
    return {
      title: section.querySelector(".section-title").value.trim(),
      html: section.querySelector(".editor").innerHTML.trim(),
    };
  });
}

function toMarkdown({ title, author, summary, category, sections }) {
  const date = new Date();
  const dateString = date.toISOString().slice(0, 10);
  const frontMatter = [
    "---",
    `title: "${escapeYaml(title || "Untitled Report")}"`,
    `date: ${dateString}`,
    `category: "${escapeYaml(category)}"`,
    author ? `author: "${escapeYaml(author)}"` : null,
    "---",
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const body = [
    `# ${title || "Untitled Report"}`,
    summary ? `\n${summary}\n` : "",
    sections
      .map((section) => {
        const heading = section.title || "Section";
        const content = htmlToMarkdown(section.html || "");
        return `## ${heading}\n${content}`.trim();
      })
      .join("\n\n"),
  ]
    .filter(Boolean)
    .join("\n\n");

  return `${frontMatter}\n${body}\n`;
}

function escapeYaml(value) {
  return value.replace(/"/g, "\\\"");
}

function markdownToHtml(markdown) {
  if (!markdown) return "";
  let html = markdown;

  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "<img alt=\"$1\" src=\"$2\" />");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/~~([^~]+)~~/g, "<s>$1</s>");

  const lines = html.split("\n");
  const output = [];
  let inUl = false;
  let inOl = false;

  function closeLists() {
    if (inUl) {
      output.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      output.push("</ol>");
      inOl = false;
    }
  }

  lines.forEach((line) => {
    const trimmed = line.trim();
    const ulMatch = /^-\s+(.+)/.exec(trimmed);
    const olMatch = /^\d+\.\s+(.+)/.exec(trimmed);

    if (ulMatch) {
      if (!inUl) {
        closeLists();
        output.push("<ul>");
        inUl = true;
      }
      output.push(`<li>${ulMatch[1]}</li>`);
      return;
    }

    if (olMatch) {
      if (!inOl) {
        closeLists();
        output.push("<ol>");
        inOl = true;
      }
      output.push(`<li>${olMatch[1]}</li>`);
      return;
    }

    closeLists();
    if (trimmed) {
      output.push(`<p>${trimmed}</p>`);
    }
  });

  closeLists();
  return output.join("");
}

function htmlToMarkdown(html) {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstChild;
  const lines = [];

  function walk(node, listDepth = 0) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return "";
    }

    const tag = node.tagName.toLowerCase();

    if (tag === "br") {
      return "\n";
    }

    if (tag === "img") {
      const alt = node.getAttribute("alt") || "";
      const src = node.getAttribute("src") || "";
      return src ? `![${alt}](${src})` : "";
    }

    if (tag === "strong" || tag === "b") {
      return `**${collect(node)}**`;
    }

    if (tag === "em" || tag === "i") {
      return `*${collect(node)}*`;
    }

    if (tag === "s" || tag === "strike" || tag === "del") {
      return `~~${collect(node)}~~`;
    }

    if (tag === "ul" || tag === "ol") {
      const isOrdered = tag === "ol";
      const items = [];
      let index = 1;
      node.childNodes.forEach((child) => {
        if (child.tagName && child.tagName.toLowerCase() === "li") {
          const prefix = isOrdered ? `${index}. ` : "- ";
          const content = walk(child, listDepth + 1).trim();
          const indent = "  ".repeat(listDepth);
          items.push(`${indent}${prefix}${content}`);
          index += 1;
        }
      });
      return items.join("\n");
    }

    if (tag === "li") {
      return collect(node);
    }

    if (tag === "p" || tag === "div") {
      const text = collect(node).trim();
      return text ? `\n${text}\n` : "";
    }

    return collect(node);
  }

  function collect(element) {
    let result = "";
    element.childNodes.forEach((child) => {
      result += walk(child);
    });
    return result;
  }

  root.childNodes.forEach((node) => {
    const chunk = walk(node).trim();
    if (chunk) lines.push(chunk);
  });

  return lines.join("\n\n").replace(/\n{3,}/g, "\n\n");
}

async function refreshRecentFiles() {
  if (!window.electronAPI) {
    renderSearchMessage("Electron API unavailable.");
    return;
  }
  const collected = await window.electronAPI.listReports();
  recentFiles = collected || [];
  renderSearchDropdown(recentFiles);
  renderLibrary(recentFiles);
}

function renderSearchDropdown(list) {
  searchDropdown.innerHTML = "";
  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "search-item";
    div.innerHTML = `<strong>${item.name}</strong><span>${item.category}</span>`;
    div.addEventListener("mousedown", (event) => {
      event.preventDefault();
      loadReport(item);
    });
    searchDropdown.appendChild(div);
  });
  if (document.activeElement === searchInput) {
    searchDropdown.classList.add("open");
  }
}

function filterRecentFiles(query) {
  const q = query.trim().toLowerCase();
  if (!q) {
    if (!recentFiles.length) {
      renderSearchMessage("No reports found yet in your base folder.");
      return;
    }
    renderSearchDropdown(recentFiles);
    return;
  }
  const filtered = recentFiles.filter((item) => {
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });
  if (!filtered.length) {
    renderSearchMessage("No matching reports.");
    return;
  }
  renderSearchDropdown(filtered);
}

function renderSearchMessage(message) {
  searchDropdown.innerHTML = "";
  const div = document.createElement("div");
  div.className = "search-item";
  div.textContent = message;
  searchDropdown.appendChild(div);
  if (document.activeElement === searchInput) {
    searchDropdown.classList.add("open");
  }
}

function renderLibrary(items) {
  libraryList.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("div");
    empty.className = "hint";
    empty.textContent = "No reports yet.";
    libraryList.appendChild(empty);
    return;
  }

  const grouped = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  Object.keys(grouped)
    .sort((a, b) => a.localeCompare(b))
    .forEach((category) => {
      const section = document.createElement("div");
      section.className = "library-section";
      section.innerHTML = `<h3>${category}</h3>`;

      const list = document.createElement("div");
      list.className = "library-items";
      grouped[category].forEach((item) => {
        const row = document.createElement("div");
        row.className = "library-item";
        row.innerHTML = `<span>${item.name}</span>`;
        row.addEventListener("click", () => loadReport(item));

        const actions = document.createElement("div");
        actions.className = "library-actions";

        const download = document.createElement("button");
        download.className = "ghost download-btn";
        download.textContent = "↓";
        download.addEventListener("click", async (event) => {
          event.stopPropagation();
          await downloadReport(item);
        });

        const remove = document.createElement("button");
        remove.className = "ghost download-btn";
        remove.textContent = "🗑";
        remove.addEventListener("click", async (event) => {
          event.stopPropagation();
          const ok = window.confirm(`Delete ${item.name}? This cannot be undone.`);
          if (!ok) return;
          await deleteReport(item);
        });

        actions.appendChild(download);
        actions.appendChild(remove);
        row.appendChild(actions);
        list.appendChild(row);
      });

      section.appendChild(list);
      libraryList.appendChild(section);
    });
}

function parseReportMarkdown(markdown) {
  let frontMatter = {};
  let body = markdown;
  if (markdown.startsWith("---")) {
    const endIndex = markdown.indexOf("\n---", 3);
    if (endIndex !== -1) {
      const raw = markdown.slice(3, endIndex).trim().split("\n");
      raw.forEach((line) => {
        const [key, ...rest] = line.split(":");
        if (!key || !rest.length) return;
        frontMatter[key.trim()] = rest.join(":").trim().replace(/^\"|\"$/g, "");
      });
      body = markdown.slice(endIndex + 4).trim();
    }
  }

  const lines = body.split("\n");
  let title = "";
  let summaryLines = [];
  const sections = [];
  let currentSection = null;

  lines.forEach((line) => {
    if (line.startsWith("# ")) {
      title = line.replace(/^# /, "").trim();
      return;
    }
    if (line.startsWith("## ")) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = { title: line.replace(/^## /, "").trim(), content: [] };
      return;
    }
    if (currentSection) {
      currentSection.content.push(line);
    } else if (line.trim()) {
      summaryLines.push(line);
    }
  });

  if (currentSection) {
    sections.push(currentSection);
  }

  return {
    title: frontMatter.title || title,
    author: frontMatter.author || "",
    category: frontMatter.category || "",
    summary: summaryLines.join("\n").trim(),
    sections: sections.map((section) => ({
      title: section.title,
      html: markdownToHtml(section.content.join("\n").trim()),
    })),
  };
}

async function loadReport(item) {
  try {
    const markdown = await window.electronAPI.readReport(item.relPath);
    const report = parseReportMarkdown(markdown);

    document.getElementById("reportTitle").value = report.title || "";
    document.getElementById("author").value = report.author || "";
    document.getElementById("summary").value = report.summary || "";

    if (report.category) {
      if (!categories.includes(report.category)) {
        categories.push(report.category);
        saveCategories();
        renderCategories();
      }
      categorySelect.value = report.category;
    } else {
      categorySelect.value = item.category;
    }

    clearSections();
    report.sections.forEach((section) => addSection(section.title));
    const editors = [...sectionsContainer.querySelectorAll(".editor")];
    report.sections.forEach((section, index) => {
      if (editors[index]) {
        editors[index].innerHTML = section.html;
      }
    });

    currentFileRelPath = item.relPath;
    currentFileCategory = item.category;
    searchDropdown.classList.remove("open");
  } catch (err) {
    console.error(err);
    alert("Unable to load that report.");
  }
}

async function downloadReport(item) {
  if (!window.electronAPI) return;
  try {
    const result = await window.electronAPI.downloadReport({
      relPath: item.relPath,
      suggestedName: item.name,
    });
    if (result && result.canceled) return;
    if (result && result.ok) return;
    const message = result && result.error ? result.error : "Unable to download report.";
    alert(message);
  } catch (err) {
    console.error(err);
    alert("Unable to download report.");
  }
}

async function deleteReport(item) {
  if (!window.electronAPI) return;
  try {
    const result = await window.electronAPI.deleteReport({ relPath: item.relPath });
    if (result && result.ok) {
      if (currentFileRelPath === item.relPath) {
        currentFileRelPath = null;
        currentFileCategory = null;
      }
      await refreshRecentFiles();
      return;
    }
    const message = result && result.error ? result.error : "Unable to delete report.";
    alert(message);
  } catch (err) {
    console.error(err);
    alert("Unable to delete report.");
  }
}

async function saveMarkdownFile() {
  const title = document.getElementById("reportTitle").value.trim();
  const author = document.getElementById("author").value.trim();
  const summary = document.getElementById("summary").value.trim();
  const category = categorySelect.value;
  const sections = getSections();
  const markdown = toMarkdown({ title, author, summary, category, sections });

  if (!window.electronAPI) {
    alert("Electron API unavailable.");
    return;
  }

  try {
    const safeTitle = (title || "ux-report").replace(/[^a-z0-9\\-]+/gi, "-").replace(/-+/g, "-");
    const fileName = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`;
    const relPath = await window.electronAPI.writeReport({
      category,
      filename: fileName,
      content: markdown,
      currentRelPath: currentFileRelPath && currentFileCategory === category ? currentFileRelPath : null,
    });
    currentFileRelPath = relPath;
    currentFileCategory = category;
    await refreshRecentFiles();
    alert(`Saved to ${relPath}`);
  } catch (err) {
    console.error(err);
    alert("Unable to save report.");
  }
}

addCategoryBtn.addEventListener("click", addCategory);
newCategory.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCategory();
  }
});

addSectionBtn.addEventListener("click", () => addSection(""));

saveBtn.addEventListener("click", saveMarkdownFile);
searchInput.addEventListener("input", () => filterRecentFiles(searchInput.value));
searchInput.addEventListener("focus", () => filterRecentFiles(searchInput.value));
searchInput.addEventListener("blur", () => {
  setTimeout(() => {
    if (document.activeElement !== searchInput) {
      searchDropdown.classList.remove("open");
    }
  }, 0);
});
toggleLibraryBtn.addEventListener("click", () => {
  libraryModal.classList.add("open");
  libraryModal.setAttribute("aria-hidden", "false");
});
closeLibraryBtn.addEventListener("click", () => {
  libraryModal.classList.remove("open");
  libraryModal.setAttribute("aria-hidden", "true");
});
libraryModal.addEventListener("click", (event) => {
  if (event.target === libraryModal) {
    libraryModal.classList.remove("open");
    libraryModal.setAttribute("aria-hidden", "true");
  }
});
document.addEventListener("click", (event) => {
  if (!searchDropdown.contains(event.target) && event.target !== searchInput) {
    searchDropdown.classList.remove("open");
  }
});

insertImageBtn.addEventListener("click", () => {
  const url = imageUrlInput.value.trim();
  if (!url) {
    imageUrlInput.focus();
    return;
  }
  const alt = imageAltInput.value.trim();
  const markdown = `![${alt}](${url})`;
  if (pendingImageEditor) {
    pendingImageEditor.focus();
    insertTextAtCursor(pendingImageEditor, markdown);
  }
  closeImageModal();
});

cancelImageBtn.addEventListener("click", closeImageModal);
imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) {
    closeImageModal();
  }
});

insertLinkBtn.addEventListener("click", () => {
  const text = linkTextInput.value.trim();
  const url = linkUrlInput.value.trim();
  if (!url) {
    linkUrlInput.focus();
    return;
  }
  const label = text || url;
  const markdown = `[${label}](${url})`;
  if (pendingLinkEditor) {
    pendingLinkEditor.focus();
    insertTextAtCursor(pendingLinkEditor, markdown);
  }
  closeLinkModal();
});

cancelLinkBtn.addEventListener("click", closeLinkModal);
linkModal.addEventListener("click", (event) => {
  if (event.target === linkModal) {
    closeLinkModal();
  }
});

renderCategories();
addSection("Background");
addSection("Objectives");
addSection("Methodology");
addSection("Findings");
addSection("Recommendations");

window.addEventListener("load", async () => {
  try {
    await refreshRecentFiles();
  } catch (err) {
    console.error(err);
  }
});
