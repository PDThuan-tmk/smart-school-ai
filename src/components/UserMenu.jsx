import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";

export default function UserMenu({ user }) {
  async function handleLogout() {
    try {
      await signOut(auth);
      window.location.href = "/";
    } catch (error) {
      alert("Đăng xuất thất bại!");
      console.error(error);
    }
  }

  return (
    <div className="flex items-center gap-4">

      <img
        src={user.photoURL}
        alt="Avatar"
        className="w-11 h-11 rounded-full border"
      />

      <div className="hidden md:block">
        <p className="font-semibold">{user.displayName}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
      </div>

      <button
        onClick={handleLogout}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl transition"
      >
        Đăng xuất
      </button>

    </div>
  );
}