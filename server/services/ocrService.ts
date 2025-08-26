import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";

export class OCRService {
  private pythonPath: string = "python3";

  constructor() {
    // Initialize OCR service
  }

  /**
   * Extract text from a license plate region using EasyOCR
   */
  async extractText(imagePath: string, bbox?: { x: number; y: number; width: number; height: number }): Promise<string | null> {
    try {
      // Create Python script for EasyOCR text extraction
      const scriptPath = path.join(process.cwd(), "temp_ocr_extract.py");
      const pythonScript = `
import easyocr
import cv2
import numpy as np
import json
import sys
import re

def extract_plate_text(image_path, bbox=None):
    try:
        # Initialize EasyOCR reader
        reader = easyocr.Reader(['en'], gpu=False)
        
        # Read image
        image = cv2.imread(image_path)
        if image is None:
            print("Error: Could not load image", file=sys.stderr)
            return None
        
        # Crop to bounding box if provided
        if bbox:
            x, y, w, h = bbox['x'], bbox['y'], bbox['width'], bbox['height']
            image = image[y:y+h, x:x+w]
        
        # Preprocess image for better OCR
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply adaptive thresholding
        binary = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
        
        # Run OCR
        results = reader.readtext(binary)
        
        # Extract text with confidence filtering
        extracted_texts = []
        for (bbox, text, confidence) in results:
            if confidence > 0.5:  # Filter low confidence detections
                # Clean text: remove special characters, keep only alphanumeric
                cleaned_text = re.sub(r'[^A-Za-z0-9]', '', text.upper())
                if len(cleaned_text) >= 3:  # Minimum length for plate numbers
                    extracted_texts.append({
                        "text": cleaned_text,
                        "confidence": confidence
                    })
        
        # Return best result
        if extracted_texts:
            best_result = max(extracted_texts, key=lambda x: x["confidence"])
            return best_result["text"]
        
        return None
        
    except Exception as e:
        print(f"Error in OCR extraction: {e}", file=sys.stderr)
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python ocr.py <image_path> [bbox_json]", file=sys.stderr)
        sys.exit(1)
    
    image_path = sys.argv[1]
    bbox = None
    
    if len(sys.argv) > 2:
        try:
            bbox = json.loads(sys.argv[2])
        except:
            pass
    
    result = extract_plate_text(image_path, bbox)
    if result:
        print(result)
    else:
        print("NO_TEXT_DETECTED")
`;

      await fs.writeFile(scriptPath, pythonScript);

      return new Promise((resolve, reject) => {
        const args = [scriptPath, imagePath];
        if (bbox) {
          args.push(JSON.stringify(bbox));
        }
        
        const python = spawn(this.pythonPath, args);
        
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
            const result = stdout.trim();
            resolve(result === "NO_TEXT_DETECTED" ? null : result);
          } else {
            reject(new Error(`OCR extraction failed with code ${code}: ${stderr}`));
          }
        });
        
        python.on("error", (error) => {
          reject(new Error(`Failed to start OCR process: ${error}`));
        });
      });
      
    } catch (error) {
      console.error("EasyOCR extraction error:", error);
      return null;
    }
  }

  /**
   * Install required Python dependencies for OCR
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
packages = ["easyocr", "opencv-python", "pillow"]
success = True

for package in packages:
    print(f"Installing {package}...")
    if not install_package(package):
        print(f"Failed to install {package}")
        success = False
    else:
        print(f"Successfully installed {package}")

print("OCR setup complete!" if success else "Some OCR packages failed to install")
`;

      const scriptPath = path.join(process.cwd(), "temp_ocr_install.py");
      await fs.writeFile(scriptPath, installScript);

      return new Promise((resolve) => {
        const python = spawn(this.pythonPath, [scriptPath]);
        
        python.stdout.on("data", (data) => {
          console.log("OCR Install:", data.toString());
        });
        
        python.stderr.on("data", (data) => {
          console.error("OCR Install error:", data.toString());
        });
        
        python.on("close", async (code) => {
          try {
            await fs.unlink(scriptPath);
          } catch {}
          resolve(code === 0);
        });
      });
      
    } catch (error) {
      console.error("Failed to install OCR dependencies:", error);
      return false;
    }
  }


}

export const ocrService = new OCRService();