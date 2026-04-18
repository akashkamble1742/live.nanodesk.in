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
  startTime?: number;
  endTime?: number;
}

export default function Player() {
  const { channelSlug } = useParams();
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [channelName, setChannelName] = useState("Loading...");
  const [loopPlaylist, setLoopPlaylist] = useState(false);
  
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
        <div className="p-8 border-b border-white/5 bg-zinc-900/50">
          <div className="space-y-1">
            <h3 className="text-xs font-black italic uppercase tracking-[0.3em] text-zinc-500">Live Feed</h3>
            <h4 className="text-xl font-black uppercase italic tracking-tighter">Sequence Menu</h4>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-black/20">
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
              <div className="w-24 aspect-video bg-zinc-900 rounded-[15px] shrink-0 flex items-center justify-center overflow-hidden relative border border-white/5">
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
                  <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                    <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 py-1 flex flex-col justify-center">
                <h4 className={`font-black uppercase tracking-tight leading-tight line-clamp-2 text-xs ${i === currentIndex ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
                  {v.title}
                </h4>
                <div className="flex items-center justify-between mt-2">
                   <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">
                     {v.type === 'yt' ? 'M-YOUTUBE' : 'M-FACEBOOK'}
                   </span>
                   {i === currentIndex && <ChevronRight className="w-4 h-4 text-red-600" />}
                </div>
              </div>
            </motion.button>
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
    </div>
  );
}
