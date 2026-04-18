import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash2, ArrowLeft, Youtube, Facebook, Save, Play, GripVertical, Power, ExternalLink } from "lucide-react";
import { motion, Reorder } from "framer-motion";

interface Video {
  id: string;
  title: string;
  url: string;
  type: 'yt' | 'fb';
  val: string;
  order: number;
  active: boolean;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
}

export default function ChannelDetail() {
  const { channelId } = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!channelId) return;

    getDoc(doc(db, "channels", channelId)).then(s => {
      if (s.exists()) setChannel({ id: s.id, ...s.data() } as Channel);
    });

    const q = query(collection(db, "channels", channelId, "videos"), orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setVideos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Video)));
    });

    return unsubscribe;
  }, [channelId]);

  const ytId = (url: string) => {
    const m = url.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/);
    return m ? m[1] : null;
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId || !newVideoUrl) return;

    let type: 'yt' | 'fb' = 'yt';
    let val = '';

    if (newVideoUrl.includes('youtu')) {
      const id = ytId(newVideoUrl);
      if (!id) return alert("Invalid YouTube URL");
      type = 'yt';
      val = id;
    } else if (newVideoUrl.includes('facebook')) {
      type = 'fb';
      val = newVideoUrl;
    } else {
      return alert("Only YouTube and Facebook links supported");
    }

    try {
      await addDoc(collection(db, "channels", channelId, "videos"), {
        title: newVideoTitle || (type === 'yt' ? "YouTube Video" : "Facebook Video"),
        url: newVideoUrl,
        type,
        val,
        order: videos.length,
        active: true,
        updatedAt: serverTimestamp()
      });
      setNewVideoUrl("");
      setNewVideoTitle("");
      setIsAdding(false);
    } catch (err) {
      console.error("Add video error:", err);
    }
  };

  const toggleActive = async (v: Video) => {
    if (!channelId) return;
    await updateDoc(doc(db, "channels", channelId, "videos", v.id), {
      active: !v.active
    });
  };

  const deleteVideo = async (id: string) => {
    if (!channelId || !confirm("Delete this video?")) return;
    await deleteDoc(doc(db, "channels", channelId, "videos", id));
  };

  const handleReorder = async (newOrder: Video[]) => {
    setVideos(newOrder);
    if (!channelId) return;
    // Batch updates would be better but for simplicity:
    newOrder.forEach((v, index) => {
      if (v.order !== index) {
        updateDoc(doc(db, "channels", channelId, "videos", v.id), { order: index });
      }
    });
  };

  if (!channel) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/admin" className="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-all">
            <ArrowLeft className="w-5 h-5 text-zinc-400" />
          </Link>
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">{channel.name}</h1>
            <p className="text-sm text-zinc-500 font-mono">Channel Registry: {channel.id}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            to={`/play/${channel.slug}`} 
            target="_blank"
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 font-bold py-2.5 px-5 rounded-xl transition-all border border-zinc-700"
          >
            <Play className="w-4 h-4 text-red-500 fill-red-500" /> Preview Player
          </Link>
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 px-5 rounded-xl transition-all shadow-lg shadow-red-600/20"
          >
            <Plus className="w-5 h-5" /> Add Video
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Playlist Management */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold uppercase tracking-widest text-zinc-500">Playlist Order</h2>
            <span className="text-xs text-zinc-600 bg-zinc-900 px-2 py-1 rounded">Drag to reorder</span>
          </div>

          <Reorder.Group axis="y" values={videos} onReorder={handleReorder} className="space-y-3">
            {videos.map((video) => (
              <Reorder.Item 
                key={video.id} 
                value={video}
                className={`flex items-center gap-4 bg-zinc-900/50 border ${video.active ? 'border-zinc-800' : 'border-zinc-800/50 opacity-50'} p-4 rounded-xl group hover:border-zinc-700 transition-all cursor-grab active:cursor-grabbing`}
              >
                <div className="text-zinc-600">
                  <GripVertical className="w-5 h-5" />
                </div>
                
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${video.type === 'yt' ? 'bg-red-600/10' : 'bg-blue-600/10'}`}>
                  {video.type === 'yt' ? <Youtube className="w-6 h-6 text-red-600" /> : <Facebook className="w-6 h-6 text-blue-600" />}
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-bold truncate text-zinc-200">{video.title}</h3>
                  <p className="text-xs text-zinc-500 truncate">{video.url}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleActive(video)}
                    className={`p-2 rounded-lg transition-colors ${video.active ? 'text-green-500 hover:bg-green-500/10' : 'text-zinc-600 hover:bg-zinc-800'}`}
                  >
                    <Power className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => deleteVideo(video.id)}
                    className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          {videos.length === 0 && (
            <div className="bg-zinc-900/30 border-2 border-dashed border-zinc-800 rounded-2xl py-20 text-center">
              <p className="text-zinc-500 font-medium">No videos in this channel yet.</p>
              <button 
                onClick={() => setIsAdding(true)}
                className="mt-4 text-red-500 font-bold hover:underline"
              >
                Add your first link
              </button>
            </div>
          )}
        </div>

        {/* Sidebar Settings */}
        <div className="space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h3 className="font-bold text-lg mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Link 
                to={`/play/${channel.slug}`}
                target="_blank"
                className="flex items-center justify-between w-full p-4 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition-all font-bold group"
              >
                <div className="flex items-center gap-3">
                  <ExternalLink className="w-5 h-5 text-red-500" />
                  <span>Public Link</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">/play/{channel.slug}</div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add Video Modal */}
      {isAdding && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-lg w-full shadow-2xl"
          >
            <h2 className="text-2xl font-bold mb-6">Add New Broadcast Link</h2>
            <form onSubmit={handleAddVideo} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Video Title</label>
                  <input
                    type="text"
                    value={newVideoTitle}
                    onChange={(e) => setNewVideoTitle(e.target.value)}
                    placeholder="Provide a name for this broadcast"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Link (YouTube/Facebook URL)</label>
                  <input
                    autoFocus
                    type="text"
                    value={newVideoUrl}
                    onChange={(e) => setNewVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all"
                  />
                </div>
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
                  Save to Playlist
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
