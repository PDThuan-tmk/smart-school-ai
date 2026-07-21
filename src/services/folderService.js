export async function pickImageFolder() {

    const dirHandle = await window.showDirectoryPicker();

    const files = [];

    for await (const entry of dirHandle.values()) {

        if (entry.kind !== "file") continue;

        const file = await entry.getFile();

        if (!file.type.startsWith("image")) continue;

        files.push(file);

    }

    return files;

}

// ==========================================
// CHỌN THƯ MỤC VIDEO
// ==========================================

export async function pickVideoFolder() {

    const directoryHandle =
        await window.showDirectoryPicker();

    const files = [];

    for await (const entry of directoryHandle.values()) {

        if (entry.kind !== "file")
            continue;

        const file = await entry.getFile();

        const extension =
            file.name
                .split(".")
                .pop()
                .toLowerCase();

        if (

            extension === "mp4" ||

            extension === "mov" ||

            extension === "avi" ||

            extension === "mkv" ||

            extension === "webm"

        ) {

            files.push(file);

        }

    }

    return files;

}