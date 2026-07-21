export function normalizeName(fullName, birthDate) {

    // ===========================
    // Lấy tên không dấu
    // ===========================

    const words = fullName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .trim()
        .split(/\s+/);

    // Ví dụ:
    // Nguyễn Văn A  -> vana
    // Phạm Thị B    -> thib
    // Phan Đức Thuận -> ducthuan

    let shortName;

    if (words.length >= 2) {

        shortName =
            words[words.length - 2] +
            words[words.length - 1];

    }

    else {

        shortName = words[0];

    }

    shortName = shortName.toLowerCase();

    // ===========================
    // Chuyển ngày sinh
    // ===========================

    let day;

    let month;

    if (typeof birthDate === "number") {

        // Excel Serial Number

        const date = new Date(

            (birthDate - 25569) * 86400 * 1000

        );

        day = String(

            date.getUTCDate()

        ).padStart(2, "0");

        month = String(

            date.getUTCMonth() + 1

        ).padStart(2, "0");

    }

    else {

        const parts = String(birthDate).split("/");

        day = parts[0].padStart(2, "0");

        month = parts[1].padStart(2, "0");

    }

    return `${shortName}${day}${month}`;

}