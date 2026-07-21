import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyA_Lkk7_PLO3ZlYrr1ZycZQIq7smjg0H94",
  authDomain: "smart-school-ai-a17f6.firebaseapp.com",
  projectId: "smart-school-ai-a17f6",
  storageBucket: "smart-school-ai-a17f6.appspot.com",
  messagingSenderId: "147045651397",
  appId: "1:147045651397:web:eb617280f084fc5aa271ac"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

export const db = getFirestore(app);
export const storage = getStorage(app);