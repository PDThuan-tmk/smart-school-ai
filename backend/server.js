const express = require('express');
const cors = require('cors');

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

const serviceAccount = require('./firebase-service-account.json');

initializeApp({
credential: cert(serviceAccount),
});

const db = getFirestore();

const app = express();

app.use(cors());
app.use(express.json());

app.post('/api/droneCommand', async (req, res) => {
try {
const { action } = req.body;


console.log('Incoming:', action);

await db.collection('commands').doc('current').set(
  {
    action,
    updatedAt: new Date(),
  },
  { merge: true }
);

console.log('Sent command:', action);

res.json({ ok: true });


} catch (err) {
console.error('Firestore error:', err);
res.status(500).json({
ok: false,
error: err.message,
});
}
});

app.listen(3000, () => {
console.log('Backend listening on http://localhost:3000');
});
