// app/page.js or pages/index.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  Video, 
  FileJson, 
  Download, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  Play,
  Pause,
  Settings,
  BarChart3
} from 'lucide-react';

export default function VideoToJsonConverter() {
  const [videoFile, setVideoFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [jsonData, setJsonData] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [videoUrl, setVideoUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [extractedFrames, setExtractedFrames] = useState([]);
  const [videoDuration, setVideoDuration] = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const [extractionQuality, setExtractionQuality] = useState('medium');
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Quality settings for frame extraction
  const qualitySettings = {
    low: { interval: 1.0, maxFrames: 30 },
    medium: { interval: 0.5, maxFrames: 60 },
    high: { interval: 0.25, maxFrames: 120 }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setJsonData(null);
      setIsComplete(false);
      setExtractedFrames([]);
      setFrameCount(0);
      setVideoDuration(0);
      setProgress(0);
      
      // Create video URL for preview
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
    } else {
      alert('Please upload a valid video file (MP4, WebM, etc.)');
    }
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setJsonData(null);
      setIsComplete(false);
      setExtractedFrames([]);
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const extractVideoData = async () => {
    if (!videoFile || !videoRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setStatus('Loading video...');

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Load video
      await new Promise((resolve) => {
        video.onloadedmetadata = () => {
          setVideoDuration(video.duration);
          resolve();
        };
        video.src = videoUrl;
        video.load();
      });

      // Get quality settings
      const settings = qualitySettings[extractionQuality];
      const interval = settings.interval;
      const maxFrames = settings.maxFrames;
      
      setStatus('Extracting frames...');

      // Calculate total frames to extract
      const totalFrames = Math.min(
        Math.floor(video.duration / interval),
        maxFrames
      );
      
      setFrameCount(totalFrames);
      let frames = [];
      let frameIndex = 0;

      // Set canvas size
      const maxWidth = 320;
      const maxHeight = 240;
      canvas.width = maxWidth;
      canvas.height = maxHeight;

      for (let time = 0; time < video.duration && frameIndex < totalFrames; time += interval) {
        video.currentTime = time;
        await new Promise((resolve) => {
          video.onseeked = () => {
            // Draw frame to canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            // Extract frame data
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixelData = Array.from(imageData.data);
            
            // Compress pixel data (reduce size)
            const compressedPixels = compressPixelData(pixelData);
            
            frames.push({
              timestamp: parseFloat(time.toFixed(2)),
              width: canvas.width,
              height: canvas.height,
              pixels: compressedPixels,
              frameIndex: frameIndex
            });
            
            frameIndex++;
            const progressPercent = (frameIndex / totalFrames) * 100;
            setProgress(Math.min(progressPercent, 99));
            setStatus(`Extracting frames... ${Math.round(progressPercent)}%`);
            
            resolve();
          };
        });
      }

      setStatus('Processing metadata...');
      setProgress(95);

      // Build the complete JSON structure
      const result = {
        metadata: {
          fileName: videoFile.name,
          fileSize: videoFile.size,
          fileType: videoFile.type,
          duration: video.duration,
          width: video.videoWidth,
          height: video.videoHeight,
          frameRate: 30, // Approximate
          totalFrames: frames.length,
          extractionQuality: extractionQuality,
          extractionDate: new Date().toISOString(),
        },
        frames: frames,
        summary: {
          totalFrames: frames.length,
          avgFrameSize: frames.length > 0 ? 
            Math.round(frames.reduce((acc, f) => acc + f.pixels.length, 0) / frames.length) : 0,
          durationSeconds: video.duration,
        }
      };

      setJsonData(result);
      setExtractedFrames(frames);
      setProgress(100);
      setStatus('Complete!');
      setIsComplete(true);
      
    } catch (error) {
      console.error('Error processing video:', error);
      setStatus('Error processing video');
      alert('An error occurred while processing the video. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Compress pixel data to reduce JSON size
  const compressPixelData = (pixelData) => {
    // Sample every 4th pixel (reduce resolution by 4x)
    const compressed = [];
    const step = 4;
    for (let i = 0; i < pixelData.length; i += step) {
      compressed.push(pixelData[i]);
      compressed.push(pixelData[i+1]);
      compressed.push(pixelData[i+2]);
      compressed.push(pixelData[i+3]);
    }
    return compressed;
  };

  const downloadJson = () => {
    if (!jsonData) return;
    
    const jsonString = JSON.stringify(jsonData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${videoFile.name.split('.')[0]}_converted.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const resetAll = () => {
    setVideoFile(null);
    setVideoUrl(null);
    setJsonData(null);
    setIsComplete(false);
    setExtractedFrames([]);
    setProgress(0);
    setStatus('');
    setFrameCount(0);
    setVideoDuration(0);
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = '';
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4 md:p-8">
      {/* Hidden canvas for frame extraction */}
      <canvas ref={canvasRef} className="hidden" />
      
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            Video to JSON Converter
          </h1>
          <p className="text-purple-200 text-lg">
            Extract video frames and metadata into structured JSON format
          </p>
        </motion.div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Upload & Controls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            {!videoFile ? (
              // Upload Area
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-3 border-dashed border-purple-300/50 rounded-xl p-8 text-center hover:border-purple-400 transition-all duration-300 min-h-[400px] flex flex-col items-center justify-center cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-24 h-24 bg-purple-500/20 rounded-full flex items-center justify-center mb-4">
                  <Upload className="w-12 h-12 text-purple-300" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Upload Video File
                </h3>
                <p className="text-purple-200 mb-4">
                  Drag & drop your MP4 video here or click to browse
                </p>
                <p className="text-purple-300/70 text-sm">
                  Supports MP4, WebM, AVI, and other common formats
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              // Video Preview & Controls
              <div className="space-y-4">
                <div className="relative rounded-xl overflow-hidden bg-black/50">
                  <video
                    ref={videoRef}
                    className="w-full max-h-[300px] object-contain"
                    playsInline
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={() => setIsPlaying(false)}
                  />
                  
                  {/* Video Controls Overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={togglePlay}
                        className="text-white hover:text-purple-300 transition-colors"
                      >
                        {isPlaying ? 
                          <Pause className="w-5 h-5" /> : 
                          <Play className="w-5 h-5" />
                        }
                      </button>
                      <div className="flex-1">
                        <div className="h-1 bg-white/20 rounded-full">
                          <div 
                            className="h-full bg-purple-400 rounded-full transition-all duration-300"
                            style={{ 
                              width: videoRef.current ? 
                                `${(videoRef.current.currentTime / videoDuration) * 100}%` : 
                                '0%'
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-white text-xs">
                        {videoDuration ? `${Math.round(videoDuration)}s` : '0s'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* File Info */}
                <div className="flex items-center justify-between text-white/80 text-sm p-3 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4" />
                    <span>{videoFile.name}</span>
                  </div>
                  <span>{formatFileSize(videoFile.size)}</span>
                </div>

                {/* Quality Selection */}
                <div className="flex items-center gap-3">
                  <Settings className="w-4 h-4 text-purple-300" />
                  <span className="text-white/70 text-sm">Extraction Quality:</span>
                  <div className="flex gap-2">
                    {['low', 'medium', 'high'].map((q) => (
                      <button
                        key={q}
                        onClick={() => setExtractionQuality(q)}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                          extractionQuality === q
                            ? 'bg-purple-500 text-white'
                            : 'bg-white/10 text-white/60 hover:bg-white/20'
                        }`}
                      >
                        {q.charAt(0).toUpperCase() + q.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={extractVideoData}
                    disabled={isProcessing || isComplete}
                    className={`flex-1 py-3 rounded-xl font-semibold transition-all ${
                      isProcessing || isComplete
                        ? 'bg-gray-600/50 cursor-not-allowed text-gray-400'
                        : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:shadow-lg hover:shadow-purple-500/30 transform hover:scale-105'
                    }`}
                  >
                    {isProcessing ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Processing...
                      </span>
                    ) : isComplete ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        Completed
                      </span>
                    ) : (
                      'Convert to JSON'
                    )}
                  </button>
                  
                  <button
                    onClick={resetAll}
                    className="px-4 py-3 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 transition-all"
                  >
                    Reset
                  </button>
                </div>

                {/* Progress Bar */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-white/70">
                      <span>{status}</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${progress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileJson className="w-5 h-5 text-purple-300" />
              JSON Output
            </h2>

            {!isComplete ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center text-white/40">
                <BarChart3 className="w-16 h-16 mb-4 opacity-30" />
                <p>Upload a video and click</p>
                <p className="text-sm">"Convert to JSON" to see results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-300">
                      {jsonData?.metadata.totalFrames || 0}
                    </div>
                    <div className="text-xs text-white/50">Frames</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-300">
                      {jsonData?.metadata.duration ? 
                        `${Math.round(jsonData.metadata.duration)}s` : 
                        '0s'
                      }
                    </div>
                    <div className="text-xs text-white/50">Duration</div>
                  </div>
                  <div className="bg-white/5 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-purple-300">
                      {jsonData?.summary?.avgFrameSize || 0}
                    </div>
                    <div className="text-xs text-white/50">Avg Frame Size</div>
                  </div>
                </div>

                {/* JSON Preview */}
                <div className="bg-black/30 rounded-xl p-4 max-h-[300px] overflow-auto">
                  <pre className="text-xs text-green-300 font-mono whitespace-pre-wrap">
                    {jsonData ? JSON.stringify(jsonData, null, 2).slice(0, 1000) + 
                      (JSON.stringify(jsonData, null, 2).length > 1000 ? '\n... (truncated)' : '') 
                      : 'No data'}
                  </pre>
                </div>

                {/* Download Button */}
                <button
                  onClick={downloadJson}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold hover:shadow-lg hover:shadow-green-500/30 transform hover:scale-105 transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download JSON File
                </button>
              </div>
            )}
          </motion.div>
        </div>

        {/* Frame Preview (if available) */}
        {extractedFrames.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              Extracted Frames Preview
            </h3>
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 max-h-[200px] overflow-y-auto">
              {extractedFrames.slice(0, 20).map((frame, index) => (
                <div
                  key={index}
                  className="aspect-square bg-black/50 rounded-lg flex items-center justify-center border border-white/10"
                >
                  <div className="text-center">
                    <div className="text-xs text-purple-300 font-mono">
                      #{frame.frameIndex}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {frame.timestamp}s
                    </div>
                  </div>
                </div>
              ))}
              {extractedFrames.length > 20 && (
                <div className="aspect-square bg-purple-500/20 rounded-lg flex items-center justify-center text-white/50 text-xs">
                  +{extractedFrames.length - 20} more
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}