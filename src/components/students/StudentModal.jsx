import { useState } from "react";

export default function StudentModal({ open, onClose, onSave }) {

  const [student, setStudent] = useState({
    studentId: "",
    fullName: "",
    class: "",
    grade: "",
    gender: "Nam"
  });

  if (!open) return null;

  function handleChange(e) {
    setStudent({
      ...student,
      [e.target.name]: e.target.value
    });
  }

  function handleSubmit() {
    onSave(student);

    setStudent({
      studentId: "",
      fullName: "",
      class: "",
      grade: "",
      gender: "Nam"
    });

    onClose();
  }

  return (

    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">

      <div className="bg-white rounded-2xl p-8 w-[500px]">

        <h2 className="text-2xl font-bold mb-6">

          Thêm học sinh

        </h2>

        <div className="space-y-4">

          <input
            name="studentId"
            placeholder="Mã học sinh"
            onChange={handleChange}
            value={student.studentId}
            className="border p-3 rounded-xl w-full"
          />

          <input
            name="fullName"
            placeholder="Họ tên"
            onChange={handleChange}
            value={student.fullName}
            className="border p-3 rounded-xl w-full"
          />

          <input
            name="class"
            placeholder="Lớp"
            onChange={handleChange}
            value={student.class}
            className="border p-3 rounded-xl w-full"
          />

          <input
            name="grade"
            placeholder="Khối"
            onChange={handleChange}
            value={student.grade}
            className="border p-3 rounded-xl w-full"
          />

          <select
            name="gender"
            onChange={handleChange}
            value={student.gender}
            className="border p-3 rounded-xl w-full"
          >
            <option>Nam</option>
            <option>Nữ</option>
          </select>

        </div>

        <div className="flex justify-end gap-4 mt-8">

          <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 rounded-xl"
          >
            Hủy
          </button>

          <button
            onClick={handleSubmit}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl"
          >
            Lưu
          </button>

        </div>

      </div>

    </div>

  );

}