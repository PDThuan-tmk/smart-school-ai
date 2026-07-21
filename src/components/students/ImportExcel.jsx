import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import * as XLSX from "xlsx";
import * as faceapi from "face-api.js";

import ProgressBar from "../../components/import/ProgressBar";
import ValidationDashboard from "../../components/import/ValidationDashboard";

import { normalizeName } from "../../services/nameService";
import { pickVideoFolder } from "../../services/folderService";
import { addStudentDescriptor, getAllStudentIds } from "../../services/studentService";

function createStudentKey(fullName, birthDate) {
    if (!fullName || !birthDate) return "";
    const name = fullName
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "D")
        .replace(/\s+/g, "")
        .toLowerCase();

    const date = new Date(birthDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");

    return `${name}${day}${month}`;
}

export default function ImportExcel() {
    // =====================================================
    // STATE
    // =====================================================
    const [students, setStudents] = useState([]);
    const [videoFiles, setVideoFiles] = useState([]);
    const [imageFiles, setImageFiles] = useState([]);
    const [filteredStudents, setFilteredStudents] = useState([]);
    const [keyword, setKeyword] = useState("");
    const [filter, setFilter] = useState("all");
    const [progress, setProgress] = useState(0);
    const [isImporting, setIsImporting] = useState(false);
    const [stopImport, setStopImport] = useState(false);
    const [isProcessingVideo, setIsProcessingVideo] = useState(false);
    const [isProcessingPortrait, setIsProcessingPortrait] = useState(false);
    const [logs, setLogs] = useState([]);
    const [duplicateIds, setDuplicateIds] = useState(new Set());
    const [videoStatus, setVideoStatus] = useState({});
    const [descriptorData, setDescriptorData] = useState({});
    const [portraitData, setPortraitData] = useState({});
    const [previewVideo, setPreviewVideo] = useState(null);
    const [importSummary, setImportSummary] = useState(null);

    const [validation, setValidation] = useState({
        duplicate: 0,
        noId: 0,
        noName: 0,
        noBirth: 0,
        noClass: 0,
        noVideo: 0,
        invalidVideo: 0,
        noFace: 0
    });

    const BATCH_SIZE = 5;

    // Load AI Models
    useEffect(() => {
        async function loadModels() {
            try {
                console.log("Loading FaceAPI...");
                await faceapi.nets.tinyFaceDetector.loadFromUri("/models");
                await faceapi.nets.faceLandmark68Net.loadFromUri("/models");
                await faceapi.nets.faceRecognitionNet.loadFromUri("/models");
                console.log("✅ FaceAPI Loaded");
            } catch (err) {
                console.error("Lỗi load model AI:", err);
            }
        }
        loadModels();
    }, []);

    // Cleanup preview URLs
    useEffect(() => {
        return () => {
            videoFiles.forEach(file => file.preview && URL.revokeObjectURL(file.preview));
            imageFiles.forEach(file => file.preview && URL.revokeObjectURL(file.preview));
        };
    }, [videoFiles, imageFiles]);

    // =====================================================
    // HELPER FUNCTIONS
    // =====================================================
    function addLog(message) {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [...prev, `${time}  ${message}`]);
    }

    function resetImport() {
        setStudents([]);
        setDescriptorData({});
        setPortraitData({});
        setPreviewVideo(null);
        setImportSummary(null);
        setStopImport(false);
        setFilteredStudents([]);
        setVideoFiles([]);
        setImageFiles([]);
        setProgress(0);
        setKeyword("");
        setFilter("all");
        setDuplicateIds(new Set());
        setVideoStatus({});
        setValidation({
            duplicate: 0,
            noId: 0,
            noName: 0,
            noBirth: 0,
            noClass: 0,
            noVideo: 0,
            invalidVideo: 0,
            noFace: 0
        });
    }

    function getVideo(student) {
        const key = (student.video || normalizeName(student.fullName, student.birthDate))
            .toLowerCase()
            .trim()
            .replace(/\.[^/.]+$/, "");

        return videoFiles.find(file => {
            const fileName = file.name.toLowerCase().trim().replace(/\.[^/.]+$/, "");
            return fileName === key;
        });
    }

    function getPortrait(student) {
        const imageName = String(student.image || "").trim().toLowerCase();
        return imageFiles.find(file => {
            const fileName = file.name.replace(/\.[^/.]+$/, "").trim().toLowerCase();
            return fileName === imageName;
        });
    }

    function hasVideo(student) {
        return !!getVideo(student);
    }

    // Filter Students List
    useEffect(() => {
        let result = [...students];

        if (keyword.trim()) {
            const key = keyword.toLowerCase().trim();
            result = result.filter(student =>
                student.studentId?.toLowerCase().includes(key) ||
                student.fullName?.toLowerCase().includes(key) ||
                student.class?.toLowerCase().includes(key) ||
                student.grade?.toLowerCase().includes(key)
            );
        }

        switch (filter) {
            case "video":
                result = result.filter(student => hasVideo(student));
                break;
            case "novideo":
                result = result.filter(student => !hasVideo(student));
                break;
            case "ready":
                result = result.filter(student =>
                    student.studentId && student.fullName && student.birthDate && student.class && hasVideo(student)
                );
                break;
            case "error":
                result = result.filter(student =>
                    !student.studentId || !student.fullName || !student.birthDate || !student.class || !hasVideo(student)
                );
                break;
            default:
                break;
        }

        setFilteredStudents(result);
    }, [students, keyword, filter, videoFiles]);

    // Update Validation Dashboard Data
    useEffect(() => {
        if (students.length === 0) return;

        let report = {
            duplicate: duplicateIds.size,
            noId: 0,
            noName: 0,
            noBirth: 0,
            noClass: 0,
            noVideo: 0,
            invalidVideo: 0,
            noFace: 0
        };

        students.forEach(student => {
            const ai = descriptorData[student.studentId];
            if (ai?.status === "noface") report.noFace++;
            if (!student.studentId) report.noId++;
            if (!student.fullName) report.noName++;
            if (!student.birthDate) report.noBirth++;
            if (!student.class) report.noClass++;

            const video = getVideo(student);
            if (!video) {
                report.noVideo++;
                return;
            }

            const status = videoStatus[video.name];
            if (status === "error" || status === "short" || status === "small") {
                report.invalidVideo++;
            }
        });

        setValidation(report);
    }, [students, videoFiles, videoStatus, descriptorData, duplicateIds]);

    // =====================================================
    // EXCEL & FOLDER HANDLERS
    // =====================================================
    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        if (!file) return;

        addLog("📄 Đang đọc file Excel...");
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(e.target.result, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: "" });

                const map = new Map();
                const duplicate = new Set();

                json.forEach(student => {
                    const id = String(student.studentId || "").trim();
                    if (!id) return;
                    if (map.has(id)) duplicate.add(id);
                    else map.set(id, true);
                });

                const studentsData = json.map(student => ({
                    studentId: String(student.studentId || "").trim(),
                    fullName: String(student.fullName || "").trim(),
                    birthDate: String(student.birthDate || "").trim(),
                    class: String(student.class || "").trim(),
                    grade: String(student.grade || "").trim(),
                    gender: String(student.gender || "").trim(),
                    phoneParent: String(student.phoneParent || "").trim(),
                    image: String(student.image || "").trim().toLowerCase(),
                    video: String(student.video || "").trim().toLowerCase()
                }));

                setStudents(studentsData);
                setDuplicateIds(duplicate);
                addLog(`✅ Đã đọc ${studentsData.length} học sinh`);
                if (duplicate.size > 0) addLog(`⚠ Có ${duplicate.size} mã học sinh bị trùng`);
            } catch (err) {
                console.error(err);
                addLog("❌ Không thể đọc file Excel.");
                alert("File Excel không hợp lệ.");
            }
        };
        reader.readAsArrayBuffer(file);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"]
        },
        multiple: false,
        onDrop
    });

    async function handleChooseImageFolder() {
        try {
            const picker = await window.showDirectoryPicker();
            const files = [];

            // Quét tất cả các đuôi ảnh phổ biến: jpg, jpeg, png, webp, jfif, bmp, gif, avif, heic, svg, tif...
            const imageExtensionRegex = /\.(jpg|jpeg|png|webp|jfif|bmp|gif|avif|heic|svg|tiff?)$/i;

            async function readFolder(folder) {
                for await (const entry of folder.values()) {
                    if (entry.kind === "directory") {
                        await readFolder(entry);
                    } else if (imageExtensionRegex.test(entry.name)) {
                        const file = await entry.getFile();
                        file.preview = URL.createObjectURL(file);
                        files.push(file);
                    }
                }
            }

            await readFolder(picker);
            setImageFiles(files);
            addLog(`📸 Đã chọn ${files.length} ảnh (Bao gồm mọi định dạng ảnh)`);
        } catch (err) {
            console.error("Lỗi chọn thư mục ảnh:", err);
        }
    }

    async function handleChooseFolder() {
        try {
            addLog("📂 Đang đọc thư mục video...");
            const files = await pickVideoFolder();
            if (!files || files.length === 0) {
                alert("Không tìm thấy video.");
                return;
            }

            const videos = files.map(file => {
                file.preview = URL.createObjectURL(file);
                return file;
            });

            setVideoFiles(videos);
            addLog(`🎥 Đã đọc ${videos.length} video.`);
            alert(`Đã chọn ${videos.length} video.`);
        } catch (err) {
            console.error(err);
            alert("Không thể mở thư mục video.");
        }
    }

    // =====================================================
    // AI PROCESSORS
    // =====================================================
    async function createDescriptorFromImage(imageFile) {
        let imgElement;

        try {
            // Thử nạp ảnh chuẩn bằng faceapi
            imgElement = await faceapi.bufferToImage(imageFile);
        } catch (e) {
            // Nếu đuôi ảnh lạ gây lỗi, chuyển đổi sang Canvas chuẩn HTML5
            imgElement = await new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0);
                    
                    const convertedImg = new Image();
                    convertedImg.onload = () => resolve(convertedImg);
                    convertedImg.onerror = reject;
                    convertedImg.src = canvas.toDataURL("image/png");
                };
                img.onerror = reject;
                img.src = imageFile.preview || URL.createObjectURL(imageFile);
            });
        }

        if (!imgElement) return null;

        // Tiến hành nhận diện khuôn mặt
        const detection = await faceapi
            .detectSingleFace(imgElement, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();

        if (!detection) return null;
        return Array.from(detection.descriptor);
    }

    async function handlePortraitAI() {
        if (students.length === 0) return alert("Chưa import Excel.");
        if (imageFiles.length === 0) return alert("Chưa chọn thư mục ảnh.");

        setIsProcessingPortrait(true);
        addLog("🖼 Bắt đầu AI đọc ảnh...");
        const result = {};
        let ok = 0, fail = 0;

        for (const student of students) {
            const image = getPortrait(student);
            if (!image) {
                result[student.studentId] = { status: "noimage" };
                fail++;
                continue;
            }

            try {
                const descriptor = await createDescriptorFromImage(image);
                if (!descriptor) {
                    result[student.studentId] = { status: "noface" };
                    fail++;
                } else {
                    result[student.studentId] = { status: "ready", descriptor };
                    ok++;
                }
            } catch (e) {
                result[student.studentId] = { status: "error" };
                fail++;
            }
        }

        setPortraitData(result);
        setIsProcessingPortrait(false);
        addLog(`✅ AI ảnh: ${ok} thành công, ${fail} thất bại`);
    }

    async function createDescriptorsFromVideo(videoFile) {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(videoFile);
        video.muted = true;
        video.playsInline = true;

        await new Promise(resolve => { video.onloadedmetadata = resolve; });
        await video.play();

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const descriptors = [];

        let current = 0;
        while (current < video.duration) {
            video.currentTime = current;
            await new Promise(resolve => { video.onseeked = resolve; });

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const detection = await faceapi
                .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                descriptors.push(Array.from(detection.descriptor));
            }
            current += 0.5;
        }

        video.pause();
        URL.revokeObjectURL(video.src);
        return descriptors;
    }

    async function processVideos() {
        if (students.length === 0) return alert("Chưa có danh sách học sinh.");
        if (videoFiles.length === 0) return alert("Chưa chọn thư mục Video.");

        setIsProcessingVideo(true);
        setProgress(0);
        addLog("🤖 AI bắt đầu xử lý Video...");

        const result = {};
        const startTime = Date.now();
        let processed = 0;

        for (let start = 0; start < students.length; start += BATCH_SIZE) {
            if (stopImport) {
                addLog("🛑 Đã dừng AI.");
                break;
            }

            const batch = students.slice(start, start + BATCH_SIZE);

            await Promise.all(
                batch.map(async (student) => {
                    const video = getVideo(student);
                    if (!video) {
                        result[student.studentId] = { status: "novideo" };
                        processed++;
                        return;
                    }

                    try {
                        const descriptors = await createDescriptorsFromVideo(video);
                        const portraitDescriptors = portraitData[student.studentId]?.descriptor
                            ? [portraitData[student.studentId].descriptor]
                            : [];

                        if (!descriptors || descriptors.length === 0) {
                            result[student.studentId] = { status: "noface", descriptors: [] };
                        } else {
                            result[student.studentId] = {
                                status: "ready",
                                descriptors: [...portraitDescriptors, ...descriptors]
                            };
                        }
                    } catch (err) {
                        result[student.studentId] = { status: "error" };
                    }

                    processed++;
                    const percent = Math.round((processed / students.length) * 100);
                    setProgress(percent);
                    const elapsed = (Date.now() - startTime) / 1000;
                    const avg = elapsed / processed;
                    const remain = Math.round(avg * (students.length - processed));

                    addLog(`🎥 ${processed}/${students.length} (${percent}%) - Còn khoảng ${remain}s`);
                })
            );
        }

        setDescriptorData(result);
        setProgress(100);
        setIsProcessingVideo(false);
        addLog("🎉 AI xử lý video hoàn tất.");
    }

    async function validateVideos() {
        if (videoFiles.length === 0) return alert("Vui lòng chọn thư mục Video.");

        addLog("🎥 Đang kiểm tra video...");
        setIsProcessingVideo(true);
        const result = {};

        for (const file of videoFiles) {
            try {
                const video = document.createElement("video");
                video.preload = "metadata";
                video.src = file.preview;

                await new Promise((resolve, reject) => {
                    video.onloadedmetadata = () => resolve();
                    video.onerror = () => reject();
                });

                if (video.duration < 3) {
                    result[file.name] = "short";
                } else if (video.videoWidth < 320 || video.videoHeight < 240) {
                    result[file.name] = "small";
                } else {
                    result[file.name] = "ok";
                }
            } catch {
                result[file.name] = "error";
            }
        }

        setVideoStatus(result);
        setIsProcessingVideo(false);
        addLog("🎉 Kiểm tra video hoàn tất.");
    }

    // =====================================================
    // FIREBASE IMPORT & EXPORT
    // =====================================================
    async function handleImport() {
        if (duplicateIds.size > 0) return alert("Danh sách có mã học sinh bị trùng.");
        if (students.length === 0) return alert("Chưa có danh sách học sinh.");
        if (Object.keys(descriptorData).length === 0 && Object.keys(portraitData).length === 0) {
            return alert("Hãy chạy AI xử lý Ảnh/Video trước.");
        }

        setIsImporting(true);
        setProgress(0);

        try {
            const existedIds = await getAllStudentIds();
            let success = 0, fail = 0, processed = 0;

            for (const student of students) {
                if (stopImport) {
                    addLog("🛑 Đã dừng Import.");
                    break;
                }

                if (existedIds.has(student.studentId)) {
                    addLog(`⏩ ${student.studentId} đã tồn tại`);
                    fail++;
                    continue;
                }

                const video = getVideo(student);
                const portrait = portraitData[student.studentId];
                const ai = descriptorData[student.studentId];

                let descriptors = [];
                if (portrait?.status === "ready") descriptors.push(portrait.descriptor);
                if (ai?.status === "ready") descriptors.push(...ai.descriptors);

                if (descriptors.length === 0) {
                    fail++;
                    continue;
                }

                try {
                    const image = getPortrait(student);
                    const newStudent = {
                        studentId: String(student.studentId).trim(),
                        fullName: String(student.fullName).trim(),
                        birthDate: String(student.birthDate).trim(),
                        class: String(student.class).trim(),
                        grade: String(student.grade).trim(),
                        gender: String(student.gender).trim(),
                        phoneParent: String(student.phoneParent || "").trim(),
                        imageName: image ? image.name : "",
                        videoName: video ? video.name : "",
                        descriptorCount: descriptors.length,
                        descriptor0: descriptors[0] || null,
                        descriptor1: descriptors[1] || null,
                        descriptor2: descriptors[2] || null,
                        descriptor3: descriptors[3] || null,
                        descriptor4: descriptors[4] || null,
                        hasPortrait: portrait?.status === "ready",
                        hasMultiDescriptor: descriptors.length >= 2,
                        needRegister: descriptors.length === 1,
                        portraitVerified: false,
                        attendance: "Vắng",
                        createdAt: new Date().toISOString()
                    };

                    await addStudentDescriptor(newStudent);
                    existedIds.add(newStudent.studentId);
                    success++;
                } catch (err) {
                    console.error("🔥 Lỗi lưu Firebase:", err);
                    fail++;
                }

                processed++;
                setProgress(Math.round((processed / students.length) * 100));
            }

            setProgress(100);
            setIsImporting(false);
            setImportSummary({ total: students.length, success, fail, time: new Date().toLocaleString() });
            addLog(`🎉 Import hoàn tất. Thành công: ${success}, Thất bại: ${fail}`);
        } catch (err) {
            console.error("Lỗi Import:", err);
            setIsImporting(false);
        }
    }

    function downloadLog() {
        if (logs.length === 0) return alert("Chưa có log.");
        const blob = new Blob([logs.join("\n")], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ImportLog.txt";
        a.click();
        URL.revokeObjectURL(url);
    }

    function exportReport() {
        const rows = students.map(student => {
            const ai = descriptorData[student.studentId];
            return {
                studentId: student.studentId,
                fullName: student.fullName,
                birthDate: student.birthDate,
                class: student.class,
                grade: student.grade,
                gender: student.gender,
                phoneParent: student.phoneParent,
                image: student.image,
                video: student.video,
                status: ai?.status || "Chưa xử lý",
                descriptors: ai?.descriptors?.length || 0
            };
        });

        const sheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, sheet, "Import");
        XLSX.writeFile(workbook, "BaoCaoImport.xlsx");
    }

    // Dynamic Stats Calculations
    const stats = {
        total: students.length,
        hasVideo: students.filter(student => hasVideo(student)).length,
        noVideo: students.filter(student => !hasVideo(student)).length,
        ready: students.filter(student => {
            const ai = descriptorData[student.studentId];
            return hasVideo(student) && ai && ai.status === "ready";
        }).length,
        duplicate: duplicateIds.size,
        imported: Object.values(descriptorData).filter(item => item.status === "ready").length
    };

    // =====================================================
    // RENDER JSX
    // =====================================================
    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-8">📥 Import danh sách học sinh bằng Video AI</h1>

            {/* Dashboard Thống Kê */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
                <div className="bg-blue-500 text-white rounded-xl p-5">
                    <div className="text-3xl">👨‍🎓</div>
                    <div className="text-2xl font-bold">{stats.total}</div>
                    <div>Tổng học sinh</div>
                </div>
                <div className="bg-green-500 text-white rounded-xl p-5">
                    <div className="text-3xl">🎥</div>
                    <div className="text-2xl font-bold">{stats.hasVideo}</div>
                    <div>Có Video</div>
                </div>
                <div className="bg-red-500 text-white rounded-xl p-5">
                    <div className="text-3xl">❌</div>
                    <div className="text-2xl font-bold">{stats.noVideo}</div>
                    <div>Thiếu Video</div>
                </div>
                <div className="bg-purple-600 text-white rounded-xl p-5">
                    <div className="text-3xl">🤖</div>
                    <div className="text-2xl font-bold">{stats.imported}</div>
                    <div>AI xử lý</div>
                </div>
                <div className="bg-emerald-600 text-white rounded-xl p-5">
                    <div className="text-3xl">✔</div>
                    <div className="text-2xl font-bold">{stats.ready}</div>
                    <div>Sẵn sàng Import</div>
                </div>
                <div className="bg-orange-500 text-white rounded-xl p-5">
                    <div className="text-3xl">⚠</div>
                    <div className="text-2xl font-bold">{stats.duplicate}</div>
                    <div>Trùng mã HS</div>
                </div>
            </div>

            {/* Upload Excel */}
            <div
                {...getRootProps()}
                className="border-2 border-dashed border-blue-500 rounded-2xl p-10 text-center cursor-pointer hover:bg-blue-50 transition mt-6"
            >
                <input {...getInputProps()} />
                {isDragActive ? (
                    <p className="text-xl">📄 Thả file Excel vào đây...</p>
                ) : (
                    <>
                        <h2 className="text-2xl font-bold">📄 Kéo thả file Excel</h2>
                        <p className="text-gray-500 mt-3">hoặc nhấn để chọn</p>
                    </>
                )}
            </div>

            {/* Actions Bar */}
            <div className="flex gap-4 mt-6 flex-wrap">
                <button onClick={handleChooseImageFolder} className="bg-pink-600 hover:bg-pink-700 text-white px-5 py-3 rounded-xl">
                    📸 Chọn thư mục Ảnh
                </button>
                <button onClick={handleChooseFolder} className="bg-green-600 hover:bg-green-700 text-white px-5 py-3 rounded-xl">
                    📁 Chọn thư mục Video
                </button>
                <button onClick={handlePortraitAI} disabled={isProcessingPortrait} className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-xl">
                    🖼 AI đọc Ảnh
                </button>
                <button onClick={validateVideos} disabled={isProcessingVideo} className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-xl">
                    🎥 Kiểm tra Video
                </button>
                <button onClick={processVideos} disabled={isProcessingVideo} className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-5 py-3 rounded-xl">
                    🤖 AI xử lý Video
                </button>
            </div>

            {/* Progress & Summary */}
            <div className="mt-6">
                {importSummary && (
                    <div className="bg-green-100 rounded-xl p-6 mb-4">
                        <h2 className="text-2xl font-bold mb-4">🎉 Kết quả Import</h2>
                        <p>Tổng học sinh: <b>{importSummary.total}</b></p>
                        <p>Thành công: <b className="text-green-600">{importSummary.success}</b></p>
                        <p>Lỗi: <b className="text-red-600">{importSummary.fail}</b></p>
                        <p>Hoàn thành lúc: <b>{importSummary.time}</b></p>
                        <div className="flex gap-4 mt-5">
                            <button onClick={exportReport} className="bg-blue-600 text-white px-5 py-2 rounded-xl">📄 Xuất Excel</button>
                            <button onClick={downloadLog} className="bg-purple-600 text-white px-5 py-2 rounded-xl">📜 Tải Log</button>
                            <button onClick={resetImport} className="bg-gray-600 text-white px-5 py-2 rounded-xl">🔄 Import mới</button>
                        </div>
                    </div>
                )}
                <ProgressBar progress={progress} isImporting={isImporting} stopImport={stopImport} />
            </div>

            {/* Validation Dashboard */}
            <div className="mt-6">
                <ValidationDashboard validation={validation} />
            </div>

            {/* Actions Import */}
            <div className="mt-6 flex gap-4">
                <button onClick={handleImport} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl">
                    📥 Import Firebase
                </button>
                <button onClick={resetImport} className="bg-gray-500 hover:bg-gray-600 text-white px-6 py-3 rounded-xl">
                    🔄 Reset
                </button>
            </div>

            {/* Logs Viewer */}
            {logs.length > 0 && (
                <div className="mt-6 bg-black text-green-400 rounded-xl p-4 h-72 overflow-y-auto font-mono text-sm">
                    {logs.map((log, index) => (
                        <div key={index}>{log}</div>
                    ))}
                </div>
            )}

            {/* Video Preview Modal */}
            {previewVideo && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6">
                        <video src={previewVideo.preview} controls autoPlay className="max-h-[600px] rounded-xl" />
                        <div className="text-center mt-5">
                            <button onClick={() => setPreviewVideo(null)} className="bg-red-600 text-white px-6 py-2 rounded-xl">
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Học Sinh */}
            {students.length > 0 && (
                <>
                    <div className="mt-8">
                        <input
                            type="text"
                            value={keyword}
                            onChange={(e) => setKeyword(e.target.value)}
                            placeholder="🔍 Tìm theo mã HS, họ tên, lớp..."
                            className="w-full border rounded-xl p-3"
                        />
                    </div>

                    <div className="overflow-x-auto mt-6 rounded-xl shadow">
                        <table className="min-w-full bg-white">
                            <thead className="bg-blue-600 text-white">
                                <tr>
                                    <th className="p-3">STT</th>
                                    <th>Mã HS</th>
                                    <th>Họ tên</th>
                                    <th>Ngày sinh</th>
                                    <th>Lớp</th>
                                    <th>Khối</th>
                                    <th>Giới tính</th>
                                    <th>Video</th>
                                    <th>AI</th>
                                    <th>Descriptors</th>
                                    <th>Trạng thái</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student, index) => {
                                    const video = getVideo(student);
                                    const ai = descriptorData[student.studentId];

                                    return (
                                        <tr key={student.studentId || index} className="border-b hover:bg-slate-50">
                                            <td className="p-3">{index + 1}</td>
                                            <td>{student.studentId}</td>
                                            <td>{student.fullName}</td>
                                            <td>{student.birthDate}</td>
                                            <td>{student.class}</td>
                                            <td>{student.grade}</td>
                                            <td>{student.gender}</td>
                                            <td className="text-center">
                                                {video ? (
                                                    <video
                                                        src={video.preview}
                                                        controls
                                                        className="w-28 rounded-lg cursor-pointer"
                                                        onClick={() => setPreviewVideo(video)}
                                                    />
                                                ) : (
                                                    <span>❌</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {!ai ? (
                                                    <span className="text-gray-500">Chưa xử lý</span>
                                                ) : ai.status === "ready" ? (
                                                    <span className="text-green-600 font-bold">✅ OK</span>
                                                ) : ai.status === "noface" ? (
                                                    <span className="text-red-600 font-bold">🚫 Không có mặt</span>
                                                ) : ai.status === "novideo" ? (
                                                    <span className="text-orange-600">📂 Thiếu Video</span>
                                                ) : (
                                                    <span className="text-red-600">❌ Lỗi</span>
                                                )}
                                            </td>
                                            <td className="text-center">
                                                {ai?.descriptors ? ai.descriptors.length : 0}
                                            </td>
                                            <td className="text-center">
                                                {duplicateIds.has(student.studentId) ? (
                                                    <span className="text-orange-600 font-bold">⚠ Trùng mã</span>
                                                ) : !video ? (
                                                    <span className="text-red-600 font-bold">❌ Thiếu Video</span>
                                                ) : ai?.status === "ready" ? (
                                                    <span className="text-green-600 font-bold">✔ Sẵn sàng</span>
                                                ) : (
                                                    <span className="text-yellow-600">Đợi AI</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </>
            )}
        </div>
    );
}