import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    writeBatch,
    updateDoc,
    onSnapshot
} from "firebase/firestore";

import { db } from "./firebase";

// ===============================
// Điểm danh
// ===============================
export async function markAttendance(student) {

    const today = new Date()
        .toISOString()
        .split("T")[0];

    const attendanceRef = doc(
        db,
        "attendance",
        today,
        "students",
        student.studentId
    );

    const snapshot = await getDoc(attendanceRef);

    // Hôm nay đã điểm danh
    if (snapshot.exists()) {

        return false;

    }

    // Lưu lịch sử điểm danh
    await setDoc(attendanceRef, {

        studentId: student.studentId,
        fullName: student.fullName,
        class: student.class,
        grade: student.grade,
        status: "Có mặt",
        time: new Date().toLocaleTimeString(),
        date: today

    });

    // Cập nhật trạng thái học sinh
    const studentRef = doc(
        db,
        "students",
        student.studentId
    );

    await updateDoc(studentRef, {

        attendance: "Có mặt"

    });

    return true;

}

// ===============================
// Reset toàn bộ học sinh về Vắng
// ===============================
export async function resetAttendanceIfNewDay() {

    const today = new Date()
        .toISOString()
        .split("T")[0];

    const systemRef = doc(db, "system", "attendance");

    const systemSnap = await getDoc(systemRef);

    if (
        systemSnap.exists() &&
        systemSnap.data().lastReset === today
    ) {

        return;

    }

    const students = await getDocs(
        collection(db, "students")
    );

    const batch = writeBatch(db);

    students.forEach(student => {

        batch.update(student.ref, {

            attendance: "Vắng"

        });

    });

    batch.set(systemRef, {

        lastReset: today

    });

    await batch.commit();

}

export async function resetAttendance() {

    const snapshot = await getDocs(
        collection(db, "students")
    );

    const batch = writeBatch(db);

    snapshot.forEach((studentDoc) => {

        batch.update(studentDoc.ref, {

            attendance: "Vắng"

        });

    });

    await batch.commit();

}

// ===============================
// Lấy lịch sử điểm danh
// ===============================
export async function getAttendance(date) {

    const snapshot = await getDocs(

        collection(
            db,
            "attendance",
            date,
            "students"
        )

    );

    return snapshot.docs.map(doc => ({

        id: doc.id,
        ...doc.data()

    }));

}

// ===============================
// Lắng nghe điểm danh theo ngày
// ===============================

export function listenAttendance(date, callback) {

    return onSnapshot(

        collection(
            db,
            "attendance",
            date,
            "students"
        ),

        (snapshot) => {

            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            callback(list);

        }

    );

}