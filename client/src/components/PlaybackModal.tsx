import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Volume2, 
  VolumeX, 
  Maximize, 
  Download,
  X
} from "lucide-react";
import { format } from "date-fns";
import { Recording, Camera, AnprEvent } from "@/types";

interface PlaybackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording | null;
  camera: Camera | undefined;
  anprEvents?: AnprEvent[];
}

export default function PlaybackModal({ 
  open, 
  onOpenChange, 
  recording, 
  camera,
  anprEvents = []
}: PlaybackModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Mock recording data for demonstration
  useEffect(() => {
    if (recording && videoRef.current) {
      // In a real implementation, you would load the actual recording file
      // For now, we'll set a mock duration
      setDuration(recording.durationSec || 0);
    }
  }, [recording]);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    const newTime = value[0];
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0];
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
  };

  const handleSkipBackward = () => {
    const newTime = Math.max(0, currentTime - 10);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const handleSkipForward = () => {
    const newTime = Math.min(duration, currentTime + 10);
    setCurrentTime(newTime);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number | null | undefined) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  if (!recording) return null;

  // Filter ANPR events for this recording's time range
  const recordingAnprEvents = anprEvents.filter(event => {
    const eventTime = new Date(event.timestamp);
    const startTime = new Date(recording.startTime);
    const endTime = recording.endTime ? new Date(recording.endTime) : new Date();
    return eventTime >= startTime && eventTime <= endTime;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0" data-testid="playback-modal">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Recording Playback</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-playback"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="p-6 pt-0">
          {/* Video Player */}
          <div className="bg-black rounded-lg aspect-video mb-6 relative overflow-hidden">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              data-testid="playback-video"
            >
              {/* In a real implementation, this would be the actual recording file */}
              <source src="/placeholder-video.mp4" type="video/mp4" />
            </video>
            
            {/* Video placeholder when no actual video */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/80">
              <div className="text-center text-white">
                <Play className="h-16 w-16 mx-auto mb-4 opacity-80" />
                <p className="text-lg mb-2">{camera?.name} Recording</p>
                <p className="text-sm opacity-80">
                  {format(new Date(recording.startTime), "PPP 'at' p")}
                  {recording.endTime && ` - ${format(new Date(recording.endTime), "p")}`}
                </p>
              </div>
            </div>
            
            {/* Player Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              {/* Timeline */}
              <div className="mb-4">
                <Slider
                  value={[currentTime]}
                  onValueChange={handleSeek}
                  max={duration}
                  step={1}
                  className="w-full"
                  data-testid="playback-timeline"
                />
                <div className="flex justify-between text-xs text-white mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>Current Time: {format(new Date(recording.startTime.getTime() + currentTime * 1000), "p")}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-primary"
                    onClick={handleSkipBackward}
                    data-testid="button-skip-back"
                  >
                    <SkipBack className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-primary text-xl"
                    onClick={handlePlayPause}
                    data-testid="button-play-pause"
                  >
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-primary"
                    onClick={handleSkipForward}
                    data-testid="button-skip-forward"
                  >
                    <SkipForward className="h-5 w-5" />
                  </Button>
                  <div className="flex items-center space-x-2">
                    <select
                      value={playbackRate}
                      onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                      className="bg-black/50 text-white border border-white/20 rounded px-2 py-1 text-sm"
                    >
                      <option value={0.25}>0.25x</option>
                      <option value={0.5}>0.5x</option>
                      <option value={1}>1x</option>
                      <option value={1.5}>1.5x</option>
                      <option value={2}>2x</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-primary"
                    data-testid="button-download-recording"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:text-primary"
                    data-testid="button-fullscreen"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:text-primary"
                      onClick={handleMuteToggle}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    <Slider
                      value={[isMuted ? 0 : volume]}
                      onValueChange={handleVolumeChange}
                      max={1}
                      step={0.1}
                      className="w-16"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recording Details */}
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recording Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Camera:</span>
                      <span className="font-medium">{camera?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Date:</span>
                      <span>{format(new Date(recording.startTime), "PPP")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Start Time:</span>
                      <span>{format(new Date(recording.startTime), "p")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">End Time:</span>
                      <span>
                        {recording.endTime 
                          ? format(new Date(recording.endTime), "p")
                          : "Recording..."
                        }
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Duration:</span>
                      <span>{formatTime(recording.durationSec || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">File Size:</span>
                      <span>{formatFileSize(recording.sizeBytes)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Format:</span>
                      <Badge variant="secondary">{recording.format?.toUpperCase()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Resolution:</span>
                      <span>{camera?.metadata?.resolution || "1920x1080"}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">ANPR Events ({recordingAnprEvents.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recordingAnprEvents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No license plates detected in this recording
                      </p>
                    ) : (
                      recordingAnprEvents.map((event) => (
                        <div
                          key={event.id}
                          className="p-3 bg-muted rounded cursor-pointer hover:bg-accent transition-colors"
                          onClick={() => {
                            // Jump to the time when this event occurred
                            const eventOffset = new Date(event.timestamp).getTime() - new Date(recording.startTime).getTime();
                            const seekTime = eventOffset / 1000;
                            setCurrentTime(seekTime);
                            if (videoRef.current) {
                              videoRef.current.currentTime = seekTime;
                            }
                          }}
                          data-testid={`anpr-event-${event.id}`}
                        >
                          <div className="font-medium text-sm">{event.plate}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(event.timestamp), "p")} • {(event.confidence * 100).toFixed(1)}%
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
