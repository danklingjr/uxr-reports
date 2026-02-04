const DEFAULT_CATEGORIES = ["General", "Discovery", "Usability", "Concept Test"];
const categorySelect = document.getElementById("categorySelect");
const newCategory = document.getElementById("newCategory");
const addCategoryBtn = document.getElementById("addCategoryBtn");
const addSectionBtn = document.getElementById("addSectionBtn");
const sectionsContainer = document.getElementById("sections");
const sectionTemplate = document.getElementById("sectionTemplate");
const saveBtn = document.getElementById("saveBtn");
const setBaseBtn = document.getElementById("setBaseBtn");

let baseDirectoryHandle = null;
let categories = loadCategories();

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
      const url = window.prompt("Image URL (CDN link):");
      if (!url) return;
      const alt = window.prompt("Alt text (optional):") || "";
      const markdown = `![${alt}](${url})`;
      document.execCommand("insertText", false, markdown);
      return;
    }
    document.execCommand(cmd, false, null);
  });

  removeBtn.addEventListener("click", () => {
    section.remove();
  });

  sectionsContainer.appendChild(clone);
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

async function pickBaseDirectory() {
  if (!window.showDirectoryPicker) {
    alert("Your browser does not support folder saving. Use Save Markdown to download instead.");
    return;
  }
  baseDirectoryHandle = await window.showDirectoryPicker();
}

async function ensureCategoryFolder(category) {
  if (!baseDirectoryHandle) {
    await pickBaseDirectory();
  }
  if (!baseDirectoryHandle) return null;
  return await baseDirectoryHandle.getDirectoryHandle(category, { create: true });
}

async function saveMarkdownFile() {
  const title = document.getElementById("reportTitle").value.trim();
  const author = document.getElementById("author").value.trim();
  const summary = document.getElementById("summary").value.trim();
  const category = categorySelect.value;
  const sections = getSections();
  const markdown = toMarkdown({ title, author, summary, category, sections });

  if (window.showDirectoryPicker) {
    try {
      const categoryDir = await ensureCategoryFolder(category);
      if (!categoryDir) return;
      const safeTitle = (title || "ux-report").replace(/[^a-z0-9\-]+/gi, "-").replace(/-+/g, "-");
      const fileName = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`;
      const fileHandle = await categoryDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(markdown);
      await writable.close();
      alert(`Saved to ${category}/${fileName}`);
      return;
    } catch (err) {
      console.error(err);
      alert("Unable to save to folder. Falling back to download.");
    }
  }

  const blob = new Blob([markdown], { type: "text/markdown" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${(title || "ux-report").replace(/\s+/g, "-")}.md`;
  link.click();
  URL.revokeObjectURL(link.href);
}

addCategoryBtn.addEventListener("click", addCategory);
newCategory.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    addCategory();
  }
});

addSectionBtn.addEventListener("click", () => addSection(""));

setBaseBtn.addEventListener("click", async () => {
  try {
    await pickBaseDirectory();
  } catch (err) {
    console.error(err);
  }
});

saveBtn.addEventListener("click", saveMarkdownFile);

renderCategories();
addSection("Background");
addSection("Objectives");
addSection("Methodology");
addSection("Findings");
addSection("Recommendations");
