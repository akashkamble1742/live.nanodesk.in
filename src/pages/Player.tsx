import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play, SkipBack, SkipForward, Volume2, VolumeX, List, Tv, X, Radio, ChevronRight, Share2 } from "lucide-react";
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
}

export default function Player() {
  const { channelSlug } = useParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [channelName, setChannelName] = useState("Loading...");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isHovering, setIsHovering] = useState(false);
  
  const ytPlayerRef = useRef<any>(null);
  const fbPlayerRef = useRef<any>(null);

  // 1. Fetch Channel and Playlist
  useEffect(() => {
    if (!channelSlug) return;

    const channelsQuery = query(collection(db, "channels"), where("slug", "==", channelSlug), limit(1));
    const unsubChannel = onSnapshot(channelsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const channelDoc = snapshot.docs[0];
        setChannelName(channelDoc.data().name);

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

  const handleNext = () => setCurrentIndex((p) => (p + 1) % videos.length);
  const handlePrev = () => setCurrentIndex((p) => (p - 1 + videos.length) % videos.length);

  const currentVideo = videos[currentIndex];

  useEffect(() => {
    if (!currentVideo) return;

    if (currentVideo.type === 'yt' && window.YT && window.YT.Player) {
      if (!ytPlayerRef.current) {
        ytPlayerRef.current = new window.YT.Player('yt-player-target', {
          height: '100%',
          width: '100%',
          videoId: currentVideo.val,
          playerVars: { autoplay: 1, controls: 1, rel: 0, fs: 1, modestbranding: 1 },
          events: {
            onStateChange: (event: any) => {
              if (event.data === window.YT.PlayerState.ENDED) handleNext();
            }
          }
        });
      } else {
        ytPlayerRef.current.loadVideoById(currentVideo.val);
      }
    }

    if (currentVideo.type === 'fb' && window.FB) {
      setTimeout(() => window.FB.XFBML.parse(), 100);
    }
  }, [currentIndex, currentVideo]);

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center space-y-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.1),transparent)] flex items-center justify-center">
            <motion.div 
               animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
               transition={{ duration: 4, repeat: Infinity }}
               className="w-[500px] h-[500px] bg-red-600 rounded-full blur-[100px]"
            />
        </div>
        <div className="relative flex flex-col items-center gap-6">
           <Tv className="w-20 h-20 text-zinc-900 animate-pulse" />
           <div className="text-center space-y-2">
             <h2 className="text-2xl font-black italic uppercase tracking-tighter text-zinc-500">{channelName}</h2>
             <p className="text-zinc-700 text-xs font-black uppercase tracking-[0.3em] italic">Transmitting silence...</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden flex flex-col lg:flex-row font-sans text-white">
      {/* Main Broadcast Center - Area: 1920x1080 if window is 2400x1080 */}
      <div 
        className="flex-1 h-full relative bg-black flex items-center justify-center group"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {currentVideo?.type === 'yt' ? (
          <div id="yt-player-target" className="absolute inset-0 w-full h-full" />
        ) : (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <div 
              className="fb-video" 
              data-href={currentVideo?.val} 
              data-autoplay="true" 
              data-allowfullscreen="true"
              data-width="auto"
              data-show-captions="false"
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}

        {/* Dynamic Interface Elements */}
        {(!sidebarOpen || isHovering) && (
           <motion.div 
             initial={{ opacity: 0 }}
             animate={{ opacity: 1 }}
             className="absolute top-10 right-10 z-40 flex items-center gap-4"
           >
             <button 
                onClick={() => setSidebarOpen(true)}
                className="p-5 bg-black/40 hover:bg-red-600 rounded-[20px] transition-all border border-white/10 backdrop-blur-xl group shadow-2xl"
                title="Open Dashboard"
             >
               <List className="w-6 h-6 group-hover:scale-110 transition-transform" />
             </button>
           </motion.div>
        )}

        {/* Global Branding Overlay */}
        <div className="absolute top-10 left-10 z-40 pointer-events-none flex items-center gap-3 bg-black/40 px-6 py-3 rounded-full border border-white/5 backdrop-blur-md">
           <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse shadow-[0_0_10px_rgba(220,38,38,1)]" />
           <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/50">StreamLink <span className="text-red-600">Pro</span></span>
        </div>

        {/* Immersive HUD Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-12 lg:p-16 bg-gradient-to-t from-black via-black/80 to-transparent pointer-events-none transition-opacity duration-700">
           <AnimatePresence mode="wait">
             <motion.div 
               key={currentVideo?.id}
               initial={{ opacity: 0, y: 30 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="max-w-4xl"
             >
               <div className="flex items-center gap-4 mb-6">
                 <span className="bg-red-600 px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-red-600/40">Transmission Live</span>
                 <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    <Radio className="w-3 h-3 animate-pulse" /> Channel: {channelName}
                 </div>
               </div>
               <h2 className="text-5xl lg:text-8xl font-black italic uppercase tracking-tighter leading-none mb-4 tracking-tighter drop-shadow-[0_10px_20px_rgba(0,0,0,1)]">
                 {currentVideo?.title}
               </h2>
             </motion.div>
           </AnimatePresence>
        </div>
      </div>

      {/* Control Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ x: 500 }}
            animate={{ x: 0 }}
            exit={{ x: 500 }}
            transition={{ type: "spring", damping: 30, stiffness: 200 }}
            className="w-full lg:w-[480px] h-[400px] lg:h-full bg-zinc-950 border-l border-white/5 flex flex-col z-50 shadow-[-50px_0_100px_rgba(0,0,0,0.5)] relative"
          >
            <div className="p-10 border-b border-white/5 flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="text-sm font-black italic uppercase tracking-[0.3em] text-zinc-500">Live Feed</h3>
                <h4 className="text-xl font-black uppercase italic tracking-tighter">Sequence Menu</h4>
              </div>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="p-4 hover:bg-white/5 rounded-2xl text-zinc-600 hover:text-white transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
              {videos.map((v, i) => (
                <motion.button
                  key={v.id}
                  onClick={() => setCurrentIndex(i)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group w-full p-4 flex gap-5 text-left transition-all rounded-3xl border ${
                    i === currentIndex 
                    ? 'bg-red-600/10 border-red-500/20 shadow-2xl' 
                    : 'bg-black/40 border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="w-28 aspect-video bg-zinc-900 rounded-[18px] shrink-0 flex items-center justify-center overflow-hidden relative border border-white/5">
                    {v.type === 'yt' ? (
                      <img 
                        src={`https://img.youtube.com/vi/${v.val}/mqdefault.jpg`} 
                        alt="thumb" 
                        className={`w-full h-full object-cover transition-all duration-700 ${i === currentIndex ? 'scale-110 opacity-100' : 'opacity-40 grayscale group-hover:grayscale-0 group-hover:opacity-60'}`}
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Tv className="w-8 h-8 text-zinc-800" />
                    )}
                    {i === currentIndex && (
                      <motion.div 
                        layoutId="playing-dot"
                        className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-red-600 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-2xl"
                      >
                         Live
                      </motion.div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-2 flex flex-col justify-between">
                    <div>
                      <h4 className={`font-black uppercase tracking-tight leading-tight line-clamp-2 ${i === currentIndex ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                        {v.title}
                      </h4>
                    </div>
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                         {v.type === 'yt' ? 'M-YOUTUBE' : 'M-FACEBOOK'}
                       </span>
                       {i === currentIndex && <ChevronRight className="w-4 h-4 text-red-600" />}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>

            <div className="p-10 bg-black/80 backdrop-blur-xl border-t border-white/5 flex flex-col gap-8">
               <div className="flex items-center justify-center gap-6">
                  <button 
                    onClick={handlePrev}
                    className="p-6 bg-zinc-900 hover:bg-zinc-800 rounded-[28px] flex items-center justify-center transition-all group active:scale-90"
                  >
                    <SkipBack className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                  </button>
                  <div className="p-8 bg-red-600 rounded-[32px] flex items-center justify-center shadow-2xl shadow-red-600/40 active:scale-95 transition-transform cursor-pointer">
                    <Play className="w-10 h-10 fill-white text-white translate-x-1" />
                  </div>
                  <button 
                    onClick={handleNext}
                    className="p-6 bg-zinc-900 hover:bg-zinc-800 rounded-[28px] flex items-center justify-center transition-all group active:scale-90"
                  >
                    <SkipForward className="w-6 h-6 text-zinc-500 group-hover:text-white" />
                  </button>
               </div>

               <div className="flex items-center justify-between text-[10px] font-bold text-zinc-600 uppercase tracking-widest px-4">
                  <span>Vol 100%</span>
                  <div className="flex gap-4">
                     <button className="hover:text-white transition-colors"><Share2 className="w-4 h-4" /></button>
                  </div>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
