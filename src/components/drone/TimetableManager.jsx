import { useEffect, useState } from "react";
import {
addTimetableEntry,
getTimetableEntries,
deleteTimetableEntry,
} from "../../services/timetableService";

const DAY_LABELS = {
monday: "Thứ 2",
tuesday: "Thứ 3",
wednesday: "Thứ 4",
thursday: "Thứ 5",
friday: "Thứ 6",
saturday: "Thứ 7",
};

export default function TimetableManager() {
const [day, setDay] = useState("monday");
const [period, setPeriod] = useState(1);
const [room, setRoom] = useState("");
const [className, setClassName] = useState("");

const [rows, setRows] = useState([]);

const loadData = async () => {
const data = await getTimetableEntries();


data.sort((a, b) => {
  if (a.day === b.day) return a.period - b.period;
  return a.day.localeCompare(b.day);
});

setRows(data);


};

useEffect(() => {
loadData();
}, []);

const saveRow = async () => {
if (!room || !className) {
alert("Vui lòng nhập phòng và lớp");
return;
}


await addTimetableEntry({
  day,
  period,
  room,
  className,
});

setRoom("");
setClassName("");

loadData();


};

const removeRow = async (id) => {
await deleteTimetableEntry(id);
loadData();
};

return ( <div className="bg-white rounded-2xl shadow p-6 mt-8"> <h2 className="text-2xl font-bold mb-4">
📅 Gán lớp theo phòng học </h2>


  <p className="text-gray-500 mb-6">
    Drone sẽ dùng bảng này để biết lớp nào đang học ở phòng nào theo từng tiết.
  </p>

  <div className="grid grid-cols-4 gap-4">
    <select
      value={day}
      onChange={(e) => setDay(e.target.value)}
      className="border rounded-lg p-3"
    >
      {Object.entries(DAY_LABELS).map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>

    <select
      value={period}
      onChange={(e) => setPeriod(Number(e.target.value))}
      className="border rounded-lg p-3"
    >
      {[1,2,3,4,5,6,7,8,9,10].map((p)=>(
        <option key={p} value={p}>
          Tiết {p}
        </option>
      ))}
    </select>

    <input
      value={room}
      onChange={(e)=>setRoom(e.target.value)}
      placeholder="Phòng (101, TH1...)"
      className="border rounded-lg p-3"
    />

    <input
      value={className}
      onChange={(e)=>setClassName(e.target.value)}
      placeholder="Lớp (11A1)"
      className="border rounded-lg p-3"
    />
  </div>

  <button
    onClick={saveRow}
    className="mt-4 px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
  >
    Lưu lịch học
  </button>

  <div className="mt-8 overflow-auto">
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b bg-gray-50">
          <th className="text-left p-3">Thứ</th>
          <th className="text-left p-3">Tiết</th>
          <th className="text-left p-3">Phòng</th>
          <th className="text-left p-3">Lớp</th>
          <th className="text-left p-3"></th>
        </tr>
      </thead>

      <tbody>
        {rows.map((r)=>(
          <tr key={r.id} className="border-b hover:bg-gray-50">
            <td className="p-3">
              {DAY_LABELS[r.day] || r.day}
            </td>

            <td className="p-3">
              Tiết {r.period}
            </td>

            <td className="p-3 font-mono">
              {r.room}
            </td>

            <td className="p-3 font-semibold">
              {r.className}
            </td>

            <td className="p-3">
              <button
                onClick={()=>removeRow(r.id)}
                className="text-red-600 hover:text-red-800"
              >
                Xóa
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


);
}
