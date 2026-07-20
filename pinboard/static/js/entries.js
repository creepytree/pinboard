/* pinboard - entry grid: tiles, drag reorder, description popover, add/edit dialog */

let entries = [];

const grid = document.getElementById("entry-grid");
const popover = document.getElementById("description-popover");

async function loadEntries() {
    entries = await api("/entries");
    renderEntries();
}

function entryTile(entry) {
    const tile = document.createElement("div");
    tile.className = "entry";
    tile.dataset.id = entry.id;

    const button = document.createElement("button");
    button.className = "entry-btn";
    button.title = entry.url;
    if (entry.image) {
        const img = document.createElement("img");
        img.src = entry.image;
        img.alt = entry.name;
        img.draggable = false;
        button.appendChild(img);
    } else {
        button.textContent = entry.name.charAt(0).toUpperCase();
    }
    button.addEventListener("click", () => {
        if (editMode) {
            openEntryDialog(entry);
            return;
        }
        button.classList.remove("clicked");
        void button.offsetWidth; // restart animation
        button.classList.add("clicked");
        setTimeout(() => window.open(entry.url, "_blank", "noopener"), 160);
    });
    tile.appendChild(button);

    const name = document.createElement("div");
    name.className = "entry-name";
    name.textContent = entry.name;
    tile.appendChild(name);

    // Description stays hidden unless explicitly opened via the info dot.
    if (entry.description) {
        const info = document.createElement("button");
        info.className = "entry-info";
        info.innerHTML = ICONS.eye;
        info.title = "Show description";
        info.addEventListener("click", (event) => {
            event.stopPropagation();
            // Second click on the same eye closes the popover again.
            if (!popover.hidden && popoverAnchor === info) {
                hidePopover();
                return;
            }
            showPopover(info, entry.description);
        });
        tile.appendChild(info);
    }

    const actions = document.createElement("div");
    actions.className = "entry-actions";
    const edit = document.createElement("button");
    edit.className = "entry-action";
    edit.innerHTML = ICONS.pencil;
    edit.title = "Edit";
    edit.addEventListener("click", () => openEntryDialog(entry));
    const remove = document.createElement("button");
    remove.className = "entry-action delete";
    remove.innerHTML = ICONS.x;
    remove.title = "Delete";
    remove.addEventListener("click", async () => {
        if (!await confirmDialog({ message: `Delete entry "${entry.name}"?`, confirmLabel: "delete" })) return;
        await api(`/entries/${entry.id}`, { method: "DELETE" });
        loadEntries();
    });
    actions.append(edit, remove);
    tile.appendChild(actions);

    // Drag reorder (edit mode only).
    tile.draggable = true;
    tile.addEventListener("dragstart", (event) => {
        if (!editMode) {
            event.preventDefault();
            return;
        }
        tile.classList.add("dragging");
    });
    tile.addEventListener("dragend", () => {
        tile.classList.remove("dragging");
        saveEntryOrder();
    });
    tile.addEventListener("dragover", (event) => {
        event.preventDefault();
        const dragging = grid.querySelector(".entry.dragging");
        if (!dragging || dragging === tile) return;
        const rect = tile.getBoundingClientRect();
        const before = event.clientX < rect.left + rect.width / 2;
        grid.insertBefore(dragging, before ? tile : tile.nextSibling);
    });

    return tile;
}

function renderEntries() {
    grid.innerHTML = "";
    if (!entries.length && !editMode) {
        const empty = document.createElement("div");
        empty.className = "grid-empty";
        empty.textContent = "No entries yet - use the pencil to start editing.";
        grid.appendChild(empty);
    }
    entries.forEach((entry) => grid.appendChild(entryTile(entry)));

    const add = document.createElement("div");
    add.className = "entry entry-add";
    const button = document.createElement("button");
    button.className = "entry-btn";
    button.innerHTML = ICONS.plus;
    button.title = "Add entry";
    button.addEventListener("click", () => openEntryDialog(null));
    add.appendChild(button);
    const label = document.createElement("div");
    label.className = "entry-name";
    label.textContent = "add";
    add.appendChild(label);
    grid.appendChild(add);
}

function saveEntryOrder() {
    const ids = [...grid.querySelectorAll(".entry[data-id]")].map((tile) => Number(tile.dataset.id));
    api("/entries/reorder", { method: "POST", body: JSON.stringify({ ids }) }).then(loadEntries);
}

/* ---------- description popover ---------- */

let popoverAnchor = null;

function showPopover(anchor, text) {
    popoverAnchor = anchor;
    popover.textContent = text;
    popover.hidden = false;
    // Restart the pop-in animation when jumping between anchors.
    popover.style.animation = "none";
    void popover.offsetWidth;
    popover.style.animation = "";
    const rect = anchor.getBoundingClientRect();
    popover.style.left = `${Math.min(rect.left, window.innerWidth - popover.offsetWidth - 12)}px`;
    popover.style.top = `${rect.bottom + 8}px`;
}

function hidePopover() {
    popover.hidden = true;
    popoverAnchor = null;
}

document.addEventListener("click", (event) => {
    if (!popover.hidden && !event.target.closest(".entry-info")) hidePopover();
});

/* ---------- entry dialog ---------- */

const dialog = document.getElementById("entry-dialog");
const form = document.getElementById("entry-form");
const preview = document.getElementById("entry-image-preview");
const clearImageBtn = document.getElementById("entry-image-clear");
const errorEl = document.getElementById("entry-error");
let dialogImage = "";
let dialogEntryId = null;

function setDialogImage(image) {
    dialogImage = image;
    preview.innerHTML = image ? `<img src="${image}" alt="preview">` : "";
    clearImageBtn.hidden = !image;
}

function showDialogError(message) {
    errorEl.textContent = message;
    errorEl.hidden = !message;
}

function openEntryDialog(entry) {
    dialogEntryId = entry ? entry.id : null;
    document.getElementById("entry-dialog-title").textContent = entry ? "Edit entry" : "Add entry";
    form.elements.name.value = entry ? entry.name : "";
    form.elements.url.value = entry ? entry.url : "";
    form.elements.description.value = entry ? entry.description : "";
    document.getElementById("entry-image-url").value = "";
    document.getElementById("entry-image-file").value = "";
    setDialogImage(entry ? entry.image : "");
    showDialogError("");
    dialog.showModal();
}

document.getElementById("entry-cancel").addEventListener("click", () => dialog.close());
clearImageBtn.addEventListener("click", () => setDialogImage(""));

// The "file" button just opens the hidden file input.
document.getElementById("entry-image-pick").addEventListener("click", () => document.getElementById("entry-image-file").click());

document.getElementById("entry-image-file").addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
        showDialogError("Image too large (max 2 MB).");
        return;
    }
    const reader = new FileReader();
    reader.onload = () => {
        setDialogImage(reader.result);
        showDialogError("");
    };
    reader.readAsDataURL(file);
});

document.getElementById("entry-image-fetch").addEventListener("click", async () => {
    const url = document.getElementById("entry-image-url").value.trim();
    if (!url) return;
    showDialogError("");
    try {
        const result = await api("/fetch-image", { method: "POST", body: JSON.stringify({ url }) });
        setDialogImage(result.image);
    } catch (error) {
        showDialogError(error.message);
    }
});

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    let url = form.elements.url.value.trim();
    if (url && !/^[a-z][a-z0-9+.-]*:|^\//i.test(url)) url = `https://${url}`;
    const payload = {
        name: form.elements.name.value.trim(),
        url,
        description: form.elements.description.value.trim(),
        image: dialogImage,
    };
    try {
        if (dialogEntryId === null) {
            await api("/entries", { method: "POST", body: JSON.stringify(payload) });
        } else {
            await api(`/entries/${dialogEntryId}`, { method: "PUT", body: JSON.stringify(payload) });
        }
        dialog.close();
        loadEntries();
    } catch (error) {
        showDialogError(error.message);
    }
});
