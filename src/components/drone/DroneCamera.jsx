import { useEffect, useRef, useState, useCallback } from "react";
import * as faceapi from "face-api.js";

import { loadLabeledImages } from "../../services/faceService";
import { getStudentsByClass } from "../../services/studentService";
import { markAttendance, getAttendance, resetAttendanceIfNewDay } from "../../services/attendanceService";

// =====================================================
// AI CONFIG & NGƯỠNG NHẬN DIỆN (Đưa ra ngoài component)
// =====================================================
const CAMERA_WIDTH = 1920;
const CAMERA_HEIGHT = 1080;
const INPUT_SIZE = 608;
const DETECTOR_SCORE = 0.55; 
const MATCH_THRESHOLD = 0.52;
const MIN_FACE_WIDTH = 35;   
const MIN_FACE_HEIGHT = 35;
const MAX_FACE = 30;

const STRICT_MATCH_THRESHOLD = 0.45; 
const REQUIRED_FRAME = 5;            
const COOLDOWN_TIME_MS = 5000;       

export default function DroneCameraAI() {
    // =====================================================
    // REFS & MOUNT CONTROL
    // =====================================================
    const isMountedRef = useRef(true);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const cameraContainerRef = useRef(null); // Ref dùng để phóng to toàn màn hình (Fullscreen)
    const detectInterval = useRef(null);
    const missionInterval = useRef(null);

    // =====================================================
    // AI & STUDENTS REFS
    // =====================================================
    const faceMatcherRef = useRef(null);
    const studentsRef = useRef([]);

    // =====================================================
    // DRONE NAVIGATION REFS
    // =====================================================
    const currentWaypointIndex = useRef(0);
    const roomsScannedAtCurrentWp = useRef(0);
    const droneStateRef = useRef("NAVIGATING_TO_WP"); 

    // =====================================================
    // CACHE & METRICS REFS
    // =====================================================
    const attendanceCache = useRef(new Set());
    const recognizeCounter = useRef({});
    const lastRecognizedTimeRef = useRef({}); 
    const lastResetDate = useRef(new Date().toDateString());

    const fpsCounter = useRef(0);
    const fpsTimer = useRef(Date.now());

    // =====================================================
    // STATE MANAGEMENT
    // =====================================================
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState("Đang khởi tạo hệ thống Drone AI...");
    const [fps, setFps] = useState(0);
    const [recognizedStudent, setRecognizedStudent] = useState(null);
    const [attendanceList, setAttendanceList] = useState([]);
    const [totalStudents, setTotalStudents] = useState(0);
    const [cameraStatus, setCameraStatus] = useState("Offline");
    const [isMissionActive, setIsMissionActive] = useState(true);

    // Zoom trong khung video
    const [zoomLevel, setZoomLevel] = useState(1); 
    
    // Phóng to toàn bộ khung màn hình UI
    const [isExpanded, setIsExpanded] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Trạng thái điều hướng Drone
    const [droneMissionStatus, setDroneMissionStatus] = useState("Đang bay tới Waypoint...");
    const [currentClassroom, setCurrentClassroom] = useState("Chưa xác định");
    const [detectedDoorSign, setDetectedDoorSign] = useState(null);

    const currentClassroomRef = useRef(currentClassroom);
    useEffect(() => {
        currentClassroomRef.current = currentClassroom;
    }, [currentClassroom]);

    const flightWaypoints = [
        { id: 1, name: "Waypoint 1 (Khu vực dãy nhà A - Tầng 2)", targetClassrooms: ["11A1", "11A2"] },
        { id: 2, name: "Waypoint 2 (Khu vực dãy nhà A - Tầng 2)", targetClassrooms: ["11A3", "11A4"] },
        { id: 3, name: "Waypoint 3 (Khu vực dãy nhà B - Tầng 2)", targetClassrooms: ["11B1", "11B2"] },
    ];

    const [selectedWaypoint, setSelectedWaypoint] = useState(flightWaypoints[0]);
    const selectedWaypointRef = useRef(selectedWaypoint);
    useEffect(() => {
        selectedWaypointRef.current = selectedWaypoint;
    }, [selectedWaypoint]);

    // =====================================================
    // BẬT / TẮT CHẾ ĐỘ TOÀN MÀN HÌNH (FULLSCREEN)
    // =====================================================
    const toggleFullscreen = () => {
        if (!cameraContainerRef.current) return;

        if (!document.fullscreenElement) {
            cameraContainerRef.current.requestFullscreen().then(() => {
                setIsFullscreen(true);
            }).catch(err => {
                console.error("Lỗi khi bật Fullscreen:", err);
            });
        } else {
            document.exitFullscreen().then(() => {
                setIsFullscreen(false);
            }).catch(err => {
                console.error("Lỗi khi thoát Fullscreen:", err);
            });
        }
    };

    // Lắng nghe sự kiện người dùng bấm ESC để thoát Fullscreen
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    // =====================================================
    // NẠP DỮ LIỆU LỚP HỌC & ĐIỂM DANH
    // =====================================================
    const loadAttendance = useCallback(async () => {
        try {
            const today = new Date().toISOString().split("T")[0];
            const list = await getAttendance(today);
            
            if (!isMountedRef.current) return;

            setAttendanceList(list || []);
            attendanceCache.current.clear();
            if (Array.isArray(list)) {
                list.forEach(student => {
                    attendanceCache.current.add(student.studentId);
                });
            }
        } catch (err) {
            console.error("Lỗi nạp danh sách điểm danh:", err);
        }
    }, []);

    const loadClassData = useCallback(async (className) => {
        try {
            if (!isMountedRef.current) return;
            setStatus(`Đang tải dữ liệu học sinh lớp ${className}...`);
            setCurrentClassroom(className);

            const [students, descriptors] = await Promise.all([
                getStudentsByClass(className),
                loadLabeledImages(className)
            ]);

            if (!isMountedRef.current) return;

            studentsRef.current = students || [];

            if (!descriptors || descriptors.length === 0) {
                console.warn(`Lớp ${className} chưa có descriptor.`);
                faceMatcherRef.current = null;
                setTotalStudents(0);
                return;
            }

            faceMatcherRef.current = new faceapi.FaceMatcher(descriptors, MATCH_THRESHOLD);
            setTotalStudents(descriptors.length);

            recognizeCounter.current = {};
            lastRecognizedTimeRef.current = {};
            attendanceCache.current.clear();
            await loadAttendance();
            setRecognizedStudent(null);
        } catch (err) {
            console.error("Lỗi khi nạp dữ liệu lớp:", err);
            if (isMountedRef.current) setStatus(`Lỗi nạp dữ liệu lớp ${className}`);
        }
    }, [loadAttendance]);

    // =====================================================
    // VÒNG LẶP ĐIỀU HƯỚNG DRONE
    // =====================================================
    const startDroneMissionLoop = useCallback(() => {
        if (missionInterval.current) clearInterval(missionInterval.current);

        missionInterval.current = setInterval(async () => {
            if (!isMountedRef.current || !isMissionActive) return;

            const activeWp = selectedWaypointRef.current;
            const activeClass = currentClassroomRef.current;

            if (droneStateRef.current === "NAVIGATING_TO_WP") {
                setDroneMissionStatus(`Drone đang bay đến ${activeWp.name}...`);
                setTimeout(() => {
                    if (isMountedRef.current) droneStateRef.current = "ALIGNING_DOOR";
                }, 3000);
            } 
            else if (droneStateRef.current === "ALIGNING_DOOR") {
                const targetClasses = activeWp.targetClassrooms;
                const currentTargetClass = targetClasses[roomsScannedAtCurrentWp.current % targetClasses.length];
                
                setDetectedDoorSign(`Phòng học: ${currentTargetClass}`);
                setDroneMissionStatus(`Đang quét khung cửa & biển số lớp ${currentTargetClass}...`);
                
                if (currentTargetClass !== activeClass) {
                    await loadClassData(currentTargetClass);
                }

                droneStateRef.current = "SCANNING_ROOM";
                setDroneMissionStatus(`Đang di chuyển vào trong lớp ${currentTargetClass} quét điểm danh...`);
            }
        }, 5000);
    }, [loadClassData, isMissionActive]);

    const moveToNextRoomOrWaypoint = useCallback(() => {
        roomsScannedAtCurrentWp.current += 1;
        
        if (roomsScannedAtCurrentWp.current % 2 === 0) {
            const nextWpIndex = (currentWaypointIndex.current + 1) % flightWaypoints.length;
            currentWaypointIndex.current = nextWpIndex;
            const nextWp = flightWaypoints[nextWpIndex];
            setSelectedWaypoint(nextWp);
            droneStateRef.current = "NAVIGATING_TO_WP";
            setDroneMissionStatus(`Hoàn thành 2 phòng, bay chuyển sang ${nextWp.name}...`);
        } else {
            droneStateRef.current = "ALIGNING_DOOR";
        }
    }, [flightWaypoints]);

    // =====================================================
    // NHẬN DIỆN KHUÔN MẶT TRÊN CAMERA DRONE
    // =====================================================
    const detectFacesOnDrone = useCallback(() => {
        if (detectInterval.current) {
            clearInterval(detectInterval.current);
            detectInterval.current = null;
        }

        detectInterval.current = setInterval(async () => {
            if (!isMountedRef.current || !videoRef.current || !faceMatcherRef.current) return;
            if (videoRef.current.readyState !== 4) return;

            // Tính FPS
            fpsCounter.current++;
            const now = Date.now();
            if (now - fpsTimer.current >= 1000) {
                if (isMountedRef.current) setFps(fpsCounter.current);
                fpsCounter.current = 0;
                fpsTimer.current = now;
            }

            if (droneStateRef.current !== "SCANNING_ROOM") return;

            try {
                // Đoạn kiểm tra readiness:
                if (!isMountedRef.current || !imgRef.current || !faceMatcherRef.current) return;

                // Thay videoRef.current bằng imgRef.current khi truyền vào faceapi.detectAllFaces
                const detections = await faceapi
                    .detectAllFaces(
                        imgRef.current,
                        new faceapi.TinyFaceDetectorOptions({
                            inputSize: INPUT_SIZE,
                            scoreThreshold: DETECTOR_SCORE
                        })
                    )
                    .withFaceLandmarks()
                    .withFaceDescriptors();

                // Lấy kích thước thực của hình ảnh
                const videoWidth = imgRef.current.naturalWidth || CAMERA_WIDTH;
                const videoHeight = imgRef.current.naturalHeight || CAMERA_HEIGHT;

                const canvas = canvasRef.current;
                if (canvas) {
                    canvas.width = videoWidth;
                    canvas.height = videoHeight;
                    const displaySize = { width: videoWidth, height: videoHeight };
                    faceapi.matchDimensions(canvas, displaySize);

                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    const ctx = canvas.getContext("2d");
                    ctx.clearRect(0, 0, canvas.width, canvas.height);

                    if (!detections.length) {
                        setStatus(`Drone đang quét lớp ${currentClassroomRef.current} (Đang tìm khuôn mặt)...`);
                        return;
                    }

                    const faces = resizedDetections
                        .filter(face => {
                            const box = face.detection.box;
                            return box.width >= MIN_FACE_WIDTH && box.height >= MIN_FACE_HEIGHT;
                        })
                        .sort((a, b) => b.detection.box.area - a.detection.box.area)
                        .slice(0, MAX_FACE);

                    // Vẽ Bounding Box
                    faces.forEach(face => {
                        const { box } = face.detection;
                        const bestMatch = faceMatcherRef.current.findBestMatch(face.descriptor);
                        const label = (bestMatch.label !== "unknown" && bestMatch.distance <= STRICT_MATCH_THRESHOLD) 
                            ? bestMatch.label 
                            : "Unknown";
                        
                        const drawBox = new faceapi.draw.DrawBox(box, { 
                            label: `${label} (${(1 - bestMatch.distance).toFixed(2)})`,
                            boxColor: label !== "Unknown" ? "#10B981" : "#EF4444"
                        });
                        drawBox.draw(canvas);
                    });

                    // Điểm danh
                    for (const face of faces) {
                        const bestMatch = faceMatcherRef.current.findBestMatch(face.descriptor);

                        if (bestMatch.label === "unknown" || bestMatch.distance > STRICT_MATCH_THRESHOLD) {
                            continue;
                        }

                        const studentId = bestMatch.label;

                        if (attendanceCache.current.has(studentId)) {
                            continue;
                        }

                        const lastTime = lastRecognizedTimeRef.current[studentId] || 0;
                        if (now - lastTime < COOLDOWN_TIME_MS) {
                            continue;
                        }

                        const student = studentsRef.current.find(item => item.studentId === studentId);
                        if (!student) continue;

                        recognizeCounter.current[studentId] = (recognizeCounter.current[studentId] || 0) + 1;

                        if (recognizeCounter.current[studentId] < REQUIRED_FRAME) {
                            continue;
                        }

                        try {
                            const success = await markAttendance(student);
                            
                            if (success && isMountedRef.current) {
                                attendanceCache.current.add(studentId);
                                lastRecognizedTimeRef.current[studentId] = Date.now();
                                delete recognizeCounter.current[studentId]; 
                                setRecognizedStudent(student);
                                await loadAttendance();
                            }
                        } catch (error) {
                            console.error(`Lỗi điểm danh cho học sinh ${studentId}:`, error);
                            delete recognizeCounter.current[studentId]; 
                        }
                    }
                }
            } catch (err) {
                console.error("Lỗi trong vòng lặp nhận diện:", err);
            }
        }, 250);
    }, [loadAttendance]);

    // =====================================================
    // CAMERA CONTROLLER
    // =====================================================
    // =====================================================
// CAMERA CONTROLLER (Đã tối ưu kết nối thẳng ESP32-CAM)
// =====================================================
    // Thay videoRef bằng imgRef ở phần khởi tạo
    const imgRef = useRef(null);

    const openDroneCamera = useCallback(async () => {
        if (!imgRef.current || !isMountedRef.current) return;

        // Địa chỉ IP stream của ESP32-CAM
        const ESP32_STREAM_URL = "http://192.168.1.113:81/stream"; 

        try {
            setCameraStatus("Đang kết nối...");
            
            imgRef.current.crossOrigin = "anonymous";
            imgRef.current.src = ESP32_STREAM_URL;

            imgRef.current.onload = () => {
                if (isMountedRef.current) {
                    setCameraStatus("Online");
                    detectFacesOnDrone(); // Bắt đầu quét AI
                }
            };

            imgRef.current.onerror = (err) => {
                console.error("Lỗi kết nối Stream ESP32-CAM:", err);
                if (isMountedRef.current) setCameraStatus("Offline");
            };
        } catch (err) {
            console.error("Không thể tải luồng video ESP32:", err);
            if (isMountedRef.current) setCameraStatus("Offline");
        }
    }, [detectFacesOnDrone]);

    // =====================================================
    // INITIALIZATION & CLEANUP
    // =====================================================
    useEffect(() => {
        isMountedRef.current = true;

        async function initialize() {
            try {
                setLoading(true);
                setStatus("Đang tải AI Models...");
                
                await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
                await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
                await faceapi.nets.faceRecognitionNet.loadFromUri("/models");

                if (!isMountedRef.current) return;

                setStatus("Đang kết nối Camera Drone...");
                await openDroneCamera();

                const initialClass = flightWaypoints[0].targetClassrooms[0];
                await loadClassData(initialClass);

                if (!isMountedRef.current) return;

                setLoading(false);
                setStatus("Drone AI đã sẵn sàng thực thi nhiệm vụ");
                startDroneMissionLoop();
            } catch (err) {
                console.error("Khởi tạo hệ thống thất bại:", err);
                if (isMountedRef.current) {
                    setStatus("Khởi tạo hệ thống Drone thất bại");
                    setLoading(false);
                }
            }
        }

        initialize();

        return () => {
            isMountedRef.current = false;
            if (detectInterval.current) clearInterval(detectInterval.current);
            if (missionInterval.current) clearInterval(missionInterval.current);
            if (videoRef.current?.srcObject) {
                videoRef.current.srcObject.getTracks().forEach(track => track.stop());
            }
        };
    }, [loadClassData, openDroneCamera, startDroneMissionLoop]);

    useEffect(() => {
        const timer = setInterval(async () => {
            const today = new Date().toDateString();
            if (today !== lastResetDate.current) {
                lastResetDate.current = today;
                attendanceCache.current.clear();
                recognizeCounter.current = {};
                lastRecognizedTimeRef.current = {};
                await resetAttendanceIfNewDay();
                await loadAttendance();
                if (isMountedRef.current) setRecognizedStudent(null);
            }
        }, 60000);

        return () => clearInterval(timer);
    }, [loadAttendance]);

    // =====================================================
    // RENDER UI
    // =====================================================
    return (
        <div className="min-h-screen bg-slate-100 p-6">
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-4xl font-bold text-indigo-700 flex items-center gap-2">
                        🛸 Smart Drone AI Attendance
                    </h1>
                    <p className="text-gray-600 mt-2">
                        Hệ thống điều hướng Drone tự động tuần tra, nhận diện khung cửa và điểm danh học sinh từ xa
                    </p>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-5 border border-indigo-100">
                    <p className="text-gray-500 text-sm">Tổng học sinh lớp {currentClassroom}</p>
                    <h2 className="text-4xl font-bold text-indigo-600">{totalStudents}</h2>
                </div>
            </div>

            {/* DRONE MISSION STATUS PANEL */}
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-xl shadow-lg p-5 mb-6">
                <div className="flex justify-between items-center mb-3">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        🛰️ Trạng thái nhiệm vụ bay của Drone
                        {isMissionActive && (
                            <span className="flex h-3 w-3 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        )}
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsMissionActive(!isMissionActive)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition ${
                                isMissionActive ? "bg-amber-400 text-gray-900" : "bg-emerald-400 text-gray-900"
                            }`}
                        >
                            {isMissionActive ? "Tạm dừng Nhiệm vụ" : "Tiếp tục Nhiệm vụ"}
                        </button>
                        {loading && (
                            <span className="bg-yellow-400 text-gray-900 text-xs px-3 py-1 rounded-full font-bold animate-pulse">
                                Đang nạp hệ thống...
                            </span>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3 text-sm">
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur">
                        <p className="opacity-80 text-xs">Waypoint hiện tại:</p>
                        <p className="text-base font-semibold mt-1">{selectedWaypoint.name}</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur">
                        <p className="opacity-80 text-xs">Trạng thái điều hướng:</p>
                        <p className="text-base font-semibold mt-1">{droneMissionStatus}</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-lg backdrop-blur">
                        <p className="opacity-80 text-xs">Biển số phòng / Lớp quét:</p>
                        <p className="text-base font-semibold mt-1">{detectedDoorSign || "Đang quét..."} ({currentClassroom})</p>
                    </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-3 items-center justify-between border-t border-white/20 pt-4">
                    <div className="flex gap-2">
                        {flightWaypoints.map((wp) => (
                            <button
                                key={wp.id}
                                onClick={() => {
                                    setSelectedWaypoint(wp);
                                    droneStateRef.current = "NAVIGATING_TO_WP";
                                }}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                                    selectedWaypoint.id === wp.id 
                                        ? "bg-white text-indigo-700 shadow" 
                                        : "bg-indigo-700/50 hover:bg-indigo-700 text-white"
                                }`}
                            >
                                {wp.name.split(" ")[0]} {wp.name.split(" ")[1]}
                            </button>
                        ))}
                    </div>
                    <button 
                        onClick={moveToNextRoomOrWaypoint}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold text-sm shadow transition flex items-center gap-2"
                    >
                        <span>Chuyển sang phòng tiếp theo ➔</span>
                    </button>
                </div>
            </div>

            {/* AI METRICS PANEL */}
            <div className="bg-white rounded-xl shadow-lg p-5 mb-6 border border-gray-100">
                <h2 className="text-lg font-bold mb-3 text-gray-800">🤖 Drone AI Status & Metrics</h2>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 text-center">
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-gray-500 text-xs">Hệ thống</p>
                        <h3 className="font-bold text-blue-600 text-xs mt-1 truncate" title={status}>{status}</h3>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-gray-500 text-xs">Camera Drone</p>
                        <h3 className={`font-bold mt-1 text-sm ${cameraStatus === "Online" ? "text-green-600" : "text-red-600"}`}>
                            {cameraStatus}
                        </h3>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-gray-500 text-xs">FPS</p>
                        <h3 className="font-bold text-orange-600 mt-1 text-sm">{fps}</h3>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-gray-500 text-xs">Sĩ số Lớp</p>
                        <h3 className="font-bold mt-1 text-sm text-gray-700">{totalStudents}</h3>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-gray-500 text-xs">Đã điểm danh</p>
                        <h3 className="font-bold text-green-600 mt-1 text-sm">{attendanceList.length}</h3>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="text-gray-500 text-xs">Chưa điểm danh</p>
                        <h3 className="font-bold text-red-600 mt-1 text-sm">{totalStudents - attendanceList.length}</h3>
                    </div>
                </div>
            </div>

            {/* CAMERA & RECOGNITION SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                
                {/* KHUNG CAMERA - CÓ THỂ MỞ RỘNG (EXPAND) HOẶC BẬT FULLSCREEN */}
                <div className={`transition-all duration-300 ${isExpanded ? "lg:col-span-3" : "lg:col-span-2"}`}>
                    <div 
                        ref={cameraContainerRef} 
                        className={`bg-white rounded-xl shadow-lg p-5 border border-gray-100 transition-all ${
                            isFullscreen ? "fixed inset-0 z-50 rounded-none p-6 bg-slate-900 flex flex-col justify-between" : ""
                        }`}
                    >
                        <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                            <h2 className={`text-lg font-bold ${isFullscreen ? "text-white" : "text-gray-800"}`}>
                                📹 Camera Trực Tiếp Từ Drone (Nhận diện xa)
                            </h2>
                            
                            {/* BỘ ĐIỀU KHIỂN PHÓNG TO & THU PHÓNG */}
                            <div className="flex items-center gap-3">
                                {/* 1. ZOOM ẢNH TRONG CANVAS/VIDEO */}
                                <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                    <span className="text-xs font-semibold text-gray-600">🔍 Zoom:</span>
                                    {[1, 1.5, 2, 2.5, 3].map((scale) => (
                                        <button
                                            key={scale}
                                            onClick={() => setZoomLevel(scale)}
                                            className={`px-2 py-0.5 text-xs font-bold rounded transition ${
                                                zoomLevel === scale 
                                                    ? "bg-indigo-600 text-white shadow-sm" 
                                                    : "bg-white text-gray-700 hover:bg-slate-200"
                                            }`}
                                        >
                                            {scale}x
                                        </button>
                                    ))}
                                </div>

                                {/* 2. NÚT MỞ RỘNG RỘNG TẢI KHUNG (GRID EXPAND) */}
                                {!isFullscreen && (
                                    <button
                                        onClick={() => setIsExpanded(!isExpanded)}
                                        className="px-3 py-1.5 text-xs font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg transition flex items-center gap-1"
                                        title="Mở rộng khung hiển thị ngang"
                                    >
                                        {isExpanded ? "↔️ Mặc định" : "↔️ Mở rộng khung"}
                                    </button>
                                )}

                                {/* 3. NÚT BẬT/TẮT FULLSCREEN TOÀN MÀN HÌNH */}
                                <button
                                    onClick={toggleFullscreen}
                                    className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition shadow flex items-center gap-1"
                                    title="Phóng to toàn bộ màn hình"
                                >
                                    {isFullscreen ? "🗗 Thu nhỏ" : "⛶ Toàn màn hình"}
                                </button>
                            </div>
                        </div>

                        {/* KHUNG VIDEO CHÍNH */}
                        <div className={`relative bg-black rounded-xl overflow-hidden ${isFullscreen ? "flex-1 my-2" : "aspect-video"}`}>
                            <div 
                                className="w-full h-full transition-transform duration-200 ease-out origin-center"
                                style={{ transform: `scale(${zoomLevel})` }}
                            >
                                <video
                                    ref={videoRef}
                                    autoPlay
                                    muted
                                    playsInline
                                    className="w-full h-full object-cover"
                                />
                                <canvas
                                    ref={canvasRef}
                                    className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                />
                            </div>

                            {/* BÁO TRẠNG THÁI ZOOM */}
                            {zoomLevel > 1 && (
                                <div className="absolute top-3 left-3 bg-black/60 text-white text-xs px-2.5 py-1 rounded-md backdrop-blur pointer-events-none font-medium border border-white/20">
                                    🔍 Đang zoom {zoomLevel}x
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* HỌC SINH VỪA NHẬN DIỆN (TỰ ĐỘNG ẨN KHI Ơ CHẾ ĐỘ EXPAND HOẶC FULLSCREEN) */}
                {!isExpanded && !isFullscreen && (
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-xl shadow-lg p-5 border border-gray-100 h-full flex flex-col justify-between">
                            <div>
                                <h2 className="text-lg font-bold mb-4 text-gray-800">👤 Học sinh vừa nhận diện</h2>
                                {recognizedStudent ? (
                                    <div className="animate-fade-in">
                                        <div className="flex justify-center">
                                            <img
                                                src={recognizedStudent.imageUrl || "https://via.placeholder.com/150"}
                                                alt="avatar"
                                                className="w-36 h-36 rounded-full object-cover border-4 border-indigo-500 shadow-md"
                                            />
                                        </div>
                                        <div className="mt-5 space-y-2 text-sm bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                            <p><b>Mã HS:</b> <span className="text-indigo-700 font-semibold">{recognizedStudent.studentId}</span></p>
                                            <p><b>Họ tên:</b> <span className="text-indigo-700 font-semibold">{recognizedStudent.fullName}</span></p>
                                            <p><b>Lớp:</b> {recognizedStudent.class}</p>
                                            <p><b>Khối:</b> {recognizedStudent.grade}</p>
                                            <p><b>Vị trí Drone:</b> {selectedWaypoint.name}</p>
                                            <p><b>Thời gian:</b> {new Date().toLocaleTimeString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-16">
                                        <div className="text-5xl animate-bounce">🛸</div>
                                        <p className="mt-4 text-gray-400 text-sm">Drone đang quét tìm học sinh trong phòng...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* BẢNG ĐIỂM DANH */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-6 border border-gray-100">
                <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold">📋 Danh sách điểm danh lớp {currentClassroom}</h2>
                    <div className="text-xs bg-indigo-700 px-3 py-1 rounded-full">Tổng: {attendanceList.length} học sinh</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left">
                        <thead className="bg-slate-50 text-gray-600 uppercase text-xs">
                            <tr>
                                <th className="px-4 py-3 text-center">STT</th>
                                <th className="px-4 py-3 text-center">Mã HS</th>
                                <th className="px-4 py-3">Họ và tên</th>
                                <th className="px-4 py-3 text-center">Lớp</th>
                                <th className="px-4 py-3 text-center">Khối</th>
                                <th className="px-4 py-3 text-center">Thời gian</th>
                                <th className="px-4 py-3 text-center">Trạng thái</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {attendanceList.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="text-center py-8 text-gray-400">
                                        Chưa có học sinh nào được điểm danh tại phòng này
                                    </td>
                                </tr>
                            ) : (
                                attendanceList.map((student, index) => (
                                    <tr 
                                        key={student.studentId || index} 
                                        className="hover:bg-slate-50/80 transition-colors"
                                    >
                                        <td className="px-4 py-3 text-center font-medium text-gray-500">
                                            {index + 1}
                                        </td>
                                        <td className="px-4 py-3 text-center font-semibold text-indigo-600">
                                            {student.studentId}
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {student.fullName}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600">
                                            {student.class || currentClassroom}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-600">
                                            {student.grade || "—"}
                                        </td>
                                        <td className="px-4 py-3 text-center text-gray-500 text-xs">
                                            {student.timestamp 
                                                ? new Date(student.timestamp).toLocaleTimeString() 
                                                : new Date().toLocaleTimeString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Đã điểm danh
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* FOOTER */}
            <div className="bg-white rounded-xl shadow-lg p-4 border border-gray-100">
                <div className="flex justify-between items-center text-xs text-gray-500">
                    <div>
                        <p className="font-bold text-gray-700 text-sm">Smart Drone AI Attendance System</p>
                        <p className="mt-0.5">Lộ trình: {selectedWaypoint.name} | Phòng: {currentClassroom}</p>
                    </div>
                    <div className="text-right">
                        <p>{new Date().toLocaleDateString("vi-VN")}</p>
                        <p className="text-base font-bold text-indigo-600">{new Date().toLocaleTimeString("vi-VN")}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}