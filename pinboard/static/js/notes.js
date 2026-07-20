/* pinboard - key/value notes table below the entry grid */

let notes = [];

const notesBody = document.querySelector("#notes-table tbody");

async function loadNotes() {
    notes = await api("/notes");
    renderNotes();
}

function writeClipboard(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    // Fallback for non-secure contexts (plain http on the intranet).
    const helper = document.createElement("textarea");
    helper.value = text;
    helper.style.position = "fixed";
    helper.style.opacity = "0";
    document.body.appendChild(helper);
    helper.select();
    document.execCommand("copy");
    helper.remove();
    return Promise.resolve();
}

async function copyNoteText(event, cell, text) {
    if (!text) return;
    try {
        await writeClipboard(text);
    } catch {
        return;
    }
    // Flash the cell and float a small "copied" toast at the cursor.
    cell.classList.remove("copied");
    void cell.offsetWidth;
    cell.classList.add("copied");
    const toast = document.createElement("div");
    toast.className = "copy-toast";
    toast.textContent = "copied";
    toast.style.left = `${event.clientX + 12}px`;
    toast.style.top = `${event.clientY - 10}px`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 700);
}

function noteRow(note) {
    const row = document.createElement("tr");
    row.dataset.id = note.id;

    const key = document.createElement("td");
    key.className = "note-key";
    key.textContent = note.key;
    key.title = "Click to copy";
    key.addEventListener("click", (event) => copyNoteText(event, key, note.key));
    const value = document.createElement("td");
    value.className = "note-value";
    value.textContent = note.value;
    value.title = "Click to copy";
    value.addEventListener("click", (event) => copyNoteText(event, value, note.value));
    const actions = document.createElement("td");
    actions.className = "note-actions";

    const edit = document.createElement("button");
    edit.className = "entry-action";
    edit.innerHTML = ICONS.pencil;
    edit.title = "Edit";
    edit.addEventListener("click", () => editNoteRow(row, note));
    const remove = document.createElement("button");
    remove.className = "entry-action delete";
    remove.innerHTML = ICONS.x;
    remove.title = "Delete";
    remove.addEventListener("click", async () => {
        if (!await confirmDialog({ message: `Delete note "${note.key}"?`, confirmLabel: "delete" })) return;
        await api(`/notes/${note.id}`, { method: "DELETE" });
        loadNotes();
    });
    actions.append(edit, remove);
    row.append(key, value, actions);

    row.draggable = true;
    row.addEventListener("dragstart", (event) => {
        if (!editMode || row.querySelector("input")) {
            event.preventDefault();
            return;
        }
        row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => {
        row.classList.remove("dragging");
        saveNoteOrder();
    });
    row.addEventListener("dragover", (event) => {
        event.preventDefault();
        const dragging = notesBody.querySelector("tr.dragging");
        if (!dragging || dragging === row) return;
        const rect = row.getBoundingClientRect();
        const before = event.clientY < rect.top + rect.height / 2;
        notesBody.insertBefore(dragging, before ? row : row.nextSibling);
    });

    return row;
}

function editNoteRow(row, note) {
    row.innerHTML = "";
    row.draggable = false;

    const key = document.createElement("td");
    key.className = "note-key";
    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.value = note.key;
    keyInput.maxLength = 200;
    key.appendChild(keyInput);

    const value = document.createElement("td");
    value.className = "note-value";
    // druid-textarea: 1 line by default, grows with content while editing.
    const valueInput = document.createElement("druid-textarea");
    valueInput.rows = 1;
    valueInput.autosize = true;
    valueInput.maxlength = 5000;
    valueInput.value = note.value;
    value.appendChild(valueInput);

    const actions = document.createElement("td");
    actions.className = "note-actions";
    const save = document.createElement("button");
    save.className = "entry-action";
    save.innerHTML = ICONS.check;
    save.title = "Save";
    save.addEventListener("click", async () => {
        const payload = { key: keyInput.value.trim(), value: valueInput.value.trim() };
        if (!payload.key) return;
        if (note.id === null) {
            await api("/notes", { method: "POST", body: JSON.stringify(payload) });
        } else {
            await api(`/notes/${note.id}`, { method: "PUT", body: JSON.stringify(payload) });
        }
        loadNotes();
    });
    const cancel = document.createElement("button");
    cancel.className = "entry-action delete";
    cancel.innerHTML = ICONS.x;
    cancel.title = "Cancel";
    cancel.addEventListener("click", () => renderNotes());
    actions.append(save, cancel);

    row.append(key, value, actions);
    keyInput.focus();
}

function renderNotes() {
    notesBody.innerHTML = "";
    notes.forEach((note) => notesBody.appendChild(noteRow(note)));
    document.getElementById("notes-section").style.display = notes.length || editMode ? "" : "none";
}

document.getElementById("note-add").addEventListener("click", () => {
    const row = document.createElement("tr");
    notesBody.appendChild(row);
    editNoteRow(row, { id: null, key: "", value: "" });
});

function saveNoteOrder() {
    const ids = [...notesBody.querySelectorAll("tr[data-id]")].map((row) => Number(row.dataset.id));
    api("/notes/reorder", { method: "POST", body: JSON.stringify({ ids }) }).then(loadNotes);
}
