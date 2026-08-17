import express from "express";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../src/services/firebase.js";

const router = express.Router();

router.post("/droneCommand", async (req, res) => {

  const { action } = req.body;

  await setDoc(
    doc(db, "commands", "current"),
    {
      action,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  res.json({ ok: true });
});

export default router;