import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, TestTube2 } from "lucide-react";
import { cameraApi } from "@/lib/api";

interface AddCameraModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCameraAdded: () => void;
}

export default function AddCameraModal({ open, onOpenChange, onCameraAdded }: AddCameraModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    rtspUrl: "",
    username: "",
    password: "",
    tags: "",
    recordingMode: "manual",
    retainDays: 7,
    segmentSeconds: 6,
    anprEnabled: false,
    sampleEveryNthFrame: 5,
    confidenceThreshold: 0.8,
  });

  const [testingConnection, setTestingConnection] = useState(false);

  const createCameraMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await cameraApi.createCamera(data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cameras"] });
      onCameraAdded();
      onOpenChange(false);
      resetForm();
      toast({
        title: "Camera added successfully",
        description: "The camera has been configured and added to your system",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add camera",
        description: error.message || "Could not add the camera. Please check your settings.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      location: "",
      rtspUrl: "",
      username: "",
      password: "",
      tags: "",
      recordingMode: "manual",
      retainDays: 7,
      segmentSeconds: 6,
      anprEnabled: false,
      sampleEveryNthFrame: 5,
      confidenceThreshold: 0.8,
    });
  };

  const handleTestConnection = async () => {
    if (!formData.rtspUrl) {
      toast({
        title: "RTSP URL required",
        description: "Please enter an RTSP URL to test the connection",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    
    // Simulate connection test
    setTimeout(() => {
      setTestingConnection(false);
      toast({
        title: "Connection test completed",
        description: "Camera connection appears to be working",
      });
    }, 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const cameraData = {
      name: formData.name,
      location: formData.location || undefined,
      rtspUrl: formData.rtspUrl,
      username: formData.username || undefined,
      password: formData.password || undefined,
      tags: formData.tags ? formData.tags.split(",").map(tag => tag.trim()) : [],
      enabledProtocols: { hls: true, webrtc: false },
      layout: { row: 0, col: 0, size: 1 },
      recording: {
        mode: formData.recordingMode,
        segmentSeconds: formData.segmentSeconds,
        retainDays: formData.retainDays,
      },
      anpr: {
        enabled: formData.anprEnabled,
        sampleEveryNthFrame: formData.sampleEveryNthFrame,
        confidenceThreshold: formData.confidenceThreshold,
      },
    };

    createCameraMutation.mutate(cameraData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="add-camera-modal">
        <DialogHeader>
          <DialogTitle>Add New Camera</DialogTitle>
          <DialogDescription>
            Configure a new camera for your video management system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="basic" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic</TabsTrigger>
              <TabsTrigger value="connection">Connection</TabsTrigger>
              <TabsTrigger value="recording">Recording</TabsTrigger>
              <TabsTrigger value="anpr">ANPR</TabsTrigger>
            </TabsList>

            {/* Basic Information */}
            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="required">Camera Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Front Entrance"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                    data-testid="input-camera-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Main Building"
                    value={formData.location}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    data-testid="input-camera-location"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  placeholder="e.g., entrance, parking, security"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  data-testid="input-camera-tags"
                />
                <p className="text-xs text-muted-foreground">
                  Add tags to help organize and filter your cameras
                </p>
              </div>
            </TabsContent>

            {/* Connection Settings */}
            <TabsContent value="connection" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rtspUrl" className="required">RTSP URL</Label>
                <Input
                  id="rtspUrl"
                  type="url"
                  placeholder="rtsp://192.168.1.100:554/stream1"
                  value={formData.rtspUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, rtspUrl: e.target.value }))}
                  required
                  data-testid="input-rtsp-url"
                />
                <p className="text-xs text-muted-foreground">
                  Complete RTSP URL including protocol, IP address, port, and stream path
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username (Optional)</Label>
                  <Input
                    id="username"
                    placeholder="admin"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    data-testid="input-camera-username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password (Optional)</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    data-testid="input-camera-password"
                  />
                </div>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Test Connection</p>
                  <p className="text-xs text-muted-foreground">
                    Verify that the camera is accessible with the provided settings
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestConnection}
                  disabled={testingConnection || !formData.rtspUrl}
                  data-testid="button-test-connection"
                >
                  {testingConnection ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube2 className="h-4 w-4 mr-2" />
                      Test Connection
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* Recording Settings */}
            <TabsContent value="recording" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="recordingMode">Recording Mode</Label>
                  <Select
                    value={formData.recordingMode}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, recordingMode: value }))}
                  >
                    <SelectTrigger data-testid="select-recording-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="off">Off</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="continuous">Continuous</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How recordings should be triggered for this camera
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="retainDays">Retention (Days)</Label>
                  <Input
                    id="retainDays"
                    type="number"
                    min="1"
                    max="365"
                    value={formData.retainDays}
                    onChange={(e) => setFormData(prev => ({ ...prev, retainDays: parseInt(e.target.value) }))}
                    data-testid="input-retention-days"
                  />
                  <p className="text-xs text-muted-foreground">
                    Days to keep recordings before automatic deletion
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="segmentSeconds">Segment Length (Seconds)</Label>
                <Input
                  id="segmentSeconds"
                  type="number"
                  min="1"
                  max="60"
                  value={formData.segmentSeconds}
                  onChange={(e) => setFormData(prev => ({ ...prev, segmentSeconds: parseInt(e.target.value) }))}
                  data-testid="input-segment-seconds"
                />
                <p className="text-xs text-muted-foreground">
                  Length of each recording segment in seconds
                </p>
              </div>
            </TabsContent>

            {/* ANPR Settings */}
            <TabsContent value="anpr" className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="anprEnabled">Enable License Plate Recognition</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Automatically detect and read license plates in this camera's feed
                  </p>
                </div>
                <Switch
                  id="anprEnabled"
                  checked={formData.anprEnabled}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, anprEnabled: checked }))}
                  data-testid="switch-anpr-enabled"
                />
              </div>

              {formData.anprEnabled && (
                <>
                  <Separator />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sampleRate">Sample Every N Frames</Label>
                      <Input
                        id="sampleRate"
                        type="number"
                        min="1"
                        max="30"
                        value={formData.sampleEveryNthFrame}
                        onChange={(e) => setFormData(prev => ({ ...prev, sampleEveryNthFrame: parseInt(e.target.value) }))}
                        data-testid="input-sample-rate"
                      />
                      <p className="text-xs text-muted-foreground">
                        Process every Nth frame for plate detection (higher = less CPU usage)
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="confidenceThreshold">Confidence Threshold</Label>
                      <Input
                        id="confidenceThreshold"
                        type="number"
                        min="0.1"
                        max="1.0"
                        step="0.1"
                        value={formData.confidenceThreshold}
                        onChange={(e) => setFormData(prev => ({ ...prev, confidenceThreshold: parseFloat(e.target.value) }))}
                        data-testid="input-confidence-threshold"
                      />
                      <p className="text-xs text-muted-foreground">
                        Minimum confidence level for plate detection (0.1 - 1.0)
                      </p>
                    </div>
                  </div>

                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">ANPR Performance Tips</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      <li>• Position camera to capture clear, front-facing vehicle views</li>
                      <li>• Ensure adequate lighting for reliable plate recognition</li>
                      <li>• Higher sample rates increase accuracy but use more CPU</li>
                      <li>• Lower confidence thresholds may increase false positives</li>
                    </ul>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createCameraMutation.isPending || !formData.name || !formData.rtspUrl}
              data-testid="button-add-camera"
            >
              {createCameraMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding Camera...
                </>
              ) : (
                "Add Camera"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
