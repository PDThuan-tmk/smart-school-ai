import { FaBell, FaSearch } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import UserMenu from "./UserMenu";

export default function Navbar() {

  const { user } = useAuth();

  return (

    <header className="bg-white shadow-md px-8 py-5 flex justify-between items-center">

      <div>

        <h1 className="text-3xl font-bold">

          Dashboard

        </h1>

      </div>

      <div className="flex items-center gap-6">

        <div className="relative">

          <FaSearch className="absolute left-3 top-3 text-gray-400" />

          <input
            type="text"
            placeholder="Tìm kiếm..."
            className="pl-10 pr-4 py-2 rounded-xl border w-72 outline-none"
          />

        </div>

        <button className="relative">

          <FaBell size={22} />

          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>

        </button>

        <UserMenu user={user} />

      </div>

    </header>

  );

}