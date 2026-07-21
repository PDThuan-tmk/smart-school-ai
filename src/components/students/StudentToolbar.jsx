export default function StudentToolbar({ onAdd }) {

  return (

    <div className="flex justify-between items-center mb-8">

      <input
        className="border rounded-xl px-5 py-3 w-96"
        placeholder="🔍 Tìm kiếm học sinh..."
      />

      <button
        onClick={onAdd}
        className="bg-blue-600 text-white px-6 py-3 rounded-xl"
      >

        + Thêm học sinh

      </button>

    </div>

  );

}