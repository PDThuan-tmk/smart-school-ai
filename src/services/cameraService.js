import {
    collection,
    getDocs
} from "firebase/firestore";

import { db } from "../firebase";

export async function getCameras() {

    const snapshot =
        await getDocs(collection(db, "cameras"));

    return snapshot.docs.map(doc => ({

        id: doc.id,

        ...doc.data()

    }));

}