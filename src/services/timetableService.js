import {
collection,
addDoc,
getDocs,
query,
where,
onSnapshot,
deleteDoc,
doc,
} from "firebase/firestore";
import { db } from "./firebase";

// ======================================
// Thêm một lịch học (Thứ + Tiết + Phòng + Lớp)
// ======================================
export async function addTimetableEntry({
day,
period,
room,
className,
}) {
await addDoc(collection(db, "timetable"), {
day,                   // monday, tuesday...
period: Number(period),// 1 - 10
room: room.trim(),     // 101, TH1...
className: className.trim(),
updatedAt: new Date().toISOString(),
});
}

// ======================================
// Đọc toàn bộ lịch học
// ======================================
export async function getTimetableEntries() {
const snapshot = await getDocs(collection(db, "timetable"));

return snapshot.docs.map((d) => ({
id: d.id,
...d.data(),
}));
}

// ======================================
// Xóa một lịch học
// ======================================
export async function deleteTimetableEntry(id) {
await deleteDoc(doc(db, "timetable", id));
}

// ======================================
// Lắng nghe realtime
// ======================================
export function listenTimetableEntries(callback) {
return onSnapshot(collection(db, "timetable"), (snapshot) => {
const list = snapshot.docs.map((d) => ({
id: d.id,
...d.data(),
}));

callback(list);


});
}

// ======================================
// Tra cứu lớp theo phòng ở thời điểm hiện tại
// Drone sẽ dùng hàm này sau khi OCR đọc được số phòng
// ======================================
function getCurrentDay() {
const days = [
"sunday",
"monday",
"tuesday",
"wednesday",
"thursday",
"friday",
"saturday",
];

return days[new Date().getDay()];
}

function getCurrentPeriod() {
const now = new Date();

const h = now.getHours();
const m = now.getMinutes();

const time = h * 60 + m;

if (time >= 7 * 60 && time < 7 * 60 + 45) return 1;
if (time >= 7 * 60 + 50 && time < 8 * 60 + 35) return 2;
if (time >= 8 * 60 + 45 && time < 9 * 60 + 30) return 3;
if (time >= 9 * 60 + 35 && time < 10 * 60 + 20) return 4;
if (time >= 10 * 60 + 30 && time < 11 * 60 + 15) return 5;
if (time >= 13 * 60 && time < 13 * 60 + 45) return 6;
if (time >= 13 * 60 + 50 && time < 14 * 60 + 35) return 7;
if (time >= 14 * 60 + 45 && time < 15 * 60 + 30) return 8;
if (time >= 15 * 60 + 35 && time < 16 * 60 + 20) return 9;
if (time >= 16 * 60 + 30 && time < 17 * 60 + 15) return 10;

return null;
}

// ======================================
// Trả về lớp đang học ở phòng hiện tại
// Ví dụ:
// room = "101"
// => { className: "11A1", period: 1, ... }
// ======================================
export async function getCurrentClassByRoom(roomNumber) {
const day = getCurrentDay();
const period = getCurrentPeriod();

if (period == null) return null;

const q = query(
collection(db, "timetable"),
where("day", "==", day),
where("period", "==", period),
where("room", "==", roomNumber)
);

const snap = await getDocs(q);

if (snap.empty) return null;

return {
id: snap.docs[0].id,
...snap.docs[0].data(),
};
}
