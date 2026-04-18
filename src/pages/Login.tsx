import React, { useState } from "react";
import { Tv, LogIn, ExternalLink, AlertCircle } from "lucide-react";
import { signIn } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { motion } from "motion/react";
import { Navigate } from "react-router-dom";

export default function Login() {
  const { user, appUser } = useAuth();
  const [error, setError] = useState<string | null>(null);

  if (user && appUser) {
    return <Navigate to="/admin" />;
  }

  const handleSignIn = async () => {
    setError(null);
    try {
      await signIn();
    } catch (err: any) {
      console.error("Sign in failed:", err);
      if (err.code === "auth/popup-blocked") {
        setError("Popup blocked! Please allow popups or open in a new tab.");
      } else {
        setError(err.message || "Sign in failed. Please try again.");
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl backdrop-blur-sm shadow-2xl"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="bg-red-600 p-4 rounded-2xl shadow-xl shadow-red-600/30">
            <Tv className="w-12 h-12 text-white" />
          </div>
          
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">live.nanodesk.in Control</h1>
            <p className="text-zinc-400">Sign in to manage your broadcast channels and playlist</p>
          </div>

          {user && !appUser && (
            <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-red-500">Access Denied</p>
                <p className="text-xs text-zinc-400">Your account ({user.email}) is not authorized. Please contact the administrator.</p>
              </div>
            </div>
          )}

          {error && (
            <div className="w-full p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="w-full space-y-3">
            <button
              onClick={handleSignIn}
              className="w-full flex items-center justify-center gap-3 bg-white text-black font-bold py-4 px-6 rounded-xl hover:bg-zinc-200 transition-all active:scale-[0.98] group"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5 group-hover:scale-110 transition-transform" 
                referrerPolicy="no-referrer"
              />
              Continue with Google
            </button>

            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 text-zinc-500 hover:text-white text-sm font-medium py-2 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Open in New Tab (Recommended)
            </a>
          </div>

          <p className="text-xs text-zinc-500 max-w-[280px]">
            Access is restricted to authorized administrators and editors only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
