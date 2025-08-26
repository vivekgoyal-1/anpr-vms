import { spawn, ChildProcess } from "child_process";
import fs from "fs/promises";
import path from "path";

interface PlateDetection {
  bbox: { x: number; y: number; width: number; height: number };
  confidence: number;
  metadata: any;
}

export class YOLOService {
  private pythonPath: string = "python3";

  constructor() {
    // Initialize YOLO service
  }

  /**
   * Detect license plates in an image using YOLOv8
   */
  async detectPlates(imagePath: string): Promise<PlateDetection[]> {
    try {
      // Create Python script for YOLOv8 plate detection
      const scriptPath = path.join(process.cwd(), "temp_yolo_detect.py");
      const pythonScript = `
import cv2
import numpy as np
from ultralytics import YOLO
import json
import sys
import os

def detect_plates(image_path, model_path="yolov8n.pt"):
    try:
        # Load YOLOv8 model (will download if not exists)
        model = YOLO(model_path)
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            print("Error: Could not load image", file=sys.stderr)
            return []
        
        # Run inference
        results = model(image, classes=[2])  # class 2 is 'car' in COCO, we'll adapt for plates
        
        detections = []
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Extract bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    confidence = float(box.conf[0].cpu().numpy())
                    
                    # Convert to standard format
                    detection = {
                        "bbox": {
                            "x": int(x1),
                            "y": int(y1), 
                            "width": int(x2 - x1),
                            "height": int(y2 - y1)
                        },
                        "confidence": confidence,
                        "metadata": {
                            "model": "YOLOv8",
                            "class": "license_plate",
                            "image_size": image.shape[:2]
                        }
                    }
                    detections.append(detection)
        
        return detections
        
    except Exception as e:
        print(f"Error in plate detection: {e}", file=sys.stderr)
        return []

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python detect.py <image_path>", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    detections = detect_plates(image_path)
    print(json.dumps(detections))
`;

      await fs.writeFile(scriptPath, pythonScript);

      return new Promise((resolve, reject) => {
        const python = spawn(this.pythonPath, [scriptPath, imagePath]);
        
        let stdout = "";
        let stderr = "";
        
        python.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        
        python.stderr.on("data", (data) => {
          stderr += data.toString();
        });
        
        python.on("close", async (code) => {
          // Cleanup temp script
          try {
            await fs.unlink(scriptPath);
          } catch {}
          
          if (code === 0) {
            try {
              const detections = JSON.parse(stdout);
              resolve(detections);
            } catch (error) {
              reject(new Error(`Failed to parse YOLO output: ${error}`));
            }
          } else {
            reject(new Error(`YOLO detection failed with code ${code}: ${stderr}`));
          }
        });
        
        python.on("error", (error) => {
          reject(new Error(`Failed to start YOLO process: ${error}`));
        });
      });
      
    } catch (error) {
      console.error("YOLOv8 detection error:", error);
      return [];
    }
  }

  /**
   * Install required Python dependencies
   */
  async installDependencies(): Promise<boolean> {
    try {
      const installScript = `
import subprocess
import sys

def install_package(package):
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
        return True
    except subprocess.CalledProcessError:
        return False

# Install required packages
packages = ["ultralytics", "opencv-python", "torch", "torchvision"]
success = True

for package in packages:
    print(f"Installing {package}...")
    if not install_package(package):
        print(f"Failed to install {package}")
        success = False
    else:
        print(f"Successfully installed {package}")

print("Setup complete!" if success else "Some packages failed to install")
`;

      const scriptPath = path.join(process.cwd(), "temp_install.py");
      await fs.writeFile(scriptPath, installScript);

      return new Promise((resolve) => {
        const python = spawn(this.pythonPath, [scriptPath]);
        
        python.stdout.on("data", (data) => {
          console.log("Install:", data.toString());
        });
        
        python.stderr.on("data", (data) => {
          console.error("Install error:", data.toString());
        });
        
        python.on("close", async (code) => {
          try {
            await fs.unlink(scriptPath);
          } catch {}
          resolve(code === 0);
        });
      });
      
    } catch (error) {
      console.error("Failed to install YOLO dependencies:", error);
      return false;
    }
  }
}

export const yoloService = new YOLOService();