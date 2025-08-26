import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useWebSocket } from "@/hooks/useWebSocket";
import Header from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, Car, Search, Download, Eye, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { anprApi, cameraApi } from "@/lib/api";
import { AnprEvent, Camera } from "@/types";

export default function AnprEvents() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedCamera, setSelectedCamera] = useState<string>("all");
  const [searchPlate, setSearchPlate] = useState("");
  const [dateFrom, setDateFrom] = useState<Date>();
  const [dateTo, setDateTo] = useState<Date>();
  const [realtimeEvents, setRealtimeEvents] = useState<AnprEvent[]>([]);

  // Queries
  const { data: cameras = [] } = useQuery<Camera[]>({
    queryKey: ["/api/cameras"],
    enabled: isAuthenticated,
  });

  const { data: anprEvents = [], isLoading, refetch } = useQuery<AnprEvent[]>({
    queryKey: ["/api/anpr/events", selectedCamera, dateFrom, dateTo, searchPlate],
    queryFn: async () => {
      const filters: any = {};
      if (selectedCamera !== "all") filters.cameraId = selectedCamera;
      if (dateFrom) filters.from = dateFrom.toISOString();
      if (dateTo) filters.to = dateTo.toISOString();
      if (searchPlate) filters.plate = searchPlate;

      const response = await anprApi.getEvents(filters);
      return response.json();
    },
    enabled: isAuthenticated,
  });

  // WebSocket for real-time ANPR events
  useWebSocket((message) => {
    if (message.event === 'anpr-event') {
      setRealtimeEvents(prev => [message.data.event, ...prev.slice(0, 49)]); // Keep last 50 events
      refetch(); // Refresh the main list
    }
  });

  if (authLoading || !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  // Combine realtime and fetched events, removing duplicates
  const allEvents = [...realtimeEvents, ...anprEvents];
  const uniqueEvents = allEvents.filter((event, index, self) => 
    index === self.findIndex(e => e.id === event.id)
  );

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-500";
    if (confidence >= 0.8) return "text-yellow-500";
    return "text-red-500";
  };

  const getConfidenceBadge = (confidence: number) => {
    const percentage = (confidence * 100).toFixed(1);
    if (confidence >= 0.9) return <Badge className="bg-green-500/20 text-green-500">{percentage}%</Badge>;
    if (confidence >= 0.8) return <Badge className="bg-yellow-500/20 text-yellow-500">{percentage}%</Badge>;
    return <Badge className="bg-red-500/20 text-red-500">{percentage}%</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center" data-testid="text-anpr-title">
            <Car className="h-6 w-6 mr-2" />
            ANPR Events
          </h1>
          <p className="text-muted-foreground">License plate recognition events and detections</p>
        </div>

        {/* Live Events Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Car className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold" data-testid="text-total-events">{uniqueEvents.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">High Confidence</p>
                  <p className="text-2xl font-bold text-green-500">
                    {uniqueEvents.filter(e => e.confidence >= 0.9).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Medium Confidence</p>
                  <p className="text-2xl font-bold text-yellow-500">
                    {uniqueEvents.filter(e => e.confidence >= 0.8 && e.confidence < 0.9).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <div>
                  <p className="text-sm text-muted-foreground">Low Confidence</p>
                  <p className="text-2xl font-bold text-red-500">
                    {uniqueEvents.filter(e => e.confidence < 0.8).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters & Search</CardTitle>
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

              {/* Plate Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">License Plate</label>
                <Input
                  placeholder="Search by plate..."
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                  data-testid="input-search-plate"
                />
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

              {/* Clear Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium invisible">Actions</label>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedCamera("all");
                    setSearchPlate("");
                    setDateFrom(undefined);
                    setDateTo(undefined);
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

        {/* Events Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <span>ANPR Events ({uniqueEvents.length})</span>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-muted-foreground">Live</span>
                </div>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4 mr-1" />
                  Export CSV
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Loading ANPR events...</p>
              </div>
            ) : uniqueEvents.length === 0 ? (
              <div className="text-center py-8">
                <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No ANPR events found</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Make sure ANPR is enabled on your cameras and they are actively monitoring
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>License Plate</TableHead>
                    <TableHead>Camera</TableHead>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Snapshot</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uniqueEvents.map((event) => {
                    const camera = cameras.find(c => c.id === event.cameraId);
                    const isRecent = Date.now() - new Date(event.timestamp).getTime() < 30000; // Last 30 seconds
                    
                    return (
                      <TableRow 
                        key={event.id} 
                        className={isRecent ? "bg-primary/5 border-primary/20" : ""}
                        data-testid={`anpr-event-row-${event.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <div className="w-16 h-10 bg-background border rounded flex items-center justify-center">
                              <span className="text-xs font-mono font-bold">{event.plate}</span>
                            </div>
                            {isRecent && (
                              <Badge variant="destructive" className="text-xs">NEW</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">
                          {camera?.name || 'Unknown Camera'}
                          {camera?.location && (
                            <div className="text-sm text-muted-foreground">{camera.location}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div>{format(new Date(event.timestamp), "PPP")}</div>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(event.timestamp), "p")}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getConfidenceBadge(event.confidence)}
                        </TableCell>
                        <TableCell>
                          {event.snapshotPath ? (
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">No snapshot</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-view-details-${event.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Details
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              data-testid={`button-export-${event.id}`}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Export
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
    </div>
  );
}
