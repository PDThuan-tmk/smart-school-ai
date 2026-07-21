import { useState, useEffect } from "react";

import {
    removeDuplicateStudents
} from "../services/studentService";

import StudentToolbar from "../components/students/StudentToolbar";
import StudentTable from "../components/students/StudentTable";
import StudentModal from "../components/students/StudentModal";
import { listenAttendance } from "../services/attendanceService";
import { getAttendance } from "../services/attendanceService";

import {
    addStudent,
    getStudents,
    listenStudents
} from "../services/studentService";

import ImportExcel from "../components/students/ImportExcel";

export default function Students() {

  const [open, setOpen] = useState(false);
  const [students, setStudents] = useState([]);

  // Tải danh sách học sinh
  async function loadStudents() {

      const data = await getStudents();

      const today = new Date()
          .toISOString()
          .split("T")[0];

      const attendance = await getAttendance(today);

      const attendanceMap = {};

      attendance.forEach(item => {

          attendanceMap[item.studentId] = true;

      });

      const result = data.map(student => ({

          ...student,

          attendance:
              attendanceMap[student.studentId]
                  ? "Có mặt"
                  : "Vắng"

      }));

      setStudents(result);

  }

  async function handleRemoveDuplicate() {

        const ok = window.confirm(
            "Bạn có chắc muốn xóa các học sinh bị trùng không?"
        );

        if (!ok) return;

        const deleted = await removeDuplicateStudents();

        alert(`Đã xóa ${deleted} học sinh trùng.`);

        // Nếu trang có hàm loadStudents thì gọi lại
        await loadStudents();

    }

  // Khi mở trang sẽ tự tải dữ liệu
  useEffect(() => {

      let attendanceMap = {};

      const today = new Date()
          .toISOString()
          .split("T")[0];

      const unsubscribeStudents = listenStudents((studentList) => {

          const result = studentList.map(student => ({

              ...student,

              attendance:
                  attendanceMap[student.studentId]
                      ? "Có mặt"
                      : "Vắng"

          }));

          setStudents(result);

      });

      const unsubscribeAttendance = listenAttendance(

          today,

          (attendanceList) => {

              attendanceMap = {};

              attendanceList.forEach(item => {

                  attendanceMap[item.studentId] = true;

              });

              loadStudents();

          }

      );

      return () => {

          unsubscribeStudents();

          unsubscribeAttendance();

      };

  }, []);

  // Lưu học sinh mới
  async function saveStudent(student) {

    await addStudent(student);

    await loadStudents();

    alert("Đã lưu học sinh!");

  }

  return (

    <>

      <h1 className="text-4xl font-bold">

        👨‍🎓 Quản lý học sinh

      </h1>

      <p className="text-gray-500 mt-2 mb-8">

        Quản lý thông tin học sinh

      </p>

      <StudentToolbar
        onAdd={() => setOpen(true)}
      />

      <div className="my-4">

          <button
              onClick={handleRemoveDuplicate}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-lg"
          >
              🗑 Xóa học sinh trùng
          </button>

      </div>

      
      <ImportExcel />

      <StudentTable
        students={students}
      />

      <StudentModal
        open={open}
        onClose={() => setOpen(false)}
        onSave={saveStudent}
      />

    </>

  );

}