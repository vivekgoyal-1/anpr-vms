import { useEffect, useRef } from "react";
import { AlertTriangle, Play } from "lucide-react";

interface HLSPlayerProps {
  src: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
}

export default function HLSPlayer({ src, className, autoPlay = true, muted = true }: HLSPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Check if HLS.js is supported
    if (window.Hls && window.Hls.isSupported()) {
      const hls = new window.Hls({
        enableWorker: false,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);
      
      hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(window.Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case window.Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error, attempting to recover...');
              hls.startLoad();
              break;
            case window.Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, attempting to recover...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal error, destroying HLS instance');
              hls.destroy();
              break;
          }
        }
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = src;
      if (autoPlay) {
        video.play().catch(console.error);
      }
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src, autoPlay]);

  const handlePlay = () => {
    videoRef.current?.play().catch(console.error);
  };

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-cover bg-black"
        muted={muted}
        autoPlay={autoPlay}
        playsInline
        controls={false}
        data-testid="hls-video-player"
      />
      
      {/* Play button overlay for manual start */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
           onClick={handlePlay}>
        <Play className="h-12 w-12 text-white/80" />
      </div>
      
      {/* Error state - would need more sophisticated error handling */}
      {false && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="text-center text-white">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Stream unavailable</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Type declaration for HLS.js
declare global {
  interface Window {
    Hls: any;
  }
}
