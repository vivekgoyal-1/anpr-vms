import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Camera, 
  HardDrive, 
  Shield, 
  Zap, 
  Database,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { systemApi } from "@/lib/api";
import { SystemStats } from "@/types";

export default function Settings() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // System settings state
  const [systemSettings, setSystemSettings] = useState({
    retentionDays: 7,
    maxRecordingSize: 1000,
    enableAnpr: true,
    anprConfidenceThreshold: 0.8,
    maxConcurrentStreams: 10,
    hlsSegmentDuration: 2,
    enableNotifications: true,
    notificationEmail: "",
  });

  // Camera defaults state
  const [cameraDefaults, setCameraDefaults] = useState({
    recordingMode: "manual",
    segmentDuration: 6,
    retentionDays: 7,
    anprEnabled: false,
    anprSampleRate: 5,
    resolution: "1920x1080",
    frameRate: 25,
  });

  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
    enabled: isAuthenticated,
  });

  if (authLoading || !isAuthenticated) {
    setLocation("/login");
    return null;
  }

  const handleSaveSystemSettings = () => {
    // In a real implementation, this would call an API
    toast({
      title: "Settings saved",
      description: "System settings have been updated successfully",
    });
  };

  const handleSaveCameraDefaults = () => {
    // In a real implementation, this would call an API
    toast({
      title: "Defaults saved",
      description: "Camera default settings have been updated",
    });
  };

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2 flex items-center" data-testid="text-settings-title">
            <SettingsIcon className="h-6 w-6 mr-2" />
            Settings
          </h1>
          <p className="text-muted-foreground">Configure system preferences and camera defaults</p>
        </div>

        <Tabs defaultValue="system" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="system" data-testid="tab-system">System</TabsTrigger>
            <TabsTrigger value="cameras" data-testid="tab-cameras">Cameras</TabsTrigger>
            <TabsTrigger value="storage" data-testid="tab-storage">Storage</TabsTrigger>
            <TabsTrigger value="security" data-testid="tab-security">Security</TabsTrigger>
          </TabsList>

          {/* System Settings */}
          <TabsContent value="system" className="space-y-6">
            {/* System Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Camera className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{systemStats?.activeCameras || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Cameras</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <HardDrive className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{systemStats?.activeRecordings || 0}</p>
                    <p className="text-sm text-muted-foreground">Active Recordings</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <Zap className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{systemStats?.todayAnprEvents || 0}</p>
                    <p className="text-sm text-muted-foreground">ANPR Events Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* General Settings */}
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Configure system-wide preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="retention">Default Retention Days</Label>
                    <Input
                      id="retention"
                      type="number"
                      value={systemSettings.retentionDays}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                      min="1"
                      max="365"
                    />
                    <p className="text-xs text-muted-foreground">Days to keep recordings before automatic deletion</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxSize">Max Recording Size (MB)</Label>
                    <Input
                      id="maxSize"
                      type="number"
                      value={systemSettings.maxRecordingSize}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maxRecordingSize: parseInt(e.target.value) }))}
                      min="100"
                    />
                    <p className="text-xs text-muted-foreground">Maximum size per recording file</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="streams">Max Concurrent Streams</Label>
                    <Input
                      id="streams"
                      type="number"
                      value={systemSettings.maxConcurrentStreams}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, maxConcurrentStreams: parseInt(e.target.value) }))}
                      min="1"
                      max="50"
                    />
                    <p className="text-xs text-muted-foreground">Maximum number of concurrent video streams</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segment">HLS Segment Duration (seconds)</Label>
                    <Input
                      id="segment"
                      type="number"
                      value={systemSettings.hlsSegmentDuration}
                      onChange={(e) => setSystemSettings(prev => ({ ...prev, hlsSegmentDuration: parseInt(e.target.value) }))}
                      min="1"
                      max="10"
                    />
                    <p className="text-xs text-muted-foreground">Duration of each HLS video segment</p>
                  </div>
                </div>

                <Separator />

                {/* ANPR Settings */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="anpr-enable">Enable ANPR System</Label>
                      <p className="text-xs text-muted-foreground">Automatic Number Plate Recognition</p>
                    </div>
                    <Switch
                      id="anpr-enable"
                      checked={systemSettings.enableAnpr}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, enableAnpr: checked }))}
                      data-testid="switch-enable-anpr"
                    />
                  </div>

                  {systemSettings.enableAnpr && (
                    <div className="space-y-2">
                      <Label htmlFor="confidence">ANPR Confidence Threshold</Label>
                      <Input
                        id="confidence"
                        type="number"
                        step="0.1"
                        min="0.1"
                        max="1.0"
                        value={systemSettings.anprConfidenceThreshold}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, anprConfidenceThreshold: parseFloat(e.target.value) }))}
                      />
                      <p className="text-xs text-muted-foreground">Minimum confidence level for plate detection (0.1 - 1.0)</p>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Notifications */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="notifications">Enable Notifications</Label>
                      <p className="text-xs text-muted-foreground">Email alerts for system events</p>
                    </div>
                    <Switch
                      id="notifications"
                      checked={systemSettings.enableNotifications}
                      onCheckedChange={(checked) => setSystemSettings(prev => ({ ...prev, enableNotifications: checked }))}
                    />
                  </div>

                  {systemSettings.enableNotifications && (
                    <div className="space-y-2">
                      <Label htmlFor="email">Notification Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={systemSettings.notificationEmail}
                        onChange={(e) => setSystemSettings(prev => ({ ...prev, notificationEmail: e.target.value }))}
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveSystemSettings} data-testid="button-save-system-settings">
                    Save System Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Camera Defaults */}
          <TabsContent value="cameras" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Camera Default Settings</CardTitle>
                <CardDescription>Default configuration for new cameras</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="recording-mode">Default Recording Mode</Label>
                    <Select
                      value={cameraDefaults.recordingMode}
                      onValueChange={(value) => setCameraDefaults(prev => ({ ...prev, recordingMode: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="off">Off</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="continuous">Continuous</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="segment-duration">Segment Duration (seconds)</Label>
                    <Input
                      id="segment-duration"
                      type="number"
                      value={cameraDefaults.segmentDuration}
                      onChange={(e) => setCameraDefaults(prev => ({ ...prev, segmentDuration: parseInt(e.target.value) }))}
                      min="1"
                      max="60"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="camera-retention">Retention Days</Label>
                    <Input
                      id="camera-retention"
                      type="number"
                      value={cameraDefaults.retentionDays}
                      onChange={(e) => setCameraDefaults(prev => ({ ...prev, retentionDays: parseInt(e.target.value) }))}
                      min="1"
                      max="365"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sample-rate">ANPR Sample Rate (frames)</Label>
                    <Input
                      id="sample-rate"
                      type="number"
                      value={cameraDefaults.anprSampleRate}
                      onChange={(e) => setCameraDefaults(prev => ({ ...prev, anprSampleRate: parseInt(e.target.value) }))}
                      min="1"
                      max="30"
                    />
                    <p className="text-xs text-muted-foreground">Process every Nth frame for ANPR</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="resolution">Default Resolution</Label>
                    <Select
                      value={cameraDefaults.resolution}
                      onValueChange={(value) => setCameraDefaults(prev => ({ ...prev, resolution: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1920x1080">1920x1080 (Full HD)</SelectItem>
                        <SelectItem value="1280x720">1280x720 (HD)</SelectItem>
                        <SelectItem value="640x480">640x480 (SD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="framerate">Default Frame Rate</Label>
                    <Select
                      value={cameraDefaults.frameRate.toString()}
                      onValueChange={(value) => setCameraDefaults(prev => ({ ...prev, frameRate: parseInt(value) }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 fps</SelectItem>
                        <SelectItem value="25">25 fps</SelectItem>
                        <SelectItem value="30">30 fps</SelectItem>
                        <SelectItem value="60">60 fps</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="anpr-default">Enable ANPR by Default</Label>
                    <p className="text-xs text-muted-foreground">New cameras will have ANPR enabled</p>
                  </div>
                  <Switch
                    id="anpr-default"
                    checked={cameraDefaults.anprEnabled}
                    onCheckedChange={(checked) => setCameraDefaults(prev => ({ ...prev, anprEnabled: checked }))}
                  />
                </div>

                <div className="flex justify-end">
                  <Button onClick={handleSaveCameraDefaults} data-testid="button-save-camera-defaults">
                    Save Camera Defaults
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Storage Settings */}
          <TabsContent value="storage" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  Storage Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="font-medium">Storage Usage</h3>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Used</span>
                        <span>{formatBytes(systemStats?.storageUsed || 0)}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ 
                            width: `${systemStats?.storageTotal ? (systemStats.storageUsed / systemStats.storageTotal) * 100 : 0}%` 
                          }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>0 GB</span>
                        <span>{formatBytes(systemStats?.storageTotal || 0)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium">Cleanup Actions</h3>
                    <div className="space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <HardDrive className="h-4 w-4 mr-2" />
                        Clean Old Recordings
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Camera className="h-4 w-4 mr-2" />
                        Clean Snapshots
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Database className="h-4 w-4 mr-2" />
                        Optimize Database
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <HardDrive className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                      <p className="text-2xl font-bold">42</p>
                      <p className="text-sm text-muted-foreground">Total Recordings</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Camera className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <p className="text-2xl font-bold">156</p>
                      <p className="text-sm text-muted-foreground">Snapshots</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <Zap className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                      <p className="text-2xl font-bold">89</p>
                      <p className="text-sm text-muted-foreground">ANPR Events</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Security & Access
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Two-Factor Authentication</h3>
                      <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
                    </div>
                    <Badge variant="outline">Not Configured</Badge>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">API Access</h3>
                      <p className="text-sm text-muted-foreground">Generate API keys for external access</p>
                    </div>
                    <Button variant="outline" size="sm">Configure</Button>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Session Timeout</h3>
                      <p className="text-sm text-muted-foreground">Automatic logout after inactivity</p>
                    </div>
                    <Select defaultValue="24">
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 hour</SelectItem>
                        <SelectItem value="8">8 hours</SelectItem>
                        <SelectItem value="24">24 hours</SelectItem>
                        <SelectItem value="168">1 week</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">Audit Logging</h3>
                      <p className="text-sm text-muted-foreground">Track user actions and system events</p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-medium">RTSP Credential Security</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="font-medium">Encryption Enabled</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Camera passwords are encrypted at rest using AES-256-GCM
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Rotate Encryption Key</span>
                      </div>
                      <Button variant="outline" size="sm" className="mt-2">
                        Generate New Key
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
