import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Video, Bell, ChevronDown, LogOut } from "lucide-react";
import { systemApi } from "@/lib/api";
import { SystemStats } from "@/types";

export default function Header() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  
  const { data: systemStats } = useQuery<SystemStats>({
    queryKey: ["/api/system/stats"],
  });

  const navigationItems = [
    { label: "Dashboard", path: "/" },
    { label: "Recordings", path: "/recordings" },
    { label: "ANPR Events", path: "/anpr" },
    { label: "Settings", path: "/settings" },
  ];

  const handleLogout = () => {
    logout();
    setLocation("/login");
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Video className="h-5 w-5 text-primary" />
              <h1 className="text-xl font-bold" data-testid="text-app-title">CamSentinel VMS</h1>
            </div>
            <div className="hidden md:flex items-center space-x-1 bg-muted rounded-lg p-1">
              {navigationItems.map((item) => (
                <Button
                  key={item.path}
                  variant={location === item.path ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setLocation(item.path)}
                  data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* System Status */}
            <div className="hidden lg:flex items-center space-x-3 text-sm">
              <div className="flex items-center space-x-1">
                <div className="status-dot status-online"></div>
                <span className="text-muted-foreground">System:</span>
                <span className="text-green-400">Online</span>
              </div>
              <div className="flex items-center space-x-1">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span data-testid="text-cameras-count">
                  {systemStats?.activeCameras || 0}/{systemStats?.totalCameras || 0}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-destructive rounded-full"></div>
                <span data-testid="text-recordings-count">{systemStats?.activeRecordings || 0}</span>
              </div>
            </div>

            {/* Notifications */}
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-4 w-4" />
              {systemStats?.todayAnprEvents && systemStats.todayAnprEvents > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                  {systemStats.todayAnprEvents > 99 ? '99+' : systemStats.todayAnprEvents}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <div className="flex items-center space-x-2 pl-2 border-l border-border">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 data-testid-user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user ? getInitials(user.email) : 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:inline text-sm" data-testid="text-user-email">
                      {user?.email || 'User'}
                    </span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
