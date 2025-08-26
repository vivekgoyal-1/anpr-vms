import { useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import HLSPlayer from "./HLSPlayer";
import { Camera, Expand, Settings, Square, StopCircle, AlertTriangle, Wifi } from "lucide-react";
import { Camera as CameraType } from "@/types";
import { cameraApi } from "@/lib/api";

interface CameraTileProps {
  camera: CameraType;
  onCameraUpdate: () => void;
}

export default function CameraTile({ camera, onCameraUpdate }: CameraTileProps) {
  const [isRecording, setIsRecording] = useState(camera.recording?.mode === 'continuous');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: camera.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleSnapshot = async () => {
    setIsLoading(true);
    try {
      await cameraApi.takeSnapshot(camera.id);
      toast({
        title: "Snapshot captured",
        description: `Snapshot saved for ${camera.name}`,
      });
    } catch (error) {
      toast({
        title: "Snapshot failed",
        description: "Could not capture snapshot",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleRecording = async () => {
    setIsLoading(true);
    try {
      if (isRecording) {
        await cameraApi.stopRecording(camera.id);
        setIsRecording(false);
        toast({
          title: "Recording stopped",
          description: `Stopped recording ${camera.name}`,
        });
      } else {
        await cameraApi.startRecording(camera.id);
        setIsRecording(true);
        toast({
          title: "Recording started",
          description: `Started recording ${camera.name}`,
        });
      }
      onCameraUpdate();
    } catch (error) {
      toast({
        title: "Recording failed",
        description: "Could not toggle recording",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'status-online';
      case 'offline': return 'status-offline';
      case 'error': return 'status-offline';
      case 'reconnecting': return 'status-warning';
      default: return 'status-offline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'online': return 'LIVE';
      case 'offline': return 'OFFLINE';
      case 'error': return 'ERROR';
      case 'reconnecting': return 'RECONNECTING';
      default: return 'UNKNOWN';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Wifi className="h-3 w-3" />;
      case 'offline': return <AlertTriangle className="h-3 w-3" />;
      case 'error': return <AlertTriangle className="h-3 w-3" />;
      case 'reconnecting': return <Wifi className="h-3 w-3" />;
      default: return <AlertTriangle className="h-3 w-3" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-card rounded-lg border border-border overflow-hidden group hover:ring-2 hover:ring-ring transition-all duration-200 cursor-grab active:cursor-grabbing"
      data-testid={`camera-tile-${camera.id}`}
    >
      {/* Video Area */}
      <div className="relative aspect-video">
        {camera.status === 'online' ? (
          <HLSPlayer
            src={`/api/cameras/${camera.id}/hls-playlist.m3u8`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="video-placeholder w-full h-full flex items-center justify-center">
            <div className="text-center">
              {getStatusIcon(camera.status)}
              <p className="text-sm text-muted-foreground mt-2">{camera.name}</p>
              <p className="text-xs text-muted-foreground">
                {camera.metadata?.resolution || '1920x1080'} • {camera.metadata?.fps || 25}fps
              </p>
            </div>
          </div>
        )}
        
        {/* Status Overlay */}
        <div className="absolute top-2 left-2 flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-black/50 rounded px-2 py-1">
            <div className={`status-dot ${getStatusColor(camera.status)}`}></div>
            <span className="text-xs text-white">{getStatusText(camera.status)}</span>
          </div>
          {isRecording && (
            <div className="bg-black/50 rounded px-2 py-1">
              <span className="text-xs text-white">REC</span>
            </div>
          )}
        </div>

        {/* ANPR Overlay - Show recent detection if any */}
        {camera.anpr?.enabled && (
          <div className="absolute top-2 right-2">
            <div className="bg-primary/90 rounded px-2 py-1">
              <span className="text-xs text-primary-foreground font-mono">ANPR</span>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex space-x-1">
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white border-0 h-8 w-8 p-0"
              onClick={handleSnapshot}
              disabled={isLoading || camera.status !== 'online'}
              title="Take Snapshot"
              data-testid={`button-snapshot-${camera.id}`}
            >
              <Camera className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-black/50 hover:bg-black/70 text-white border-0 h-8 w-8 p-0"
              title="Fullscreen"
              data-testid={`button-fullscreen-${camera.id}`}
            >
              <Expand className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Camera Info */}
      <div className="p-3 border-t border-border">
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate" data-testid={`text-camera-name-${camera.id}`}>
              {camera.name}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {camera.location || 'No location'}
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            <Button
              size="sm"
              variant={isRecording ? "destructive" : "secondary"}
              onClick={handleToggleRecording}
              disabled={isLoading || camera.status !== 'online'}
              className="text-xs h-6 px-2"
              data-testid={`button-recording-${camera.id}`}
            >
              {isRecording ? (
                <>
                  <StopCircle className="h-3 w-3 mr-1" />
                  REC
                </>
              ) : (
                <>
                  <Square className="h-3 w-3 mr-1" />
                  REC
                </>
              )}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0"
                  data-testid={`button-settings-${camera.id}`}
                >
                  <Settings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>Edit Camera</DropdownMenuItem>
                <DropdownMenuItem>View Recordings</DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">Delete Camera</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
