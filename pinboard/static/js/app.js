/* pinboard - edit mode and init (loaded last, wires the modules together);
   the log tab handles its own polling via <druid-log-view> */

/* ---------- edit mode ---------- */

document.getElementById("edit-toggle").addEventListener("toggle-change", (event) => {
    editMode = event.detail.active;
    document.body.classList.toggle("edit-mode", editMode);
    renderEntries();
    renderNotes();
});

/* ---------- init ---------- */

loadEntries();
loadNotes();
