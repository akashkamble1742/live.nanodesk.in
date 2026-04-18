import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../hooks/useAuth";
import { Plus, Trash2, ExternalLink, Play, LayoutGrid, List, Tv } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";

interface Channel {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: any;
}

export default function AdminDashboard() {
  const { user, appUser } = useAuth();
  const navigate = useNavigate();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  useEffect(() => {
    if (!user) return;

    const q = appUser?.role === 'admin' 
      ? query(collection(db, "channels")) // Admins see everything
      : query(collection(db, "channels"), where("ownerId", "==", user.uid));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setChannels(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Channel)));
    });

    return unsubscribe;
  }, [user, appUser]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName || !user) return;

    const slug = newChannelName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    
    try {
      await addDoc(collection(db, "channels"), {
        name: newChannelName,
        slug,
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewChannelName("");
      setIsAdding(false);
    } catch (err) {
      console.error("Create channel error:", err);
    }
  };

  const handleDeleteChannel = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this channel? All videos will be lost.")) return;
    
    try {
      await deleteDoc(doc(db, "channels", id));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div className="space-y-1">
          <h1 className="text-4xl font-black italic uppercase tracking-tighter">Your Channels</h1>
          <p className="text-zinc-500 font-medium">Manage and monitor your broadcast feeds in real-time</p>
        </div>
        
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-red-600/20 active:scale-95"
        >
          <Plus className="w-5 h-5" /> Create New Channel
        </button>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-md w-full shadow-2xl">
              <h2 className="text-2xl font-bold mb-6">New Channel Details</h2>
              <form onSubmit={handleCreateChannel} className="space-y-6">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Channel Name</label>
                  <input
                    autoFocus
                    type="text"
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    placeholder="e.g. News Live 24/7"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all text-lg"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-bold transition-all"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {channels.map((channel) => (
          <motion.div
            layout
            key={channel.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden hover:border-red-600/50 transition-all hover:shadow-2xl hover:shadow-red-900/10"
          >
            <div 
              onClick={() => navigate(`/admin/channel/${channel.id}`)} 
              className="block p-6 space-y-4 cursor-pointer"
            >
              <div className="h-40 bg-zinc-800 rounded-xl flex items-center justify-center relative overflow-hidden group-hover:bg-zinc-700 transition-colors">
                 <Tv className="w-16 h-16 text-zinc-700 group-hover:text-red-600/20 transition-colors" />
                 <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/80 to-transparent" />
                 <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2">
                   <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                   <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Live Configured</span>
                 </div>
              </div>

              <div>
                <h3 className="text-xl font-bold tracking-tight mb-1 truncate">{channel.name}</h3>
                <p className="text-xs text-zinc-500 font-mono">/play/{channel.slug}</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <div className="flex gap-2">
                  <Link 
                    to={`/play/${channel.slug}`} 
                    target="_blank"
                    onClick={(e) => e.stopPropagation()}
                    className="p-2 bg-zinc-800 hover:bg-red-600 rounded-lg transition-colors group/link"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                </div>
                <button 
                  onClick={(e) => handleDeleteChannel(channel.id, e)}
                  className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
        
        <button
          onClick={() => setIsAdding(true)}
          className="group h-full min-h-[340px] border-2 border-dashed border-zinc-800 rounded-2xl p-6 flex flex-col items-center justify-center gap-4 hover:border-red-600/50 hover:bg-red-600/5 transition-all"
        >
          <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center group-hover:bg-red-600 transition-all">
            <Plus className="w-8 h-8 text-zinc-600 group-hover:text-white" />
          </div>
          <span className="font-bold text-zinc-500 group-hover:text-white transition-colors">Add Another Channel</span>
        </button>
      </div>
    </div>
  );
}
