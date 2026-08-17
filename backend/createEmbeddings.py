import os
import cv2
import numpy as np
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from insightface.app import FaceAnalysis

# =========================

# FIREBASE

# =========================

cred = credentials.Certificate(
"firebase-service-account.json"
)

firebase_admin.initialize_app(cred)

db = firestore.client()

# =========================

# ARCFACE

# =========================

app = FaceAnalysis(name="buffalo_l")

# CPU

app.prepare(ctx_id=-1)

# =========================

# DOWNLOAD IMAGE

# =========================

def downloadImage(url):


response = requests.get(url, timeout=20)

if response.status_code != 200:
    return None

data = np.frombuffer(
    response.content,
    np.uint8,
)

img = cv2.imdecode(
    data,
    cv2.IMREAD_COLOR,
)

return img


# =========================

# CREATE EMBEDDINGS

# =========================

docs = db.collection("students").stream()

count = 0

for d in docs:


data = d.to_dict()

name = data.get("name")
imageUrl = data.get("imageUrl")

if not name:

    print(
        "Bo qua document khong co name:",
        d.id,
    )

    continue

if not imageUrl:

    print(
        "Bo qua",
        name,
        "vi khong co imageUrl",
    )

    continue

print(
    "Dang xu ly:",
    name,
)

img = downloadImage(imageUrl)

if img is None:

    print(
        "Khong tai duoc anh cua",
        name,
    )

    continue

faces = app.get(img)

if len(faces) == 0:

    print(
        "Khong tim thay khuon mat:",
        name,
    )

    continue

embedding = faces[0].embedding.tolist()

db.collection("students").document(d.id).update(
    {
        "arcfaceEmbedding": embedding,
    }
)

count += 1

print(
    "Embedding da luu:",
    name,
)


print()
print(
"Hoan thanh:",
count,
"hoc sinh",
)
