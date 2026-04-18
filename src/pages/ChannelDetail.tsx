import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Plus, Trash2, ArrowLeft, Youtube, Facebook, Save, Play, GripVertical, Power, ExternalLink, Radio, Disc, Edit2 } from "lucide-react";
import { motion, Reorder, AnimatePresence } from "motion/react";

interface Video {
  id: string;
  title: string;
  url: string;
  type: 'yt' | 'fb';
  val: string;
  order: number;
  active: boolean;
  startTime?: number;
  endTime?: number;
  loopVideo?: boolean;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  loopPlaylist?: boolean;
}

export default function ChannelDetail() {
  const { channelId } = useParams();
  const [channel, setChannel] = useState<Channel | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [newVideoUrl, setNewVideoUrl] = useState("");
  const [newVideoTitle, setNewVideoTitle] = useState("");
  const [newStartTime, setNewStartTime] = useState("");
  const [newEndTime, setNewEndTime] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");

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
        startTime: Number(newStartTime) || 0,
        endTime: Number(newEndTime) || 0,
        loopVideo: false,
        updatedAt: serverTimestamp()
      });
      setNewVideoUrl("");
      setNewVideoTitle("");
      setNewStartTime("");
      setNewEndTime("");
      setIsAdding(false);
    } catch (err) {
      console.error("Add video error:", err);
    }
  };

  const handleUpdateVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId || !editingVideo || !editUrl) return;

    let type: 'yt' | 'fb' = 'yt';
    let val = '';

    if (editUrl.includes('youtu')) {
      const id = ytId(editUrl);
      if (!id) return alert("Invalid YouTube URL");
      type = 'yt';
      val = id;
    } else if (editUrl.includes('facebook')) {
      type = 'fb';
      val = editUrl;
    } else {
      return alert("Only YouTube and Facebook links supported");
    }

    try {
      await updateDoc(doc(db, "channels", channelId, "videos", editingVideo.id), {
        title: editTitle,
        url: editUrl,
        type,
        val,
        startTime: Number(editStartTime) || 0,
        endTime: Number(editEndTime) || 0,
        updatedAt: serverTimestamp()
      });
      setEditingVideo(null);
    } catch (err) {
      console.error("Update video error:", err);
    }
  };

  const openEditModal = (v: Video) => {
    setEditingVideo(v);
    setEditTitle(v.title);
    setEditUrl(v.url);
    setEditStartTime(v.startTime?.toString() || "0");
    setEditEndTime(v.endTime?.toString() || "0");
  };

  const toggleLoop = async () => {
    if (!channelId || !channel) return;
    await updateDoc(doc(db, "channels", channelId), {
      loopPlaylist: !channel.loopPlaylist
    });
    setChannel({ ...channel, loopPlaylist: !channel.loopPlaylist });
  };

  const toggleActive = async (v: Video) => {
    if (!channelId) return;
    await updateDoc(doc(db, "channels", channelId, "videos", v.id), {
      active: !v.active
    });
  };

  const toggleVideoLoop = async (v: Video) => {
    if (!channelId) return;
    await updateDoc(doc(db, "channels", channelId, "videos", v.id), {
      loopVideo: !v.loopVideo
    });
  };

  const deleteVideo = async (id: string) => {
    if (!channelId || !confirm("Delete this video?")) return;
    await deleteDoc(doc(db, "channels", channelId, "videos", id));
  };

  const handleReorder = async (newOrder: Video[]) => {
    setVideos(newOrder);
    if (!channelId) return;
    newOrder.forEach((v, index) => {
      if (v.order !== index) {
        updateDoc(doc(db, "channels", channelId, "videos", v.id), { order: index });
      }
    });
  };

  if (!channel) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex flex-col gap-8 mb-16">
        <Link 
          to="/admin" 
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Stations
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-0.5 bg-red-600" />
              <div className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-red-500 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-red-500">Managing Broadcast</span>
              </div>
            </div>
            <h1 className="text-6xl font-black italic uppercase tracking-tighter leading-none">
              {channel.name}
            </h1>
            <div className="flex items-center gap-4 text-xs font-bold text-zinc-500">
               <span className="bg-zinc-900 border border-white/5 py-1 px-3 rounded-full uppercase tracking-widest leading-none">/play/{channel.slug}</span>
               <a 
                 href={`/play/${channel.slug}`} 
                 target="_blank" 
                 className="flex items-center gap-2 hover:text-white transition-colors"
               >
                 <ExternalLink className="w-3.5 h-3.5" /> Open Public Feed
               </a>
            </div>
          </div>

          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-3 bg-white text-black font-black py-4 px-8 rounded-2xl transition-all shadow-2xl hover:scale-105 active:scale-95 group"
          >
            <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Add Media Content
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/40 border border-white/5 rounded-[40px] p-8 lg:p-12 shadow-2xl backdrop-blur-sm">
            <div className="flex items-center justify-between mb-10">
               <h3 className="text-2xl font-black italic uppercase tracking-tighter">Live Sequence</h3>
               <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                 <GripVertical className="w-4 h-4" /> Drag to Reorder
               </div>
            </div>

            <Reorder.Group axis="y" values={videos} onReorder={handleReorder} className="space-y-4">
              {videos.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-white/5 rounded-[32px]">
                  <div className="bg-zinc-800/50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                     <Play className="w-6 h-6 text-zinc-600" />
                  </div>
                  <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs italic">Playlist is currently empty</p>
                </div>
              ) : (
                videos.map((video) => (
                  <Reorder.Item 
                    key={video.id} 
                    value={video}
                    className={`group relative bg-black/40 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-zinc-800/40 transition-all cursor-grab active:cursor-grabbing ${!video.active && 'opacity-40'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-zinc-700 p-2 group-hover:text-zinc-500 transition-colors">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className={`p-2 rounded-lg ${video.type === 'yt' ? 'bg-red-600/10 text-red-600' : 'bg-blue-600/10 text-blue-600'}`}>
                        {video.type === 'yt' ? <Youtube className="w-5 h-5" /> : <Facebook className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-black uppercase tracking-tighter text-zinc-200">{video.title}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest truncate max-w-[150px]">{video.url}</span>
                          {(video.startTime || video.endTime) ? (
                            <span className="text-[10px] text-red-500 font-black uppercase tracking-widest bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                              {video.startTime || 0}s ➔ {video.endTime || 'END'}s
                            </span>
                          ) : null}
                          {video.loopVideo && (
                            <span className="text-[10px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 px-2 py-0.5 rounded border border-orange-500/20 flex items-center gap-1">
                              <Disc className="w-2.5 h-2.5 animate-spin" /> Single Loop
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => openEditModal(video)}
                        className="p-2.5 text-zinc-700 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                        title="Edit Source"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleVideoLoop(video)}
                        className={`p-2.5 rounded-xl border transition-all ${video.loopVideo ? 'bg-orange-500 underline text-black border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]' : 'bg-transparent text-zinc-600 border-white/5 hover:border-white/10'}`}
                        title={video.loopVideo ? "Disable Single Loop" : "Enable Single Loop"}
                      >
                        <Disc className={`w-4 h-4 ${video.loopVideo ? 'animate-spin' : ''}`} />
                      </button>
                      <button 
                        onClick={() => toggleActive(video)}
                        className={`p-2.5 rounded-xl border transition-all ${video.active ? 'bg-zinc-800 text-green-500 border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-zinc-950 text-zinc-600 border-white/5'}`}
                        title={video.active ? "Mute Video" : "Activate Video"}
                      >
                        <Power className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteVideo(video.id)}
                        className="p-2.5 text-zinc-700 hover:text-red-600 hover:bg-red-600/10 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </Reorder.Item>
                ))
              )}
            </Reorder.Group>
          </div>
        </div>

        <div className="space-y-8">
           <div className="bg-zinc-900 border border-white/5 rounded-[32px] p-8 shadow-2xl">
              <h3 className="text-xl font-black italic uppercase tracking-tighter mb-6">Quick Settings</h3>
              <div className="space-y-4">
                 <button 
                   onClick={toggleLoop}
                   className={`flex items-center justify-between w-full p-6 border rounded-[24px] transition-all group ${channel.loopPlaylist ? 'bg-red-600/10 border-red-500/40' : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'}`}
                 >
                    <div className="flex items-center gap-3">
                       <Disc className={`w-5 h-5 ${channel.loopPlaylist ? 'text-red-500 animate-spin' : 'text-zinc-600'}`} />
                       <span className={`font-black text-sm uppercase italic tracking-tighter ${channel.loopPlaylist ? 'text-red-500' : 'text-zinc-400'}`}>Loop Playlist</span>
                    </div>
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${channel.loopPlaylist ? 'bg-red-600' : 'bg-zinc-800'}`}>
                       <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${channel.loopPlaylist ? 'right-1' : 'left-1'}`} />
                    </div>
                 </button>
                 <Link 
                   to={`/play/${channel.slug}`}
                   target="_blank"
                   className="flex items-center justify-between w-full p-6 bg-white/[0.03] border border-white/5 rounded-[24px] hover:bg-white/[0.06] transition-all group"
                 >
                    <div className="flex items-center gap-3">
                       <Radio className="w-5 h-5 text-red-500 animate-pulse" />
                       <span className="font-black text-sm uppercase italic tracking-tighter">Live Player</span>
                    </div>
                    <ExternalLink className="w-4 h-4 text-zinc-600 group-hover:text-white transition-colors" />
                 </Link>
                 
                 <div className="p-6 bg-zinc-950 border border-white/5 rounded-[24px]">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Station ID</span>
                    <span className="text-xs font-mono text-zinc-300 break-all">{channel.id}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-zinc-900 border border-white/5 p-10 rounded-[32px] max-w-xl w-full shadow-2xl"
            >
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 tracking-tight">Source Integration</h2>
              <form onSubmit={handleAddVideo} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Content Label</label>
                    <input
                      type="text"
                      required
                      value={newVideoTitle}
                      onChange={(e) => setNewVideoTitle(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold placeholder:text-zinc-800"
                      placeholder="e.g. BREAKING NEWS FEED"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Media URL (YouTube/Facebook)</label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newVideoUrl}
                      onChange={(e) => setNewVideoUrl(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold placeholder:text-zinc-800"
                      placeholder="Paste link here..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Start At (Seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={newStartTime}
                        onChange={(e) => setNewStartTime(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">End At (Seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={newEndTime}
                        onChange={(e) => setNewEndTime(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                        placeholder="Leave 0 for full"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="flex-1 px-6 py-5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-red-600/20"
                  >
                    Integrate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {editingVideo && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="bg-zinc-900 border border-white/5 p-10 rounded-[32px] max-w-xl w-full shadow-2xl"
            >
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 tracking-tight">Modify Source</h2>
              <form onSubmit={handleUpdateVideo} className="space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Content Label</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold placeholder:text-zinc-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Media URL</label>
                    <input
                      type="text"
                      required
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold placeholder:text-zinc-800"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Start At (Seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={editStartTime}
                        onChange={(e) => setEditStartTime(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">End At (Seconds)</label>
                      <input
                        type="number"
                        min="0"
                        value={editEndTime}
                        onChange={(e) => setEditEndTime(e.target.value)}
                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setEditingVideo(null)}
                    className="flex-1 px-6 py-5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
                  >
                    Discard
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 px-6 py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-red-600/20"
                  >
                    Commit Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
