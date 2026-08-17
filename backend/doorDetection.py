import cv2
import requests
import firebase_admin
from firebase_admin import credentials, firestore
from doorWaypoints import DOOR_WAYPOINTS

cred = credentials.Certificate("firebase-service-account.json")
firebase_admin.initialize_app(cred)

db = firestore.client()

ESP32_STREAM = "http://192.168.1.113:81/stream"
WEB_COMMAND = "http://localhost:3000/api/droneCommand"

cap = cv2.VideoCapture(ESP32_STREAM)

while True:

    telemetry = (
        db.collection("droneTelemetry")
          .document("drone01")
          .get()
          .to_dict()
    )

    if telemetry is None:
        continue

    if not telemetry.get("aligningDoor", False):
        cv2.waitKey(100)
        continue

    currentWaypoint = telemetry.get("currentWaypoint", "")

    if currentWaypoint not in DOOR_WAYPOINTS:
        cv2.waitKey(100)
        continue

    ret, frame = cap.read()

    if not ret:
        continue

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    edges = cv2.Canny(gray, 80, 150)

    lines = cv2.HoughLinesP(
        edges,
        1,
        cv2.PI / 180,
        threshold=100,
        minLineLength=120,
        maxLineGap=10,
    )

    h, w = frame.shape[:2]
    center = w // 2

    if lines is not None:

        vertical = []

        for l in lines:
            x1, y1, x2, y2 = l[0]

            if abs(x1 - x2) < 15:
                vertical.append((x1, y1, x2, y2))

        if len(vertical) >= 2:

            xs = [v[0] for v in vertical]

            doorX = int((min(xs) + max(xs)) / 2)

            cv2.line(
                frame,
                (doorX, 0),
                (doorX, h),
                (0, 255, 0),
                2,
            )

            error = doorX - center

            if abs(error) < 40:

                requests.post(
                    WEB_COMMAND,
                    json={"action": "DOOR_CENTERED"},
                )

            elif error < 0:

                requests.post(
                    WEB_COMMAND,
                    json={"action": "MOVE_LEFT"},
                )

            else:

                requests.post(
                    WEB_COMMAND,
                    json={"action": "MOVE_RIGHT"},
                )

    cv2.imshow("Door Detection", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()
cv2.destroyAllWindows()