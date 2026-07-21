import {
    collection,
    getDocs,
    writeBatch,
    doc,
    setDoc,
    onSnapshot,
    query,
    where,
    deleteDoc
} from "firebase/firestore";

import { db } from "./firebase";

const studentRef = collection(db,"students");

const studentCollection = collection(db, "students");

// ===============================
// Thêm 1 học sinh
// ===============================

export async function addStudent(student) {

  await setDoc(
    doc(db, "students", student.studentId),
    student
  );

}

// ===============================
// Lấy toàn bộ học sinh
// ===============================
export async function getStudents() {

    const snapshot = await getDocs(studentCollection);

    console.log("Firestore docs:", snapshot.size);

    snapshot.forEach(doc => {
        console.log(doc.id, doc.data());
    });

    return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
}

// ===============================
// Import nhiều học sinh
// ===============================
export async function addStudents(students) {

  const batch = writeBatch(db);

  students.forEach((student) => {

    const studentRef = doc(
      db,
      "students",
      student.studentId
    );

    batch.set(studentRef, student);

  });

  await batch.commit();

}

// ===============================
// Thêm 1 học sinh
// ===============================
export async function addStudentWithImage(student) {

  const studentRef = doc(
    db,
    "students",
    student.studentId
  );

  await setDoc(studentRef, student);

}

// ===============================
// Lưu học sinh kèm Face Descriptor
// ===============================
export async function addStudentDescriptor(student) {

    console.log("===== SAVE FIRESTORE =====");
    console.log(student);

    const studentRef = doc(
        db,
        "students",
        student.studentId
    );

    try{

        await setDoc(studentRef, student);

        console.log("SAVE SUCCESS");

    }catch(err){

        console.error("SAVE ERROR", err);

        throw err;

    }

}

export async function getAllStudentIds() {

    const snapshot = await getDocs(
        collection(db, "students")
    );

    const ids = new Set();

    snapshot.forEach(doc => {

        ids.add(doc.data().studentId);

    });

    return ids;

}

export function listenStudents(callback) {

    return onSnapshot(
        collection(db, "students"),
        (snapshot) => {

            const students = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            callback(students);

        }
    );

}

export async function getStudentsByClass(className) {

    const q = query(

        collection(db, "students"),

        where("class", "==", className)

    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

// ===============================
// Xóa học sinh bị trùng
// ===============================

export async function removeDuplicateStudents() {

    const snapshot = await getDocs(
        collection(db, "students")
    );

    const groups = new Map();

    snapshot.forEach(docSnap => {

        const data = docSnap.data();

        const fullName =
            (data.fullName || "")
                .trim()
                .toLowerCase();

        const birthDate =
            (data.birthDate || "")
                .trim();

        const className =
            (data.class || "")
                .trim()
                .toUpperCase();

        const key =
            `${fullName}_${birthDate}_${className}`;

        console.log({
            id: docSnap.id,
            key,
            fullName,
            birthDate,
            className
        });

        if (!groups.has(key)) {

            groups.set(key, []);

        }

        groups.get(key).push({

            id: docSnap.id,

            ...data

        });

    });

    let deleted = 0;

    for (const [, students] of groups) {

        if (students.length <= 1) continue;

        students.sort((a, b) => {

            const t1 = a.createdAt
                ? new Date(a.createdAt).getTime()
                : 0;

            const t2 = b.createdAt
                ? new Date(b.createdAt).getTime()
                : 0;

            return t2 - t1;

        });

        // Giữ bản mới nhất, xóa các bản còn lại
        for (let i = 1; i < students.length; i++) {

            await deleteDoc(
                doc(db, "students", students[i].id)
            );

            deleted++;

        }

    }

    return deleted;

}