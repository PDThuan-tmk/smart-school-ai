import { useState } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, provider } from '../services/firebase';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (loading) return; // Tránh bấm nhiều lần liên tiếp
    setLoading(true);

    try {
      const result = await signInWithPopup(auth, provider);
      console.log('Đăng nhập thành công:', result.user);
      
      // Chuyển hướng sang trang Dashboard
      navigate('/dashboard');
    } catch (error) {
      // Bỏ qua nếu người dùng tự đóng popup hoặc bấm hủy request
      if (
        error.code !== 'auth/cancelled-popup-request' &&
        error.code !== 'auth/popup-closed-by-user'
      ) {
        console.error('Lỗi đăng nhập:', error);
        alert('Đăng nhập thất bại: ' + error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-[420px] rounded-3xl p-10 shadow-2xl">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          🎓 Smart School AI
        </h1>

        <p className="text-center text-gray-500 mt-4">
          Hệ thống quản lý trường học
        </p>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className={`mt-10 w-full text-white py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
            loading
              ? 'bg-blue-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-95'
          }`}
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Đang xử lý...</span>
            </>
          ) : (
            'Đăng nhập bằng Google'
          )}
        </button>
      </div>
    </div>
  );
}