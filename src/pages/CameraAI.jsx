import { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";

import { loadLabeledImages } from "../services/faceService";

import {
    getStudentsByClass
} from "../services/studentService";

import {
    markAttendance,
    getAttendance,
    resetAttendanceIfNewDay
} from "../services/attendanceService";

export default function CameraAI() {

    // =====================================================
    // VIDEO
    // =====================================================

    const videoRef = useRef(null);

    const canvasRef = useRef(null);

    const detectInterval = useRef(null);

    // =====================================================
    // AI
    // =====================================================

    const faceMatcherRef = useRef(null);

    const studentsRef = useRef([]);

    // =====================================================
    // CACHE
    // =====================================================

    const attendanceCache = useRef(new Set());

    const recognizeCounter = useRef({});

    const distanceHistory = useRef({});

    const lastAttendanceTime = useRef({});

    const lastResetDate = useRef(
        new Date().toDateString()
    );

    const fpsCounter = useRef(0);

    const fpsTimer = useRef(Date.now());

    // =====================================================
    // STATE
    // =====================================================

    const [loading, setLoading] = useState(true);

    const [status, setStatus] =
        useState("Đang khởi tạo AI...");

    const [fps, setFps] = useState(0);

    const [recognizedStudent,
        setRecognizedStudent] = useState(null);

    const [attendanceList,
        setAttendanceList] = useState([]);

    const [totalStudents,
        setTotalStudents] = useState(0);

    const [cameraStatus,
        setCameraStatus] = useState("Offline");

    const [cameraDevices,
        setCameraDevices] = useState([]);

    // =====================================================
    // CAMERA
    // =====================================================

    const cameras = [

        {
            id: 1,
            name: "Camera lớp 11A1",
            classroom: "11A1",
            type: "webcam"
        },

        {
            id: 2,
            name: "Camera lớp 11A2",
            classroom: "11A2",
            type: "ip",
            url: "http://192.168.1.102:81/stream"
        },

        {
            id: 3,
            name: "Camera lớp 11A3",
            classroom: "11A3",
            type: "ip",
            url: "http://192.168.1.103:81/stream"
        }

    ];

    const [selectedCamera,
        setSelectedCamera] = useState(cameras[0]);

    const [selectedClass,
        setSelectedClass] = useState(
            cameras[0].classroom
        );

    // =====================================================
    // AI CONFIG
    // =====================================================

    const CAMERA_WIDTH = 1920;

    const CAMERA_HEIGHT = 1080;

    const INPUT_SIZE = 608;

    const DETECTOR_SCORE = 0.65;

    const MATCH_THRESHOLD = 0.60;

    const MIN_FACE_WIDTH = 90;

    const MIN_FACE_HEIGHT = 90;

    const REQUIRED_FRAME = 4;

    const AVG_DISTANCE = 0.50;

    const ATTENDANCE_DELAY = 10000;

    const MAX_FACE = 20;

    // =====================================================
    // KHỞI ĐỘNG HỆ THỐNG
    // =====================================================

    useEffect(() => {

        initialize();

        return () => {

            if (detectInterval.current) {

                clearInterval(detectInterval.current);

            }

            if (videoRef.current?.srcObject) {

                videoRef.current.srcObject
                    .getTracks()
                    .forEach(track => track.stop());

            }

        };

    }, []);

    // =====================================================
    // KHI ĐỔI CAMERA
    // =====================================================

    useEffect(() => {

        if (loading) return;

        changeCamera();

    }, [selectedCamera]);

    // =====================================================
    // RESET ĐIỂM DANH KHI SANG NGÀY MỚI
    // =====================================================

    useEffect(() => {

        const timer = setInterval(async () => {

            const today =
                new Date().toDateString();

            if (today !== lastResetDate.current) {

                lastResetDate.current = today;

                attendanceCache.current.clear();

                recognizeCounter.current = {};

                distanceHistory.current = {};

                lastAttendanceTime.current = {};

                await resetAttendanceIfNewDay();

                await loadAttendance();

                setRecognizedStudent(null);

            }

        }, 60000);

        return () => clearInterval(timer);

    }, []);

    // =====================================================
    // KHỞI TẠO
    // =====================================================

    async function initialize() {

        try {

            setLoading(true);

            setStatus("Đang tải AI Models...");

            await loadModels();

            setStatus("Đang đọc Camera...");

            await loadCameraDevices();

            setStatus("Đang tải dữ liệu lớp...");

            await loadClassData(
                selectedClass
            );

            setStatus("Đang mở Camera...");

            await openCamera(
                selectedCamera
            );

            setLoading(false);

            setStatus("AI sẵn sàng");

        }

        catch (err) {

            console.log(err);

            setStatus("Khởi tạo thất bại");

        }

    }

    // =====================================================
    // LOAD AI MODELS
    // =====================================================

    async function loadModels() {

        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

        await faceapi.nets.faceLandmark68Net.loadFromUri("/models");

        await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

        console.log("AI Models Ready");

    }

    // =====================================================
    // ĐỌC DANH SÁCH CAMERA MÁY TÍNH
    // =====================================================

    async function loadCameraDevices() {

        try {

            const devices =
                await navigator.mediaDevices.enumerateDevices();

            const videos =
                devices.filter(

                    device =>

                    device.kind === "videoinput"

                );

            setCameraDevices(videos);

            console.log(videos);

        }

        catch (err) {

            console.log(err);

        }

    }

    // =====================================================
    // LOAD HỌC SINH THEO LỚP
    // =====================================================

    async function loadClassData(className) {

        setStatus(
            `Đang tải lớp ${className}...`
        );

        const students =
            await getStudentsByClass(
                className
            );

        studentsRef.current =
            students;

        const descriptors =
            await loadLabeledImages(className);

        console.log("Descriptors:", descriptors.length);

        if (descriptors.length === 0) {

            console.warn("Lớp này chưa có descriptor.");

            faceMatcherRef.current = null;

            setTotalStudents(0);

            return;

        }

        faceMatcherRef.current =
            new faceapi.FaceMatcher(
                descriptors,
                MATCH_THRESHOLD
            );
        
        console.log(faceMatcherRef.current);

        setTotalStudents(
            descriptors.length
        );

        recognizeCounter.current = {};

        distanceHistory.current = {};

        attendanceCache.current.clear();

        await loadAttendance();

        setRecognizedStudent(null);

    }

    // =====================================================
    // LOAD ĐIỂM DANH
    // =====================================================

    async function loadAttendance() {

        const today =
            new Date()
                .toISOString()
                .split("T")[0];

        const list =
            await getAttendance(today);

        setAttendanceList(list);

        attendanceCache.current.clear();

        list.forEach(student => {

            attendanceCache.current.add(

                student.studentId

            );

        });

    }

        // =====================================================
    // MỞ CAMERA
    // =====================================================

    async function openCamera(camera) {

        try {

            // Dừng camera cũ

            if (videoRef.current?.srcObject) {

                videoRef.current.srcObject
                    .getTracks()
                    .forEach(track => track.stop());

            }

            // Xóa video cũ

            videoRef.current.srcObject = null;

            videoRef.current.removeAttribute("src");

            // ============================================
            // WEBCAM
            // ============================================

            if (camera.type === "webcam") {

                const stream =

                    await navigator.mediaDevices.getUserMedia({

                        video: {

                            deviceId:

                                cameraDevices.length

                                    ? {

                                        exact:

                                        cameraDevices[0].deviceId

                                    }

                                    : undefined,

                            width: CAMERA_WIDTH,

                            height: CAMERA_HEIGHT

                        },

                        audio: false

                    });

                videoRef.current.srcObject = stream;

                await videoRef.current.play();

                setCameraStatus("Online");

            }

            // ============================================
            // IP CAMERA
            // ============================================

            else {

                videoRef.current.src = camera.url;

                videoRef.current.autoplay = true;

                videoRef.current.playsInline = true;

                videoRef.current.onloadeddata = () => {

                    setCameraStatus("Online");

                };

                videoRef.current.onerror = () => {

                    setCameraStatus("Offline");

                };

            }

            // Bắt đầu AI

            detectFaces();

        }

        catch (err) {

            console.log(err);

            setCameraStatus("Offline");

        }

    }

    // =====================================================
    // ĐỔI CAMERA
    // =====================================================

    async function changeCamera() {

        try {

            setStatus("Đang chuyển camera...");

            const camera = selectedCamera;

            // Đổi lớp

            setSelectedClass(

                camera.classroom

            );

            // Load học sinh lớp đó

            await loadClassData(

                camera.classroom

            );

            // Mở camera

            await openCamera(

                camera

            );

            setStatus(

                `Đang nhận diện lớp ${camera.classroom}`

            );

        }

        catch (err) {

            console.log(err);

            setStatus("Không thể mở Camera");

        }

    }

    // =====================================================
    // CHỌN CAMERA
    // =====================================================

    function handleCameraChange(event) {

        const id = Number(

            event.target.value

        );

        const camera =

            cameras.find(

                cam => cam.id === id

            );

        if (!camera) return;

        setSelectedCamera(

            camera

        );

    }

        // =====================================================
    // FACE DETECTION
    // =====================================================

    function detectFaces() {

        // Nếu đang chạy thì dừng trước

        if (detectInterval.current) {

            clearInterval(detectInterval.current);

        }

        detectInterval.current = setInterval(async () => {

            // ============================================
            // READY ?
            // ============================================

            if (!videoRef.current) return;

            if (!faceMatcherRef.current) return;

            if (videoRef.current.readyState !== 4) return;

            // ============================================
            // FPS
            // ============================================

            fpsCounter.current++;

            const now = Date.now();

            if (now - fpsTimer.current >= 1000) {

                setFps(fpsCounter.current);

                fpsCounter.current = 0;

                fpsTimer.current = now;

            }

            // ============================================
            // DETECT FACE
            // ============================================

            const detections =

                await faceapi

                    .detectAllFaces(

                        videoRef.current,

                        new faceapi.TinyFaceDetectorOptions({

                            inputSize: INPUT_SIZE,

                            scoreThreshold: DETECTOR_SCORE

                        })

                    )

                    .withFaceLandmarks()

                    .withFaceDescriptors();

            // ============================================
            // KHÔNG CÓ KHUÔN MẶT
            // ============================================

            // ============================================
            // CANVAS
            // ============================================

            const canvas = canvasRef.current;

            if (canvas) {

                canvas.width = videoRef.current.videoWidth;

                canvas.height = videoRef.current.videoHeight;

                const displaySize = {

                    width: videoRef.current.videoWidth,

                    height: videoRef.current.videoHeight

                };

                faceapi.matchDimensions(
                    canvas,
                    displaySize
                );

                const resized =
                    faceapi.resizeResults(
                        detections,
                        displaySize
                    );

                const ctx =
                    canvas.getContext("2d");

                ctx.clearRect(

                    0,

                    0,

                    canvas.width,

                    canvas.height

                );

                faceapi.draw.drawDetections(

                    canvas,

                    resized

                );

            }
            
            if (!detections.length) {

                recognizeCounter.current = {};

                distanceHistory.current = {};

                setRecognizedStudent(null);

                setStatus("Đang chờ học sinh...");

                return;

            }

            // ============================================
            // LỌC KHUÔN MẶT
            // ============================================

            const faces = detections

                .filter(face => {

                    const box = face.detection.box;

                    return (

                        box.width >= MIN_FACE_WIDTH &&

                        box.height >= MIN_FACE_HEIGHT

                    );

                })

                .sort((a, b) => {

                    const areaA =

                        a.detection.box.width *

                        a.detection.box.height;

                    const areaB =

                        b.detection.box.width *

                        b.detection.box.height;

                    return areaB - areaA;

                })

                .slice(0, MAX_FACE);

            // ============================================
            // KHÔNG CÒN KHUÔN MẶT HỢP LỆ
            // ============================================

            if (!faces.length) {

                return;

            }

            // ============================================
            // CHUYỂN SANG NHẬN DIỆN
            // (Viết ở Phần 4.2)
            // ============================================

                        // ============================================
            // NHẬN DIỆN TỪNG KHUÔN MẶT
            // ============================================

            for (const face of faces) {

                const bestMatch =
                faceMatcherRef.current.findBestMatch(
                    face.descriptor
                );

                console.log(bestMatch.toString());
                console.log(bestMatch.distance);

                // Tìm học sinh giống nhất

                console.log(
                    "Tên:",
                    bestMatch.label,
                    "Distance:",
                    bestMatch.distance
                );

                console.log(
                    bestMatch.distance
                );

                // Hiển thị tên trên Canvas

                if (canvasRef.current) {

                    const drawBox =

                        new faceapi.draw.DrawBox(

                            face.detection.box,

                            {

                                label:

                                    bestMatch.label === "unknown"

                                        ? "Unknown"

                                        : bestMatch.label

                            }

                        );

                    drawBox.draw(canvasRef.current);

                }

                // Không nhận ra

                if (bestMatch.label === "unknown") {

                    continue;

                }

                // Distance quá lớn

                if (
                    bestMatch.distance >
                    MATCH_THRESHOLD
                ) {

                    continue;

                }

                // Tìm học sinh trong lớp

                const student =
                    studentsRef.current.find(

                        item =>

                        item.studentId ===

                        bestMatch.label

                    );

                console.log("BestMatch:", bestMatch.label);
                console.log("Danh sách:", studentsRef.current);

                if (!student) {

                    continue;

                }

                console.log("✅ Tìm thấy:", student);

                // ========================================
                // ĐÃ ĐIỂM DANH
                // ========================================

                if (

                    attendanceCache.current.has(

                        student.studentId

                    )

                ) {

                    continue;

                }

                // ========================================
                // FRAME COUNTER
                // ========================================

                recognizeCounter.current[
                    student.studentId
                ] = (

                    recognizeCounter.current[
                        student.studentId
                    ]

                    ||

                    0

                ) + 1;

                // ========================================
                // DISTANCE HISTORY
                // ========================================

                if (

                    !distanceHistory.current[
                        student.studentId
                    ]

                ) {

                    distanceHistory.current[
                        student.studentId
                    ] = [];

                }

                distanceHistory.current[
                    student.studentId
                ].push(

                    bestMatch.distance

                );

                if (

                    distanceHistory.current[
                        student.studentId
                    ].length >

                    REQUIRED_FRAME

                ) {

                    distanceHistory.current[
                        student.studentId
                    ].shift();

                }

                console.log(

                    student.studentId,

                    recognizeCounter.current[
                        student.studentId
                    ],

                    bestMatch.distance

                );

                // ========================================
                // CHƯA ĐỦ FRAME
                // ========================================

                if (

                    recognizeCounter.current[
                        student.studentId
                    ] < REQUIRED_FRAME

                ) {

                    continue;

                }

                // ========================================
                // TÍNH DISTANCE TRUNG BÌNH
                // ========================================

                const history =

                    distanceHistory.current[
                        student.studentId
                    ];

                const averageDistance =

                    history.reduce(

                        (a, b) => a + b,

                        0

                    ) / history.length;

                console.log(

                    "AVG",

                    student.studentId,

                    averageDistance

                );

                // Nếu chưa đủ chính xác

                if (

                    averageDistance >

                    AVG_DISTANCE

                ) {

                    recognizeCounter.current[
                        student.studentId
                    ] = 0;

                    distanceHistory.current[
                        student.studentId
                    ] = [];

                    continue;

                }

                                // ========================================
                // CHỐNG ĐIỂM DANH LIÊN TỤC
                // ========================================

                const now = Date.now();

                const lastTime =

                    lastAttendanceTime.current[
                        student.studentId
                    ] || 0;

                if (

                    now - lastTime <

                    ATTENDANCE_DELAY

                ) {

                    continue;

                }

                lastAttendanceTime.current[
                    student.studentId
                ] = now;

                // ========================================
                // HIỂN THỊ HỌC SINH
                // ========================================

                setRecognizedStudent(student);

                console.log("🎉 ĐÃ NHẬN:", student.studentId);

                setStatus(
                    `Đã nhận diện ${student.fullName}`
                );

                // ========================================
                // ĐIỂM DANH FIRESTORE
                // ========================================

                try {

                    const success =

                        await markAttendance(student);

                    if (!success) {

                        continue;

                    }

                    // Lưu cache

                    attendanceCache.current.add(

                        student.studentId

                    );

                    // Load lại danh sách điểm danh

                    await loadAttendance();

                    // Reset bộ đếm

                    recognizeCounter.current[
                        student.studentId
                    ] = 0;

                    distanceHistory.current[
                        student.studentId
                    ] = [];

                    console.log(

                        "Attendance:",

                        student.fullName

                    );

                }

                catch (err) {

                    console.log(err);

                }

            }

            // ============================================
            // DỌN DẸP CACHE
            // ============================================

            Object.keys(recognizeCounter.current)

            .forEach(id=>{

                if(

                    recognizeCounter.current[id]

                    >

                    REQUIRED_FRAME*2

                ){

                    recognizeCounter.current[id]=

                        REQUIRED_FRAME;

                }

            });

            Object.keys(distanceHistory.current)

            .forEach(id=>{

                if(

                    distanceHistory.current[id]

                    .length>

                    REQUIRED_FRAME

                ){

                    distanceHistory.current[id]=

                        distanceHistory.current[id]

                        .slice(-REQUIRED_FRAME);

                }

            });

        }, 250);

    }

        // =====================================================
        // UI
        // =====================================================

        return (

            <div className="min-h-screen bg-slate-100 p-6">

                {/* ============================================ */}
                {/* HEADER */}
                {/* ============================================ */}

                <div className="flex justify-between items-center mb-6">

                    <div>

                        <h1 className="text-4xl font-bold text-blue-700">

                            🎓 Smart School AI

                        </h1>

                        <p className="text-gray-600 mt-2">

                            Hệ thống điểm danh bằng nhận diện khuôn mặt

                        </p>

                    </div>

                    <div className="bg-white rounded-xl shadow-lg p-5">

                        <p className="text-gray-500">

                            Tổng học sinh

                        </p>

                        <h2 className="text-4xl font-bold text-blue-600">

                            {totalStudents}

                        </h2>

                    </div>

                </div>

                {/* ============================================ */}
                {/* CAMERA + CLASS */}
                {/* ============================================ */}

                <div className="bg-white rounded-xl shadow-lg p-5 mb-6">

                    <h2 className="text-xl font-bold mb-5">

                        📹 Camera đang sử dụng

                    </h2>

                    <div className="grid grid-cols-2 gap-6">

                        {/* CAMERA */}

                        <div>

                            <label className="font-semibold">

                                Camera

                            </label>

                            <select

                                className="w-full mt-2 border rounded-lg p-3"

                                value={selectedCamera.id}

                                onChange={handleCameraChange}

                            >

                                {

                                    cameras.map(camera => (

                                        <option

                                            key={camera.id}

                                            value={camera.id}

                                        >

                                            {camera.name}

                                        </option>

                                    ))

                                }

                            </select>

                        </div>

                        {/* LỚP */}

                        <div>

                            <label className="font-semibold">

                                Lớp

                            </label>

                            <input

                                className="w-full mt-2 border rounded-lg p-3 bg-gray-100"

                                value={selectedClass}

                                readOnly

                            />

                        </div>

                    </div>

                </div>

                {/* ============================================ */}
                {/* AI STATUS */}
                {/* ============================================ */}

                <div className="bg-white rounded-xl shadow-lg p-5 mb-6">

                    <h2 className="text-2xl font-bold mb-4">

                        🤖 AI Status

                    </h2>

                    <div className="grid grid-cols-3 gap-6">

                        <div>

                            <p className="text-gray-500">

                                Trạng thái

                            </p>

                            <h3 className="font-bold text-blue-600">

                                {status}

                            </h3>

                        </div>

                        <div>

                            <p className="text-gray-500">

                                Camera

                            </p>

                            <h3

                                className={`font-bold ${
                                    cameraStatus === "Online"

                                        ? "text-green-600"

                                        : "text-red-600"
                                }`}

                            >

                                {cameraStatus}

                            </h3>

                        </div>

                        <div>

                            <p className="text-gray-500">

                                FPS

                            </p>

                            <h3 className="font-bold text-orange-600">

                                {fps}

                            </h3>

                        </div>

                        <div>

                            <p className="text-gray-500">

                                Tổng học sinh

                            </p>

                            <h3 className="font-bold">

                                {totalStudents}

                            </h3>

                        </div>

                        <div>

                            <p className="text-gray-500">

                                Đã điểm danh

                            </p>

                            <h3 className="font-bold text-green-600">

                                {attendanceList.length}

                            </h3>

                        </div>

                        <div>

                            <p className="text-gray-500">

                                Chưa điểm danh

                            </p>

                            <h3 className="font-bold text-red-600">

                                {

                                    totalStudents -

                                    attendanceList.length

                                }

                            </h3>

                        </div>

                    </div>

                </div>

                            {/* ============================================ */}
                    {/* CAMERA + STUDENT */}
                    {/* ============================================ */}

                    <div className="grid grid-cols-3 gap-6 mb-6">

                        {/* ======================================== */}
                        {/* CAMERA */}
                        {/* ======================================== */}

                        <div className="col-span-2">

                            <div className="bg-white rounded-xl shadow-lg p-5">

                                <h2 className="text-xl font-bold mb-4">

                                    📹 Camera trực tiếp

                                </h2>

                                <div className="relative">

                                    <video

                                        ref={videoRef}

                                        autoPlay

                                        muted

                                        playsInline

                                        className="w-full rounded-xl border bg-black"

                                    />

                                    <canvas

                                        ref={canvasRef}

                                        className="absolute top-0 left-0 w-full h-full"

                                    />

                                </div>

                            </div>

                        </div>

                        {/* ======================================== */}
                        {/* HỌC SINH VỪA NHẬN DIỆN */}
                        {/* ======================================== */}

                        <div>

                            <div className="bg-white rounded-xl shadow-lg p-5">

                                <h2 className="text-xl font-bold mb-4">

                                    👤 Học sinh vừa nhận diện

                                </h2>

                                {

                                    recognizedStudent ? (

                                        <>

                                            <div className="flex justify-center">

                                                <img

                                                    src={recognizedStudent.imageUrl}

                                                    alt="avatar"

                                                    className="w-40 h-40 rounded-full object-cover border-4 border-blue-500"

                                                />

                                            </div>

                                            <div className="mt-6 space-y-3">

                                                <p>

                                                    <b>Mã học sinh:</b>

                                                    {" "}

                                                    {recognizedStudent.studentId}

                                                </p>

                                                <p>

                                                    <b>Họ tên:</b>

                                                    {" "}

                                                    {recognizedStudent.fullName}

                                                </p>

                                                <p>

                                                    <b>Lớp:</b>

                                                    {" "}

                                                    {recognizedStudent.class}

                                                </p>

                                                <p>

                                                    <b>Khối:</b>

                                                    {" "}

                                                    {recognizedStudent.grade}

                                                </p>

                                                <p>

                                                    <b>Camera:</b>

                                                    {" "}

                                                    {selectedCamera.name}

                                                </p>

                                                <p>

                                                    <b>Thời gian:</b>

                                                    {" "}

                                                    {

                                                        new Date()

                                                            .toLocaleTimeString()

                                                    }

                                                </p>

                                            </div>

                                        </>

                                    ) : (

                                        <div className="text-center py-20">

                                            <div className="text-7xl">

                                                👤

                                            </div>

                                            <p className="mt-4 text-gray-500">

                                                Chưa nhận diện học sinh

                                            </p>

                                        </div>

                                    )

                                }

                            </div>

                        </div>

                    </div>


                                {/* ============================================ */}
            {/* ATTENDANCE TABLE */}
            {/* ============================================ */}

            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6">

                <div className="bg-blue-600 text-white p-4 flex justify-between items-center">

                    <h2 className="text-2xl font-bold">

                        📋 Danh sách điểm danh

                    </h2>

                    <div className="text-sm">

                        Tổng: {attendanceList.length} học sinh

                    </div>

                </div>

                <div className="overflow-x-auto">

                    <table className="min-w-full">

                        <thead className="bg-slate-100">

                            <tr>

                                <th className="px-4 py-3 text-center">STT</th>

                                <th className="px-4 py-3 text-center">Mã HS</th>

                                <th className="px-4 py-3 text-left">Họ và tên</th>

                                <th className="px-4 py-3 text-center">Lớp</th>

                                <th className="px-4 py-3 text-center">Khối</th>

                                <th className="px-4 py-3 text-center">Thời gian</th>

                                <th className="px-4 py-3 text-center">Trạng thái</th>

                            </tr>

                        </thead>

                        <tbody>

                            {

                                attendanceList.length === 0 ?

                                (

                                    <tr>

                                        <td

                                            colSpan={7}

                                            className="text-center py-10 text-gray-500"

                                        >

                                            Chưa có học sinh được điểm danh

                                        </td>

                                    </tr>

                                )

                                :

                                attendanceList.map((student, index) => (

                                    <tr

                                        key={student.studentId}

                                        className="border-t hover:bg-blue-50"

                                    >

                                        <td className="px-4 py-3 text-center">

                                            {index + 1}

                                        </td>

                                        <td className="px-4 py-3 text-center">

                                            {student.studentId}

                                        </td>

                                        <td className="px-4 py-3">

                                            {student.fullName}

                                        </td>

                                        <td className="px-4 py-3 text-center">

                                            {student.class}

                                        </td>

                                        <td className="px-4 py-3 text-center">

                                            {student.grade}

                                        </td>

                                        <td className="px-4 py-3 text-center">

                                            {student.time}

                                        </td>

                                        <td className="px-4 py-3 text-center">

                                            <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm">

                                                Có mặt

                                            </span>

                                        </td>

                                    </tr>

                                ))

                            }

                        </tbody>

                    </table>

                </div>

            </div>

                        {/* ============================================ */}
            {/* DASHBOARD */}
            {/* ============================================ */}

            <div className="grid grid-cols-4 gap-6 mb-6">

                <div className="bg-white rounded-xl shadow-lg p-5">

                    <p className="text-gray-500">

                        👨‍🎓 Tổng học sinh

                    </p>

                    <h2 className="text-4xl font-bold text-blue-600 mt-3">

                        {totalStudents}

                    </h2>

                </div>

                <div className="bg-white rounded-xl shadow-lg p-5">

                    <p className="text-gray-500">

                        ✅ Đã điểm danh

                    </p>

                    <h2 className="text-4xl font-bold text-green-600 mt-3">

                        {attendanceList.length}

                    </h2>

                </div>

                <div className="bg-white rounded-xl shadow-lg p-5">

                    <p className="text-gray-500">

                        ❌ Chưa điểm danh

                    </p>

                    <h2 className="text-4xl font-bold text-red-600 mt-3">

                        {

                            totalStudents -

                            attendanceList.length

                        }

                    </h2>

                </div>

                <div className="bg-white rounded-xl shadow-lg p-5">

                    <p className="text-gray-500">

                        📊 Tỷ lệ điểm danh

                    </p>

                    <h2 className="text-4xl font-bold text-purple-600 mt-3">

                        {

                            totalStudents === 0

                                ? 0

                                : Math.round(

                                      attendanceList.length *

                                          100 /

                                          totalStudents

                                  )

                        }

                        %

                    </h2>

                </div>

            </div>

            {/* ============================================ */}
            {/* FOOTER */}
            {/* ============================================ */}

            <div className="bg-white rounded-xl shadow-lg p-5">

                <div className="flex justify-between items-center">

                    <div>

                        <h2 className="font-bold text-lg">

                            Smart School AI Attendance System

                        </h2>

                        <p className="text-gray-500 mt-1">

                            Camera:

                            {" "}

                            {selectedCamera?.name}

                        </p>

                        <p className="text-gray-500">

                            Lớp:

                            {" "}

                            {selectedClass}

                        </p>

                    </div>

                    <div className="text-right">

                        <p className="text-gray-500">

                            {

                                new Date().toLocaleDateString()

                            }

                        </p>

                        <p className="text-2xl font-bold text-blue-600">

                            {

                                new Date().toLocaleTimeString()

                            }

                        </p>

                    </div>

                </div>

            </div>

        </div>

    );

}



