import { signInWithPopup } from "firebase/auth";
import { auth, provider } from "../services/firebase";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();

  async function login() {
    try {
        const result = await signInWithPopup(auth, provider);
            navigate("/dashboard");

        console.log("Đăng nhập thành công:", result.user);

        navigate("/dashboard");

    } catch (err) {
        console.error(err);
        alert(err.message);
    }
  }

  return (

    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center">

      <div className="bg-white w-[420px] rounded-3xl p-10 shadow-2xl">

        <h1 className="text-4xl font-bold text-center">

          🎓 Smart School AI

        </h1>

        <p className="text-center text-gray-500 mt-4">

          Hệ thống quản lý trường học

        </p>

        <button

          onClick={login}

          className="mt-10 w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-semibold transition"

        >

          Đăng nhập bằng Google

        </button>

      </div>

    </div>

  );

}