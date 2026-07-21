import * as faceapi from "face-api.js";

let modelsLoaded = false;

async function loadModels() {

    if (modelsLoaded) return;

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models")
    ]);

    modelsLoaded = true;

    console.log("✅ Descriptor Models Ready");
}

const MAX_FRAME = 20;
const FRAME_INTERVAL = 500;
const DUPLICATE_DISTANCE = 0.35;

export async function createDescriptorsFromVideo(file) {

    await loadModels();

    const video = document.createElement("video");

    video.src = URL.createObjectURL(file);
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
    });

    // Cho video khởi tạo
    try {
        await video.play();
        video.pause();
    } catch (e) {
        console.log("Không thể play video:", e);
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    console.log(
        "Video:",
        file.name,
        canvas.width,
        "x",
        canvas.height,
        "Duration:",
        video.duration
    );

    const descriptors = [];

    const frameCount = Math.min(
        MAX_FRAME,
        Math.max(
            1,
            Math.floor(video.duration * 1000 / FRAME_INTERVAL)
        )
    );

    console.log("Frame cần đọc:", frameCount);

    for (let i = 0; i < frameCount; i++) {

        const time = Math.min(
            (i * FRAME_INTERVAL) / 1000,
            Math.max(video.duration - 0.05, 0)
        );

        video.currentTime = time;

        await new Promise(resolve => {
            video.onseeked = () => resolve();
        });

        ctx.drawImage(
            video,
            0,
            0,
            canvas.width,
            canvas.height
        );

        const detection =
            await faceapi
                .detectSingleFace(
                    canvas,
                    new faceapi.TinyFaceDetectorOptions({
                        inputSize: 608,
                        scoreThreshold: 0.2
                    })
                )
                .withFaceLandmarks()
                .withFaceDescriptor();

        if (!detection) {
            console.log("Frame", i, ": Không phát hiện khuôn mặt");
            continue;
        }

        console.log(
            "Frame",
            i,
            "Face width:",
            detection.detection.box.width
        );

        descriptors.push(detection.descriptor);
    }

    console.log("Descriptors trước lọc:", descriptors.length);

    const uniqueDescriptors = [];

    for (const descriptor of descriptors) {

        let duplicated = false;

        for (const saved of uniqueDescriptors) {

            const distance =
                faceapi.euclideanDistance(
                    descriptor,
                    saved
                );

            if (distance < DUPLICATE_DISTANCE) {
                duplicated = true;
                break;
            }
        }

        if (!duplicated) {
            uniqueDescriptors.push(descriptor);
        }
    }

    console.log("Descriptors sau lọc:", uniqueDescriptors.length);

    URL.revokeObjectURL(video.src);

    if (uniqueDescriptors.length === 0) {
        console.warn("Không tìm thấy descriptor nào.");
    }

    return uniqueDescriptors;
}