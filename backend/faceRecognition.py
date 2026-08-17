import cv2
import numpy as np
from ultralytics import YOLO
from insightface.app import FaceAnalysis
from scipy.spatial.distance import cosine
import firebase_admin
from firebase_admin import credentials, firestore
import datetime

# =========================

# FIREBASE

# =========================

cred = credentials.Certificate(
"firebase-service-account.json"
)

firebase_admin.initialize_app(cred)

db = firestore.client()

# =========================

# CAMERA

# =========================

# Khi chưa có ESP32-CAM thì đổi thành:

# cap = cv2.VideoCapture(0)

ESP32_STREAM = "http://192.168.1.113:81/stream"

cap = cv2.VideoCapture(ESP32_STREAM)

# =========================

# YOLO FACE

# =========================

model = YOLO("yolov8n-face.pt")

# =========================

# ARCFACE

# =========================

app = FaceAnalysis(name="buffalo_l")

# CPU

app.prepare(ctx_id=-1)

# =========================

# LOAD STUDENT EMBEDDINGS

# =========================

knownFaces = {}

def loadStudentEmbeddings():


global knownFaces

knownFaces = {}

docs = db.collection("students").stream()

for d in docs:

    data = d.to_dict()

    name = data.get("name")

    if not name:
        continue

    emb = data.get("arcfaceEmbedding")

    if emb:

        knownFaces[name] = np.array(
            emb,
            dtype=np.float32,
        )

print(
    "Loaded",
    len(knownFaces),
    "students",
)


loadStudentEmbeddings()

# =========================

# RECOGNITION

# =========================

def recognizeFace(embedding):


bestName = None

bestScore = -1

for name, emb in knownFaces.items():

    score = 1 - cosine(
        embedding,
        emb,
    )

    if score > bestScore:

        bestScore = score

        bestName = name

if bestScore > 0.45:
    return bestName, bestScore

return None, bestScore


# =========================

# ATTENDANCE

# =========================

lastAttendance = {}

CURRENT_ROOM = "101"

def markAttendance(name):


now = datetime.datetime.now()

if name in lastAttendance:

    delta = (
        now
        - lastAttendance[name]
    ).total_seconds()

    if delta < 30:
        return

lastAttendance[name] = now

attendanceId = (
    f"{name}-{now.strftime('%Y-%m-%d')}"
)

db.collection("attendance").document(attendanceId).set(
    {
        "studentName": name,
        "room": CURRENT_ROOM,
        "status": "Có mặt",
        "source": "DroneAI",
        "timestamp": firestore.SERVER_TIMESTAMP,
    },
    merge=True,
)

print(
    "Attendance:",
    name,
)


# =========================

# MAIN LOOP

# =========================

while True:


ret, frame = cap.read()

if not ret:
    continue

results = model(frame)

for r in results:

    for box in r.boxes:

        x1, y1, x2, y2 = map(
            int,
            box.xyxy[0],
        )

        faceImg = frame[y1:y2, x1:x2]

        faces = app.get(faceImg)

        label = "Unknown"
        color = (0, 0, 255)

        if len(faces) > 0:

            embedding = faces[0].embedding

            name, score = recognizeFace(
                embedding
            )

            if name:

                label = (
                    f"{name} {score:.2f}"
                )

                color = (0, 255, 0)

                markAttendance(name)

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            color,
            2,
        )

        cv2.putText(
            frame,
            label,
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            color,
            2,
        )

cv2.imshow(
    "Drone AI Face Recognition",
    frame,
)

if cv2.waitKey(1) == 27:
    break


cap.release()

cv2.destroyAllWindows()
