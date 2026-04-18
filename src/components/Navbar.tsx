import { Link, useNavigate } from "react-router-dom";
import { LogOut, User as UserIcon, Tv, Settings, LogIn } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { logOut } from "../lib/firebase";

export default function Navbar() {
  const { user, appUser } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logOut();
    navigate("/login");
  };

  return (
    <nav className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <Link to="/admin" className="flex items-center gap-2 group">
              <div className="bg-red-600 p-1.5 rounded-lg group-hover:bg-red-500 transition-colors">
                <Tv className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl tracking-tight hidden sm:block">
                live.<span className="text-red-500">nanodesk.in</span>
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <div className="hidden md:flex items-center gap-4 mr-4 text-sm text-zinc-400">
                  <Link to="/admin" className="hover:text-white transition-colors">Channels</Link>
                  {appUser?.role === 'admin' && (
                    <Link to="/admin/users" className="hover:text-white transition-colors flex items-center gap-1">
                      <Settings className="w-4 h-4" /> Users
                    </Link>
                  )}
                </div>
                
                <div className="flex items-center gap-3 pl-4 border-l border-zinc-800">
                  <div className="flex flex-col items-end hidden sm:flex">
                    <span className="text-sm font-medium">{user.displayName || "Admin User"}</span>
                    <span className="text-xs text-red-500 uppercase font-bold tracking-wider">{appUser?.role || 'user'}</span>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="p-2 rounded-full hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
                    title="Logout"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <Link 
                to="/login"
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-bold transition-all shadow-lg shadow-red-600/20"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
