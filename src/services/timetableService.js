import {

    doc,
    setDoc,
    getDocs,
    collection,
    onSnapshot

} from "firebase/firestore";

import { db } from "./firebase";

// ======================================
// Lưu thời khóa biểu của một lớp
// ======================================

export async function saveTimetable(

    className,

    lessons

) {

    const ref = doc(

        db,

        "timetables",

        className

    );

    await setDoc(

        ref,

        {

            className,

            lessons,

            updatedAt: new Date().toISOString()

        }

    );

}

// ======================================
// Đọc toàn bộ thời khóa biểu
// ======================================

export async function getTimetables() {

    const snapshot = await getDocs(

        collection(db, "timetables")

    );

    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}

// ======================================
// Lắng nghe realtime
// ======================================

export function listenTimetables(callback) {

    return onSnapshot(

        collection(db, "timetables"),

        snapshot => {

            const list = snapshot.docs.map(doc => ({

                id: doc.id,

                ...doc.data()

            }));

            callback(list);

        }

    );

}