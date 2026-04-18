import { Tv, LogIn } from "lucide-react";
import { signIn } from "../lib/firebase";
import { motion } from "motion/react";

export default function Login() {
  const handleSignIn = async () => {
    try {
      await signIn();
    } catch (error) {
      console.error("Sign in failed:", error);
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

          <p className="text-xs text-zinc-500 max-w-[280px]">
            Access is restricted to authorized administrators and editors only.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
