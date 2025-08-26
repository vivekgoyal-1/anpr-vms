import { useState } from "react";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from "@dnd-kit/core";
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from "@dnd-kit/sortable";
import CameraTile from "./CameraTile";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Camera } from "@/types";
import { cameraApi } from "@/lib/api";

interface CameraGridProps {
  cameras: Camera[];
  gridLayout: string;
  onCameraUpdate: () => void;
}

export default function CameraGrid({ cameras, gridLayout, onCameraUpdate }: CameraGridProps) {
  const [sortedCameras, setSortedCameras] = useState(cameras);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = sortedCameras.findIndex(camera => camera.id === active.id);
      const newIndex = sortedCameras.findIndex(camera => camera.id === over?.id);
      
      const newOrder = arrayMove(sortedCameras, oldIndex, newIndex);
      setSortedCameras(newOrder);

      // Update layout positions in backend
      try {
        await Promise.all(
          newOrder.map((camera, index) => 
            cameraApi.updateCamera(camera.id, {
              layout: { 
                row: Math.floor(index / getGridColumns(gridLayout)), 
                col: index % getGridColumns(gridLayout), 
                size: 1 
              }
            })
          )
        );
        onCameraUpdate();
      } catch (error) {
        console.error("Failed to update camera layout:", error);
        // Revert on error
        setSortedCameras(cameras);
      }
    }
  };

  const getGridColumns = (layout: string) => {
    switch (layout) {
      case "2x2": return 2;
      case "3x3": return 3;
      case "4x4": return 4;
      default: return 3;
    }
  };

  const getGridCells = (layout: string) => {
    switch (layout) {
      case "2x2": return 4;
      case "3x3": return 9;
      case "4x4": return 16;
      default: return 9;
    }
  };

  const gridCells = getGridCells(gridLayout);
  const emptyCells = Math.max(0, gridCells - cameras.length);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={cameras.map(c => c.id)} strategy={rectSortingStrategy}>
        <div className={`grid camera-grid-${gridLayout} gap-4`} data-testid="camera-grid">
          {cameras.map((camera) => (
            <CameraTile
              key={camera.id}
              camera={camera}
              onCameraUpdate={onCameraUpdate}
            />
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: emptyCells }, (_, index) => (
            <div
              key={`empty-${index}`}
              className="bg-card/50 rounded-lg border-2 border-dashed border-border flex items-center justify-center aspect-video hover:bg-card/70 transition-colors cursor-pointer group"
              data-testid={`empty-slot-${index}`}
            >
              <div className="text-center">
                <Plus className="h-8 w-8 text-muted-foreground group-hover:text-foreground mb-2 mx-auto" />
                <p className="text-sm text-muted-foreground group-hover:text-foreground">Add Camera</p>
              </div>
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
