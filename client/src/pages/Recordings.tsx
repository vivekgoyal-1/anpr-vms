import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import PlaybackModal from "@/components/PlaybackModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Download, Eye, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { recordingApi, cameraApi } from "@/lib/api";
import { Recording, Camera } from "@/types";

export default function Recordings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [showPlayback, setShowPlayback] = useState(false);

  // Queries
  const { data: cameras = [] } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
    enabled: isAuthenticated,
  });

  const { data: recordings = [], isLoading } = useQuery<Recording[]>({
    queryKey: ["/api/recordings", selectedCamera, dateFrom, dateTo],
    queryFn: async () => {
      const filters: any = {};
      if (selectedCamera !== "all") filters.cameraId = selectedCamera;
      if (dateFrom) filters.from = dateFrom.toISOString();
      if (dateTo) filters.to = dateTo.toISOString();

      const response = await recordingApi.getRecordings(filters);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const filteredRecordings = recordings.filter((recording) => {
    const camera = cameras.find(c => c.id === recording.cameraId);
    const cameraName = camera?.name || '';
    return cameraName.toLowerCase().includes(searchQuery.toLowerCase());
  });

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

  const formatDuration = (seconds: number | null | undefined) => {
    if (!seconds) return 'Unknown';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayback = (recording: Recording) => {
    setSelectedRecording(recording);
    setShowPlayback(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2" data-testid="text-recordings-title">Recordings</h1>
          <p className="text-muted-foreground">View and manage camera recordings</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* Camera Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Camera</label>
                <Select value={selectedCamera} onValueChange={setSelectedCamera}>
                  <SelectTrigger data-testid="select-camera-filter">
                    <SelectValue placeholder="All cameras" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cameras</SelectItem>
                    {cameras.map((camera) => (
                      <SelectItem key={camera.id} value={camera.id}>
                        {camera.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <label className="text-sm font-medium">From Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <label className="text-sm font-medium">To Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input
                  placeholder="Search recordings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-recordings"
                />
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Actions</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCamera("all");
                    setDateFrom(undefined);
                    setDateTo(undefined);
                    setSearchQuery("");
                  }}
                  className="w-full"
                  data-testid="button-clear-filters"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recordings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>Recordings ({filteredRecordings.length})</span>
              <Badge variant="secondary">{formatFileSize(filteredRecordings.reduce((acc, r) => acc + (r.sizeBytes || 0), 0))} total</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading recordings...</p>
              </div>
            ) : filteredRecordings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No recordings found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Camera</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Format</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecordings.map((recording) => {
                    const camera = cameras.find(c => c.id === recording.cameraId);
                    const isActive = !recording.endTime;
                    
                    return (
                      <TableRow key={recording.id} data-testid={`recording-row-${recording.id}`}>
                        <TableCell className="font-medium">
                          {camera?.name || 'Unknown Camera'}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{format(new Date(recording.startTime), "PPP")}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(recording.startTime), "p")}
                              {recording.endTime && ` - ${format(new Date(recording.endTime), "p")}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge variant="destructive">Recording...</Badge>
                          ) : (
                            formatDuration(recording.durationSec)
                          )}
                        </TableCell>
                        <TableCell>{formatFileSize(recording.sizeBytes)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{recording.format?.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge variant="destructive">Active</Badge>
                          ) : (
                            <Badge variant="default">Complete</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePlayback(recording)}
                              disabled={isActive}
                              data-testid={`button-playback-${recording.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActive}
                              data-testid={`button-download-${recording.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <PlaybackModal
        open={showPlayback}
        onOpenChange={setShowPlayback}
        recording={selectedRecording}
        camera={selectedRecording ? cameras.find(c => c.id === selectedRecording.cameraId) : undefined}
      />
    </div>
  );
}
