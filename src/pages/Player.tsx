import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { collection, query, where, onSnapshot, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "../lib/firebase";
import { Play, SkipBack, SkipForward, Volume2, VolumeX, List, Tv } from "lucide-react";
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
  const [isPlaying, setIsPlaying] = useState(true);
  const [channelName, setChannelName] = useState("Loading...");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  const ytPlayerRef = useRef<any>(null);
  const fbPlayerRef = useRef<any>(null);

  // 1. Fetch Channel and Playlist
  useEffect(() => {
    if (!channelSlug) return;

    // First find the channel by slug
    const channelsQuery = query(collection(db, "channels"), where("slug", "==", channelSlug), limit(1));
    const unsubChannel = onSnapshot(channelsQuery, (snapshot) => {
      if (!snapshot.empty) {
        const channelDoc = snapshot.docs[0];
        setChannelName(channelDoc.data().name);

        // Then listen to its videos
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
    
    window.onYouTubeIframeAPIReady = () => {
      console.log("YT API Ready");
    };
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
    setCurrentIndex((prev) => (prev + 1) % videos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + videos.length) % videos.length);
  };

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
      // Re-parse when FB video changes
      setTimeout(() => window.FB.XFBML.parse(), 100);
    }
  }, [currentIndex, currentVideo]);

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex flex-col items-center justify-center space-y-4">
        <Tv className="w-16 h-16 text-zinc-800 animate-pulse" />
        <p className="text-zinc-600 font-bold uppercase tracking-widest italic">{channelName}</p>
        <p className="text-zinc-400 text-sm">No active broadcast found for this channel.</p>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden flex flex-col lg:flex-row">
      {/* Main Player Area */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        {currentVideo?.type === 'yt' ? (
          <div id="yt-player-target" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div 
              className="fb-video" 
              data-href={currentVideo?.val} 
              data-autoplay="true" 
              data-allowfullscreen="true"
              data-width="auto"
              data-show-captions="false"
            />
          </div>
        )}

        {/* Overlay Controls (Mobile) */}
        {!sidebarOpen && (
           <button 
             onClick={() => setSidebarOpen(true)}
             className="absolute top-4 right-4 z-20 p-3 bg-black/50 hover:bg-red-600 rounded-full transition-all text-white backdrop-blur-md"
           >
             <List className="w-6 h-6" />
           </button>
        )}

        {/* Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none group">
           <motion.div 
             key={currentVideo?.id}
             initial={{ opacity: 0, x: -20 }}
             animate={{ opacity: 1, x: 0 }}
             className="max-w-2xl"
           >
             <span className="inline-block px-3 py-1 bg-red-600 rounded text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-[0_0_20px_rgba(220,38,38,0.5)]">Now Playing</span>
             <h2 className="text-3xl lg:text-5xl font-black italic uppercase tracking-tighter leading-none mb-2 drop-shadow-2xl">
               {currentVideo?.title}
             </h2>
             <div className="flex items-center gap-2 text-zinc-400 font-bold italic uppercase text-xs tracking-widest">
                <Tv className="w-4 h-4 text-red-600" />
                <span>On {channelName}</span>
             </div>
           </motion.div>
        </div>
      </div>

      {/* Playlist Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div 
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            className="w-full lg:w-[400px] h-[300px] lg:h-full bg-zinc-950 border-l border-white/10 flex flex-col z-30"
          >
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-black italic uppercase tracking-widest">Upcoming List</h3>
              <button 
                onClick={() => setSidebarOpen(false)}
                className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg text-zinc-400"
              >
                Close
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide">
              {videos.map((v, i) => (
                <button
                  key={v.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`w-full p-4 flex gap-4 text-left transition-all border-b border-white/5 ${
                    i === currentIndex 
                    ? 'bg-red-600/10 border-l-4 border-l-red-600' 
                    : 'hover:bg-zinc-900 border-l-4 border-l-transparent'
                  }`}
                >
                  <div className="w-24 aspect-video bg-zinc-900 rounded-lg shrink-0 flex items-center justify-center overflow-hidden relative">
                    {v.type === 'yt' ? (
                      <img 
                        src={`https://img.youtube.com/vi/${v.val}/mqdefault.jpg`} 
                        alt="thumb" 
                        className="w-full h-full object-cover opacity-60"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Tv className="w-8 h-8 text-zinc-800" />
                    )}
                    {i === currentIndex && (
                      <div className="absolute inset-0 bg-red-600/20 flex items-center justify-center">
                        <Play className="w-6 h-6 fill-white text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 py-1">
                    <h4 className={`font-bold text-sm truncate uppercase tracking-tight ${i === currentIndex ? 'text-red-500' : 'text-zinc-200'}`}>
                      {v.title}
                    </h4>
                    <p className="text-[10px] text-zinc-500 font-black uppercase mt-1">
                      {v.type === 'yt' ? 'YouTube Feed' : 'Facebook Live'}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-6 bg-black/50 border-t border-white/5 grid grid-cols-3 gap-3">
              <button 
                onClick={handlePrev}
                className="p-4 bg-zinc-900 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all group"
              >
                <SkipBack className="w-5 h-5 group-active:scale-90" />
              </button>
              <button className="p-4 bg-zinc-900 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all group">
                <Play className="w-5 h-5 fill-white" />
              </button>
              <button 
                onClick={handleNext}
                className="p-4 bg-zinc-900 hover:bg-red-600 rounded-xl flex items-center justify-center transition-all group"
              >
                <SkipForward className="w-5 h-5 group-active:scale-90" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
