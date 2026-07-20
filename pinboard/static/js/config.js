/* pinboard - config export/import as json */

document.getElementById("export-btn").addEventListener("click", async () => {
    const config = await api("/export");
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "pinboard-config.json";
    link.click();
    URL.revokeObjectURL(link.href);
});

// The navbar import button just opens the hidden file input.
document.getElementById("import-btn").addEventListener("click", () => document.getElementById("import-file").click());

document.getElementById("import-file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    try {
        const config = JSON.parse(await file.text());
        const entryCount = config.entries?.length ?? 0;
        const noteCount = config.notes?.length ?? 0;
        const proceed = await confirmDialog({
            title: "Import config",
            message: `Import replaces the current dashboard with ${entryCount} entries and ${noteCount} notes. Continue?`,
            confirmLabel: "import",
        });
        if (!proceed) return;
        await api("/import", {
            method: "POST",
            body: JSON.stringify({ entries: config.entries || [], notes: config.notes || [] }),
        });
        loadEntries();
        loadNotes();
    } catch (error) {
        druids.toast(`Import failed: ${error.message}`, "danger");
    }
});
