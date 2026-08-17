import { useState } from "react";
import * as XLSX from "xlsx";
import { addTimetableEntry } from "../../services/timetableService";

const DAY_MAP = {
"Thứ 2": "monday",
"Thứ 3": "tuesday",
"Thứ 4": "wednesday",
"Thứ 5": "thursday",
"Thứ 6": "friday",
"Thứ 7": "saturday",
};

export default function TimetableUpload() {
const [files, setFiles] = useState([]);

async function handleFiles(e) {
const selectedFiles = Array.from(e.target.files);
setFiles(selectedFiles);


for (const file of selectedFiles) {
  const buffer = await file.arrayBuffer();

  const workbook = XLSX.read(buffer);

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  const data = XLSX.utils.sheet_to_json(sheet);

  console.log("==========");

  // Nếu file tên "11A1.xlsx" thì className = "11A1"
  const className = file.name.replace(".xlsx", "");

  // Mỗi dòng trong Excel sẽ được lưu thành một document
  for (const row of data) {
    // Ví dụ Excel có cột:
    // Thứ | Tiết | Phòng
    const day =
      DAY_MAP[row["Thứ"]] ||
      DAY_MAP[row["Thu"]] ||
      row.day ||
      "monday";

    const period =
      Number(row["Tiết"]) ||
      Number(row["Tiet"]) ||
      Number(row.period);

    const room =
      row["Phòng"] ||
      row["Phong"] ||
      row.room;

    if (!room || !period) continue;

    await addTimetableEntry({
      day,
      period,
      room,
      className,
    });
  }

  console.log("Đã import", className);
}

alert("Import thời khóa biểu thành công!");


}

return ( <div className="bg-white rounded-3xl shadow-xl p-8"> <h2 className="text-3xl font-bold mb-6">
📥 Upload thời khóa biểu </h2>


  <label
    className="
      flex
      flex-col
      items-center
      justify-center
      border-2
      border-dashed
      border-blue-400
      rounded-2xl
      p-16
      cursor-pointer
      hover:bg-blue-50
    "
  >
    <div className="text-6xl">📄</div>

    <div className="mt-4 text-2xl">
      Chọn nhiều file Excel
    </div>

    <div className="text-gray-500 mt-2">
      (*.xlsx)
    </div>

    <input
      type="file"
      multiple
      accept=".xlsx"
      hidden
      onChange={handleFiles}
    />
  </label>

  {files.length > 0 && (
    <div className="mt-8">
      <h3 className="font-bold text-xl">
        Đã chọn
      </h3>

      <ul className="mt-4 space-y-2">
        {files.map((file) => (
          <li
            key={file.name}
            className="bg-slate-100 rounded-lg px-4 py-3"
          >
            📄 {file.name}
          </li>
        ))}
      </ul>
    </div>
  )}
</div>


);
}
