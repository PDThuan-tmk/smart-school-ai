import { storage } from "./firebase";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "firebase/storage";

export async function uploadStudentImage(file, studentId) {

  const extension = file.name.split(".").pop();

  const storageRef = ref(
    storage,
    `students/${studentId}.${extension}`
  );

  await uploadBytes(storageRef, file);

  return await getDownloadURL(storageRef);

}