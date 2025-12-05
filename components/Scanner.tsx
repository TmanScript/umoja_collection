import React, { useState, useEffect, useRef } from 'react';
import { Button } from './Button';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface ScannerProps {
  onScan: (value: string) => void;
  label?: string;
  placeholder?: string;
}

export const Scanner: React.FC<ScannerProps> = ({ onScan, label = "Scan Device ID", placeholder = "Click to focus & scan..." }) => {
  const [inputValue, setInputValue] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Unique ID for this scanner instance to support multiple on one page
  const scannerId = useRef(`scanner-${Math.random().toString(36).substr(2, 9)}`).current;
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onScan(inputValue.trim());
      setInputValue('');
    }
  };

  // Real Camera Handling with Html5Qrcode
  useEffect(() => {
    if (isCameraOpen) {
      setPermissionError(null);
      
      // Delay slightly to ensure DOM element exists
      const timer = setTimeout(() => {
        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0
        };
        
        // Support typical formats for Routers (Code 128) and others
        const formats = [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.UPC_A
        ];

        // Start scanning
        html5QrCode.start(
          { facingMode: "environment" }, 
          config,
          (decodedText) => {
            // Success callback
            console.log("Scanned:", decodedText);
            onScan(decodedText);
            // Stop scanning and close camera automatically on success
            html5QrCode.stop().then(() => {
                html5QrCode.clear();
                setIsCameraOpen(false);
            }).catch(err => console.error("Failed to stop scanner", err));
          },
          (errorMessage) => {
            // parse error, ignore to avoid console spam
          }
        ).catch(err => {
          console.error("Error starting scanner", err);
          setPermissionError("Could not access camera. Please ensure permissions are granted.");
        });
      }, 100);

      return () => clearTimeout(timer);
    } else {
      // Cleanup if closed manually
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
        scannerRef.current = null;
      }
    }

    // Unmount cleanup
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => scannerRef.current?.clear()).catch(console.error);
      }
    };
  }, [isCameraOpen, scannerId, onScan]);

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-end">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <button 
          onClick={() => setIsCameraOpen(!isCameraOpen)}
          type="button"
          className="text-sm text-cyan-600 hover:text-cyan-800 font-medium transition-colors"
        >
          {isCameraOpen ? "Close Camera" : "Use Camera"}
        </button>
      </div>

      {isCameraOpen ? (
        <div className="relative bg-black rounded-lg overflow-hidden shadow-lg" style={{ minHeight: '300px' }}>
          {/* The div where html5-qrcode renders the video */}
          <div id={scannerId} className="w-full h-full"></div>
          
          {/* Custom Overlay for Visual Guide */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-64 h-48 border-2 border-cyan-400/80 rounded-lg relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-cyan-400 -mt-1 -ml-1"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-cyan-400 -mt-1 -mr-1"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-cyan-400 -mb-1 -ml-1"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-cyan-400 -mb-1 -mr-1"></div>
                
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/50"></div>
            </div>
          </div>

          {permissionError && (
             <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white p-6 text-center">
                <p>{permissionError}</p>
             </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors shadow-sm outline-none"
              placeholder={placeholder}
            />
          </div>
          <Button type="submit" disabled={!inputValue} className="h-full">
            Enter
          </Button>
        </form>
      )}
      <p className="text-xs text-gray-500 flex items-center gap-1">
        <span className="inline-block w-4 h-4 bg-gray-100 border rounded text-center leading-none font-mono">↵</span>
        Press Enter or use a handheld scanner
      </p>
    </div>
  );
};