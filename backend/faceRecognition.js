const faceapi = require("face-api.js");
const tf = require("@tensorflow/tfjs-node");
const canvas = require("canvas");
const admin = require("firebase-admin");

const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({
Canvas,
Image,
ImageData,
});

const serviceAccount = require("./firebase-service-account.json");

admin.initializeApp({
credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

let faceMatcher = null;

async function loadModels() {
await faceapi.nets.tinyFaceDetector.loadFromDisk("./models");
await faceapi.nets.faceLandmark68Net.loadFromDisk("./models");
await faceapi.nets.faceRecognitionNet.loadFromDisk("./models");

console.log("Face models loaded");
}

async function loadDescriptors() {
const snapshot = await db.collection("students").get();

const labeled = [];

snapshot.forEach((doc) => {
const data = doc.data();

const descriptors = [];

const count = data.descriptorCount || 0;

for (let i = 0; i < count; i++) {
  if (data[`descriptor${i}`]) {
    descriptors.push(
      new Float32Array(data[`descriptor${i}`])
    );
  }
}

if (
  data.fullName &&
  descriptors.length > 0
) {
  labeled.push(
    new faceapi.LabeledFaceDescriptors(
      data.fullName,
      descriptors
    )
  );
}


});

faceMatcher = new faceapi.FaceMatcher(
labeled,
0.6
);

console.log(
"Loaded",
labeled.length,
"students"
);
}

async function recognizeImage(imagePath) {
const img = await canvas.loadImage(imagePath);

const detection = await faceapi
.detectSingleFace(
img,
new faceapi.TinyFaceDetectorOptions({
inputSize: 416,
scoreThreshold: 0.2,
})
)
.withFaceLandmarks()
.withFaceDescriptor();

if (!detection) {
console.log("No face");
return;
}

const match = faceMatcher.findBestMatch(
detection.descriptor
);

console.log(match.toString());
}

async function main() {
await loadModels();
await loadDescriptors();

// Test
await recognizeImage("./test.jpg");
}

main();
