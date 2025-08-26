import { useEffect, useState,useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import CameraGrid from "@/components/CameraGrid";
import AddCameraModal from "@/components/AddCameraModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Car, Circle } from "lucide-react";
import { cameraApi, anprApi, systemApi } from "@/lib/api";
import { Camera, AnprEvent, SystemStats } from "@/types";

export default function Dashboard() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [gridLayout, setGridLayout] = useState("3x3");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCamera, setShowAddCamera] = useState(false);
  const [recentAnprEvents, setRecentAnprEvents] = useState<AnprEvent[]>([]);

  // Queries
  const { data: cameras = [], refetch: refetchCameras } = useQuery({
    queryKey: ["/api/cameras"],
    enabled: isAuthenticated,
  });

  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
    enabled: isAuthenticated,
  });

  const { data: anprEvents = [] } = useQuery<AnprEvent[]>({
    queryKey: ["/api/anpr/events"],
    enabled: isAuthenticated,
    select: (data) => data.slice(0, 10), // Show only recent 10 events
  });

  // WebSocket for real-time updates
  // ✅ Make the callback stable
  const handleWebSocketMessage = useCallback((message: any) => {
    switch (message.event) {
      case 'camera-status':
        refetchCameras();
        break;
      case 'anpr-event':
        setRecentAnprEvents(prev => [message.data.event, ...prev.slice(0, 9)]);
        break;
      case 'camera-added':
      case 'camera-updated':
      case 'camera-deleted':
        refetchCameras();
        break;
    }
  }, [refetchCameras]);

  // ✅ Hook runs only once, and reconnects cleanly if dropped
  useWebSocket(handleWebSocketMessage);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [isAuthenticated, authLoading, setLocation]);

  if (authLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">Loading...</p>
      </div>
    </div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  const filteredCameras = cameras.filter((camera: Camera) =>
    camera.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    camera.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeRecordings = cameras.filter((camera: Camera) => 
    // Check if camera has an active recording (this would be determined by the backend)
    camera.recording?.mode === 'continuous' || camera.status === 'recording'
  );

  const combinedAnprEvents = [...(recentAnprEvents || []), ...(anprEvents || [])];
  const uniqueAnprEvents = combinedAnprEvents.filter((event, index, self) => 
    index === self.findIndex(e => e.id === event.id)
  ).slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Dashboard Controls */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-4">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-3 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold" data-testid="text-dashboard-title">Live Camera Dashboard</h2>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Grid:</span>
                <Select value={gridLayout} onValueChange={setGridLayout}>
                  <SelectTrigger className="w-20" data-testid="select-grid-layout">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2x2">2x2</SelectItem>
                    <SelectItem value="3x3">3x3</SelectItem>
                    <SelectItem value="4x4">4x4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Search cameras..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48"
                  data-testid="input-search-cameras"
                />
                <Button variant="outline" size="icon">
                  <Search className="h-4 w-4" />
                </Button>
              </div>
              <Button onClick={() => setShowAddCamera(true)} data-testid="button-add-camera">
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Grid */}
      <div className="p-6">
        <CameraGrid 
          cameras={filteredCameras} 
          gridLayout={gridLayout}
          onCameraUpdate={refetchCameras}
        />
      </div>

      {/* ANPR & Recording Panel */}
      <div className="border-t border-border bg-card">
        <div className="px-6 py-4">
          <div className="grid lg:grid-cols-2 gap-6">
            
            {/* Recent ANPR Events */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center space-x-2">
                  <Car className="h-4 w-4 text-primary" />
                  <span>Recent ANPR Events</span>
                </CardTitle>
                <Button variant="link" size="sm" onClick={() => setLocation("/anpr")}>
                  View All
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {uniqueAnprEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No ANPR events detected yet
                    </p>
                  ) : (
                    uniqueAnprEvents.map((event) => {
                      const camera = cameras.find((c: Camera) => c.id === event.cameraId);
                      return (
                        <div key={event.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                          <div className="w-12 h-8 bg-background rounded border flex items-center justify-center">
                            <span className="text-xs font-mono">{event.plate.substring(0, 6)}</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{event.plate}</span>
                              <Badge variant="secondary" className="text-xs">
                                {(event.confidence * 100).toFixed(1)}%
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                              <span>{camera?.name || 'Unknown Camera'}</span>
                              <span>•</span>
                              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Active Recordings */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base font-semibold flex items-center space-x-2">
                  <Circle className="h-4 w-4 text-destructive" />
                  <span>Active Recordings</span>
                </CardTitle>
                <Button variant="link" size="sm" onClick={() => setLocation("/recordings")}>
                  Manage
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {activeRecordings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No active recordings
                    </p>
                  ) : (
                    activeRecordings.map((camera: Camera) => (
                      <div key={camera.id} className="flex items-center space-x-3 p-3 bg-muted rounded-lg">
                        <div className="w-10 h-10 bg-destructive/20 rounded-full flex items-center justify-center">
                          <Circle className="h-3 w-3 text-destructive fill-destructive" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{camera.name}</span>
                            <span className="text-xs text-muted-foreground">Recording...</span>
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                            <span>Started {new Date().toLocaleTimeString()}</span>
                            <span>•</span>
                            <span>Continuous</span>
                          </div>
                        </div>
                        <Button size="sm" variant="destructive">
                          Stop
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
            
          </div>
        </div>
      </div>

      <AddCameraModal 
        open={showAddCamera} 
        onOpenChange={setShowAddCamera}
        onCameraAdded={refetchCameras}
      />
    </div>
  );
}
