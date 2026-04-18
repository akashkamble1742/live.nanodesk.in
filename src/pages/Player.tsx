import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, getDocs, limit, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play, SkipBack, SkipForward, Volume2, VolumeX, List, Tv, X, Radio, ChevronRight, Share2, Disc, Edit2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

declare global {
  interface Window {
    FB: any;
    onYouTubeIframeAPIReady: () => void;
    YT: any;
    fbAsyncInit: () => void;
  }
}

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

export default function Player() {
  const { channelSlug } = useParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [channelName, setChannelName] = useState("Loading...");
  const [channelId, setChannelId] = useState("");
  const [loopPlaylist, setLoopPlaylist] = useState(false);
  
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editStartTime, setEditStartTime] = useState("");
  const [editEndTime, setEditEndTime] = useState("");
  const [editUrl, setEditUrl] = useState("");

  const ytPlayerRef = useRef<any>(null);
  const fbPlayerRef = useRef<any>(null);
  const fbIntervalRef = useRef<any>(null);

  // 1. Fetch Channel and Playlist
  useEffect(() => {
    if (!channelSlug) return;

    const channelsQuery = query(collection(db, "channels"), where("slug", "==", channelSlug), limit(1));
    const unsubChannel = onSnapshot(channelsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const channelDoc = snapshot.docs[0];
        setChannelId(channelDoc.id);
        setChannelName(channelDoc.data().name);
        setLoopPlaylist(channelDoc.data().loopPlaylist || false);

        const videosQuery = query(
          collection(db, "channels", channelDoc.id, "videos"), 
          where("active", "==", true),
          orderBy("order", "asc")
        );
        
        onSnapshot(videosQuery, (vSnapshot) => {
          setVideos(vSnapshot.docs.map(d => ({ id: d.id, ...d.data() } as Video)));
        });
      }
    });

    return () => unsubChannel();
  }, [channelSlug]);

  // 2. Load YouTube API
  useEffect(() => {
    if (window.YT) return;
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    
    window.onYouTubeIframeAPIReady = () => console.log("YT READY");
  }, []);

  // 3. Load Facebook SDK
  useEffect(() => {
    const fbRoot = document.getElementById('fb-root');
    if (!fbRoot) {
      const div = document.createElement('div');
      div.id = 'fb-root';
      document.body.appendChild(div);
    }

    const script = document.createElement('script');
    script.src = "https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v18.0";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    document.body.appendChild(script);

    window.fbAsyncInit = function() {
      window.FB.init({ xfbml: true, version: 'v18.0' });
      window.FB.Event.subscribe('xfbml.ready', (msg: any) => {
        if (msg.type === 'video') {
          fbPlayerRef.current = msg.instance;
          fbPlayerRef.current.play();
          fbPlayerRef.current.unmute();
          fbPlayerRef.current.subscribe('finishedPlaying', handleNext);
        }
      });
    };
  }, []);

  const handleNext = () => {
    if (currentVideo?.loopVideo) {
      setPlayCount(c => c + 1);
      return;
    }
    
    setCurrentIndex((p) => {
      if (p === videos.length - 1) {
        if (loopPlaylist) {
          setPlayCount(c => c + 1);
          return 0;
        }
        return p;
      }
      return p + 1;
    });
  };
  
  const handlePrev = () => setCurrentIndex((p) => (p - 1 + videos.length) % videos.length);

  const toggleGlobalLoop = async () => {
    if (!channelId) return;
    await updateDoc(doc(db, "channels", channelId), {
      loopPlaylist: !loopPlaylist
    });
  };

  const toggleSingleLoop = async (v: Video) => {
    if (!channelId) return;
    await updateDoc(doc(db, "channels", channelId, "videos", v.id), {
      loopVideo: !v.loopVideo
    });
  };

  const handleUpdateTimes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!channelId || !editingVideo) return;
    await updateDoc(doc(db, "channels", channelId, "videos", editingVideo.id), {
      title: editTitle,
      startTime: Number(editStartTime) || 0,
      endTime: Number(editEndTime) || 0,
      updatedAt: serverTimestamp()
    });
    setEditingVideo(null);
  };

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    if (!currentVideo) return;

    if (fbIntervalRef.current) clearInterval(fbIntervalRef.current);

    if (currentVideo.type === 'yt' && window.YT && window.YT.Player) {
      const playerVars: any = { 
        autoplay: 1, 
        controls: 1, 
        rel: 0, 
        fs: 1, 
        modestbranding: 1,
      };

      if (currentVideo.startTime) playerVars.start = currentVideo.startTime;
      if (currentVideo.endTime) playerVars.end = currentVideo.endTime;

      if (!ytPlayerRef.current) {
        ytPlayerRef.current = new window.YT.Player('yt-player-target', {
          height: '1080',
          width: '1920',
          videoId: currentVideo.val,
          playerVars,
          events: {
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) handleNext();
            }
          }
        });
      } else {
        ytPlayerRef.current.loadVideoById({
          videoId: currentVideo.val,
          startSeconds: currentVideo.startTime || 0,
          endSeconds: currentVideo.endTime || undefined
        });
      }
    }

    if (currentVideo.type === 'fb' && window.FB) {
      setTimeout(() => window.FB.XFBML.parse(), 100);

      // Facebook Trimming Handler
      if (currentVideo.endTime) {
        fbIntervalRef.current = setInterval(() => {
          if (fbPlayerRef.current) {
            const currentPos = fbPlayerRef.current.getCurrentPosition();
            if (currentPos >= currentVideo.endTime!) {
              handleNext();
            }
          }
        }, 1000);
      }
    }

    return () => {
      if (fbIntervalRef.current) clearInterval(fbIntervalRef.current);
    };
  }, [currentIndex, currentVideo, loopPlaylist, playCount]);

  if (videos.length === 0) {
    return (
      <div className="w-[2400px] h-[1300px] bg-black flex flex-col items-center justify-center relative overflow-hidden">
        <div className="relative flex flex-col items-center gap-6">
           <Tv className="w-20 h-20 text-zinc-900 animate-pulse" />
           <div className="text-center">
             <h2 className="text-xl font-black italic uppercase tracking-tighter text-zinc-800">{channelName}</h2>
             <p className="text-zinc-900 text-[10px] font-black uppercase tracking-[0.3em] mt-2">No Feed Detected</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[2400px] h-[1300px] bg-black overflow-hidden flex font-sans text-white border-b-[220px] border-black">
      {/* 
        CLEAN BROADCAST AREA (Fixed 1920x1080)
        Top-Left aligned for easy OBS cropping.
      */}
      <div className="w-[1920px] h-[1080px] relative bg-black shrink-0">
        {currentVideo?.type === 'yt' ? (
          <div id="yt-player-target" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div 
              className="fb-video" 
              data-href={currentVideo?.val} 
              data-autoplay="true" 
              data-allowfullscreen="true"
              data-width="1920"
              data-show-captions="false"
              style={{ width: '1920px', height: '1080px' }}
            />
          </div>
        )}
      </div>

      {/* Control Sidebar (Permanent, 480px Wide, 1300px High) */}
      <div className="w-[480px] h-[1300px] bg-zinc-950 border-l border-white/5 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-8 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-xs font-black italic uppercase tracking-[0.3em] text-zinc-500">Live Feed</h3>
            <h4 className="text-xl font-black uppercase italic tracking-tighter">Sequence Menu</h4>
          </div>
          <button 
            onClick={toggleGlobalLoop}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${loopPlaylist ? 'bg-red-600 border-red-500 text-white' : 'bg-zinc-900 border-white/5 text-zinc-500'}`}
          >
            <Disc className={`w-3.5 h-3.5 ${loopPlaylist && 'animate-spin'}`} />
            <span className="text-[10px] font-black uppercase tracking-widest">Loop</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
          {videos.map((v, i) => (
            <motion.div
              key={v.id}
              whileHover={{ scale: 1.01 }}
              className={`group w-full p-4 flex gap-5 text-left transition-all rounded-3xl border border-white/5 ${
                i === currentIndex ? 'bg-red-600/10 border-red-500/20 shadow-2xl' : 'bg-black/40'
              }`}
            >
              <div 
                className="w-24 aspect-video bg-zinc-900 rounded-[15px] shrink-0 flex items-center justify-center overflow-hidden relative cursor-pointer"
                onClick={() => setCurrentIndex(i)}
              >
                {v.type === 'yt' ? (
                  <img 
                    src={`https://img.youtube.com/vi/${v.val}/mqdefault.jpg`} 
                    alt="thumb" 
                    className={`w-full h-full object-cover transition-all duration-700 ${i === currentIndex ? 'scale-110 opacity-100' : 'opacity-40 grayscale hover:opacity-100 hover:grayscale-0'}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Tv className="w-8 h-8 text-zinc-800" />
                )}
                {i === currentIndex && (
                  <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 py-1 flex flex-col">
                <div 
                  className="flex-1 cursor-pointer"
                  onClick={() => setCurrentIndex(i)}
                >
                  <h4 className={`font-black uppercase tracking-tight leading-tight line-clamp-1 text-xs mb-1 ${i === currentIndex ? 'text-white' : 'text-zinc-500'}`}>
                    {v.title}
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    {v.loopVideo && <span className="text-[8px] bg-orange-500 text-black px-1.5 py-0.5 rounded font-black uppercase">L-ON</span>}
                    {(v.startTime || v.endTime) && <span className="text-[8px] bg-red-600/20 text-red-500 px-1.5 py-0.5 rounded font-black uppercase">{v.startTime || 0}s-{(v.endTime || 'END')}</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                       setEditingVideo(v);
                       setEditTitle(v.title);
                       setEditUrl(v.url);
                       setEditStartTime(v.startTime?.toString() || "0");
                       setEditEndTime(v.endTime?.toString() || "0");
                    }}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-600 hover:text-white transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => toggleSingleLoop(v)}
                    className={`p-1.5 rounded-lg transition-all ${v.loopVideo ? 'text-orange-500 bg-orange-500/10' : 'text-zinc-600 hover:text-zinc-400'}`}
                  >
                    <Disc className={`w-3.5 h-3.5 ${v.loopVideo && 'animate-spin'}`} />
                  </button>
                   {i === currentIndex && <ChevronRight className="w-4 h-4 text-red-600 ml-auto" />}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Global Controls */}
        <div className="p-10 bg-black/80 backdrop-blur-3xl border-t border-white/5 flex flex-col gap-8">
           <div className="flex items-center justify-center gap-6">
              <button 
                onClick={handlePrev}
                className="p-5 bg-zinc-900 hover:bg-zinc-800 rounded-[24px] transition-all group active:scale-90"
              >
                <SkipBack className="w-5 h-5 text-zinc-500 group-hover:text-white" />
              </button>
              <div 
                className="p-8 bg-red-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-red-600/40 active:scale-95 transition-transform cursor-pointer"
                onClick={() => handleNext()} // Shortcut for testing
              >
                <Play className="w-8 h-8 fill-white text-white translate-x-1" />
              </div>
              <button 
                onClick={handleNext}
                className="p-5 bg-zinc-900 hover:bg-zinc-800 rounded-[24px] transition-all group active:scale-90"
              >
                <SkipForward className="w-5 h-5 text-zinc-500 group-hover:text-white" />
              </button>
           </div>

           <div className="flex flex-col gap-2 px-4">
              <div className="flex items-center justify-between text-[10px] font-black text-zinc-600 uppercase tracking-widest">
                 <span>Active Node: {channelName}</span>
                 <Share2 className="w-4 h-4 hover:text-white cursor-pointer transition-colors" />
              </div>
              <p className="text-[9px] text-zinc-700 font-bold uppercase tracking-tighter">Broadcast Output: 1920x1080 Clean</p>
           </div>
        </div>
      </div>
      {editingVideo && (
        <PlayerModal 
          video={editingVideo}
          editTitle={editTitle}
          setEditTitle={setEditTitle}
          editStartTime={editStartTime}
          setEditStartTime={setEditStartTime}
          editEndTime={editEndTime}
          setEditEndTime={setEditEndTime}
          onDiscard={() => setEditingVideo(null)}
          onCommit={handleUpdateTimes}
        />
      )}
    </div>
  );
}

// Sub-component or inline modal for Player Edit
function PlayerModal({ video, onDiscard, onCommit, editTitle, setEditTitle, editStartTime, setEditStartTime, editEndTime, setEditEndTime }: any) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl shrink-0">
      <motion.div 
        initial={{ scale: 0.9, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        className="bg-zinc-900 border border-white/5 p-10 rounded-[32px] max-w-xl w-full shadow-2xl overflow-hidden"
      >
        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-8 tracking-tight">Broadcast Timing</h2>
        <form onSubmit={onCommit} className="space-y-8">
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Content Label</label>
              <input
                type="text"
                required
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold placeholder:text-zinc-800 shadow-inner"
              />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">Start At (s)</label>
                <input
                  type="number"
                  min="0"
                  value={editStartTime}
                  onChange={(e) => setEditStartTime(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                />
              </div>
              <div>
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-2 block">End At (s)</label>
                <input
                  type="number"
                  min="0"
                  value={editEndTime}
                  onChange={(e) => setEditEndTime(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-red-600 transition-all font-bold"
                  placeholder="0 for full"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button 
              type="button"
              onClick={onDiscard}
              className="flex-1 px-6 py-5 bg-zinc-800 hover:bg-zinc-700 rounded-2xl font-black uppercase text-xs tracking-widest transition-all"
            >
              Discard
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-5 bg-red-600 hover:bg-red-500 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-xl shadow-red-600/20"
            >
              Commit
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export function PlayerContainer() {
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  // ... this needs more cleanup, but basic logic is moved
}
