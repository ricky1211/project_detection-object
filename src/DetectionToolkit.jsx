// DetectionToolkit.jsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download, Users, Zap, User, Image as ImageIcon, Settings, Globe, Cpu } from 'lucide-react';

const DetectionToolkit = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('upload');
  const [predictions, setPredictions] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [profilePhotos, setProfilePhotos] = useState([
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108755-2616b786d4d1?w-400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop'
  ]);
  const [profileName, setProfileName] = useState('Neural Vision Developer');
  const [profileBio, setProfileBio] = useState('AI Engineer specializing in computer vision and real-time detection systems');

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const profileInputRef = useRef([]);
  const animationRef = useRef(null);

  // Load COCO-SSD Model dengan optimasi
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Pre-warm TensorFlow.js
        await tf.ready();
        
        if (!window.cocoSsd) {
          // Load model dengan timeout
          await Promise.race([
            new Promise(resolve => setTimeout(resolve, 3000)),
            new Promise(resolve => {
              const checkModel = setInterval(() => {
                if (window.cocoSsd) {
                  clearInterval(checkModel);
                  resolve();
                }
              }, 100);
            })
          ]);
        }
        
        const loadedModel = await window.cocoSsd.load({
          base: 'mobilenet_v2',
          modelUrl: 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/model.json'
        });
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        console.error('Model loading error:', err);
        setError("AI Engine failed to initialize. Please refresh the page.");
        setLoading(false);
      }
    };
    
    loadModel();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  // Optimasi kamera dengan requestAnimationFrame
  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const constraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        // Tunggu video siap
        videoRef.current.onloadedmetadata = () => {
          setCameraLoading(false);
          setMode('camera');
          
          // Start real-time detection
          if (model) {
            detectContinuously();
          }
        };
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError("Camera access denied or not available.");
      setCameraLoading(false);
    }
  };

  const detectContinuously = useCallback(() => {
    if (!model || !videoRef.current || mode !== 'camera') return;
    
    const detectFrame = async () => {
      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        try {
          const preds = await model.detect(videoRef.current);
          setPredictions(preds);
          drawPredictions(preds, videoRef.current);
          analyzeResults(preds);
        } catch (err) {
          console.error('Detection error:', err);
        }
      }
      
      if (mode === 'camera') {
        animationRef.current = requestAnimationFrame(detectFrame);
      }
    };
    
    detectFrame();
  }, [model, mode]);

  const stopCamera = () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    setStream(null);
    setMode('upload');
    setPredictions([]);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageSrc(ev.target.result);
        setPredictions([]);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const detect = async (source) => {
    if (!model || !source) return;
    setDetecting(true);
    try {
      const preds = await model.detect(source);
      setPredictions(preds);
      drawPredictions(preds, source);
      analyzeResults(preds);
    } catch (err) {
      setError("Detection process failed.");
    }
    setDetecting(false);
  };

  const drawPredictions = (preds, source) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = source.videoWidth || source.width;
    const height = source.videoHeight || source.height;
    
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // Efek glow pada bounding box
    preds.forEach(pred => {
      const [x, y, w, h] = pred.bbox;
      const scorePercentage = Math.round(pred.score * 100);
      
      // Glow effect
      ctx.shadowColor = '#00ff41';
      ctx.shadowBlur = 15;
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      // Reset shadow
      ctx.shadowBlur = 0;
      
      // Label dengan background
      const label = `${pred.class.toUpperCase()} ${scorePercentage}%`;
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      const textWidth = ctx.measureText(label).width;
      
      // Background untuk label
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(x, y - 25, textWidth + 20, 25);
      
      // Text label
      ctx.fillStyle = '#00ff41';
      ctx.fillText(label, x + 10, y - 8);
    });
  };

  const analyzeResults = (preds) => {
    const counts = preds.reduce((acc, curr) => {
      acc[curr.class] = (acc[curr.class] || 0) + 1;
      return acc;
    }, {});
    
    setAnalysis({
      total: preds.length,
      counts,
      avgConfidence: preds.length ? 
        (preds.reduce((a, b) => a + b.score, 0) / preds.length * 100).toFixed(1) : 0,
      timestamp: new Date().toLocaleTimeString()
    });
  };

  const handleProfilePhotoChange = (index, file) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const newPhotos = [...profilePhotos];
        newPhotos[index] = e.target.result;
        setProfilePhotos(newPhotos);
      };
      reader.readAsDataURL(file);
    }
  };

  // Update useEffect untuk real-time detection
  useEffect(() => {
    if (mode === 'camera' && model && !detecting) {
      detectContinuously();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mode, model, detectContinuously]);

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-500/10 via-transparent to-transparent"></div>
      <div className="relative z-10 text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-400"></div>
        <h2 className="mt-6 text-2xl font-bold text-green-400 font-mono animate-pulse">
          [INITIALIZING NEURAL NETWORK...]
        </h2>
        <p className="mt-2 text-green-300/60">Loading AI Vision Engine</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4 md:p-6 font-sans relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgdmlld0JveD0iMCAwIDYwIDYwIj48ZyBmaWxsPSJub25lIiBzdHJva2U9IiMwMGZmNDEiIHN0cm9rZS13aWR0aD0iMC4xIj48cGF0aCBkPSJNMCw2MEw2MCwwTTYwLDYwTDAsMCIvPjxwYXRoIGQ9Ik0zMCw2MFYwTTYwLDMwSDAiLz48L2c+PC9zdmc+')] opacity-20"></div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
      
      {/* Scanlines Effect */}
      <div className="fixed inset-0 pointer-events-none" style={{
        background: 'repeating-linear-gradient(0deg, rgba(0, 255, 65, 0.03) 0px, transparent 1px, transparent 2px)'
      }}></div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <header className="mb-8 md:mb-12 text-center">
          <div className="inline-block relative">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold bg-gradient-to-r from-green-400 via-cyan-400 to-pink-400 bg-clip-text text-transparent font-mono tracking-tighter">
              NEURAL.VISION.AI
            </h1>
            <div className="h-1 w-3/4 mx-auto mt-2 bg-gradient-to-r from-transparent via-green-400 to-transparent"></div>
          </div>
          <p className="mt-4 text-green-300 font-mono text-sm md:text-base">
            &gt; REAL-TIME OBJECT DETECTION ENGINE [STATUS: <span className="text-green-400">ACTIVE</span>]
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Main Detection Area */}
          <div className="lg:col-span-2">
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-green-500/30 rounded-xl p-4 md:p-6 shadow-2xl shadow-green-500/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-cyan-300 flex items-center gap-2">
                  <Cpu className="w-5 h-5" />
                  VISION PROCESSOR
                </h2>
                <div className="flex gap-2">
                  <div className={`px-3 py-1 rounded-full text-xs font-bold ${mode === 'camera' ? 'bg-green-500/20 text-green-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {mode === 'camera' ? 'LIVE MODE' : 'IMAGE MODE'}
                  </div>
                  <div className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-400">
                    COCO-SSD
                  </div>
                </div>
              </div>

              <div className="relative border-2 border-green-500/30 rounded-lg overflow-hidden bg-black">
                {mode === 'camera' ? (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-auto max-h-[500px] object-contain"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : imageSrc ? (
                  <img 
                    ref={imageRef}
                    src={imageSrc} 
                    alt="Preview" 
                    className="w-full h-auto max-h-[500px] object-contain"
                    onLoad={() => detect(imageRef.current)}
                  />
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-green-300/50">
                    <Upload className="w-12 h-12 mb-4" />
                    <p className="text-lg font-mono">UPLOAD OR CAPTURE IMAGE</p>
                    <p className="text-sm mt-2">Supported formats: JPG, PNG, WebP</p>
                  </div>
                )}
                
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                />
                
                {/* Detection Overlay */}
                {predictions.length > 0 && (
                  <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm px-3 py-2 rounded-lg border border-green-500/50">
                    <div className="text-green-400 text-sm font-mono">
                      {predictions.length} OBJECTS DETECTED
                    </div>
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[200px] bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/30 text-green-300 px-6 py-3 rounded-lg font-bold hover:from-green-500/20 hover:to-cyan-500/20 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <Upload className="w-5 h-5" />
                  UPLOAD IMAGE
                </button>
                
                <button
                  onClick={stream ? stopCamera : startCamera}
                  className={`flex-1 min-w-[200px] px-6 py-3 rounded-lg font-bold transition-all duration-300 flex items-center justify-center gap-3 ${
                    stream 
                      ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 text-red-300 hover:from-red-500/20 hover:to-pink-500/20' 
                      : 'bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 text-cyan-300 hover:from-cyan-500/20 hover:to-blue-500/20'
                  }`}
                >
                  <Camera className="w-5 h-5" />
                  {cameraLoading ? 'INITIALIZING...' : stream ? 'STOP CAMERA' : 'START CAMERA'}
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  hidden 
                  accept="image/*" 
                />
              </div>
            </div>

            {/* Analytics Panel */}
            <div className="mt-6 bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-cyan-500/30 rounded-xl p-6 shadow-2xl shadow-cyan-500/10">
              <h3 className="text-xl font-bold text-cyan-300 mb-4 flex items-center gap-2">
                <ZoomIn className="w-5 h-5" />
                REAL-TIME ANALYTICS
              </h3>
              
              {analysis ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-black/50 p-4 rounded-lg border border-green-500/20">
                    <div className="text-3xl font-bold text-green-400">{analysis.total}</div>
                    <div className="text-sm text-green-300/70">TOTAL OBJECTS</div>
                  </div>
                  
                  <div className="bg-black/50 p-4 rounded-lg border border-cyan-500/20">
                    <div className="text-3xl font-bold text-cyan-400">{analysis.avgConfidence}%</div>
                    <div className="text-sm text-cyan-300/70">AVG CONFIDENCE</div>
                  </div>
                  
                  <div className="bg-black/50 p-4 rounded-lg border border-purple-500/20">
                    <div className="text-3xl font-bold text-purple-400">{Object.keys(analysis.counts).length}</div>
                    <div className="text-sm text-purple-300/70">UNIQUE CLASSES</div>
                  </div>
                  
                  {/* Class Distribution */}
                  <div className="md:col-span-3 mt-4">
                    <h4 className="text-lg font-bold text-white mb-3">CLASS DISTRIBUTION</h4>
                    <div className="space-y-2">
                      {Object.entries(analysis.counts).map(([className, count]) => (
                        <div key={className} className="flex items-center justify-between">
                          <span className="text-sm font-mono text-gray-300">{className.toUpperCase()}</span>
                          <div className="flex items-center gap-3">
                            <div className="w-32 h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-green-400 to-cyan-400 rounded-full"
                                style={{ width: `${(count / analysis.total) * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-green-400 font-bold">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 text-lg">NO DATA AVAILABLE</div>
                  <p className="text-gray-600 text-sm mt-2">Upload an image or start camera to begin analysis</p>
                </div>
              )}
            </div>
          </div>

          {/* Profile Section */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-gray-900/80 to-black/80 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6 shadow-2xl shadow-purple-500/10 h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-purple-300 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  DEVELOPER PROFILE
                </h2>
                <Globe className="w-5 h-5 text-purple-400" />
              </div>

              {/* Profile Header */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-purple-500 mx-auto mb-4">
                    <img 
                      src={profilePhotos[0]} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <button 
                    onClick={() => profileInputRef.current[0]?.click()}
                    className="absolute bottom-0 right-0 bg-purple-600 p-2 rounded-full hover:bg-purple-700 transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <input 
                    type="file" 
                    ref={el => profileInputRef.current[0] = el}
                    onChange={(e) => handleProfilePhotoChange(0, e.target.files[0])}
                    hidden 
                    accept="image/*"
                  />
                </div>
                
                <h3 className="text-xl font-bold text-white">{profileName}</h3>
                <p className="text-gray-400 text-sm mt-1">Lead AI Engineer</p>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">ONLINE</span>
                  <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold">ACTIVE</span>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-6">
                <p className="text-gray-300 text-sm leading-relaxed">
                  {profileBio}
                </p>
              </div>

              {/* Photo Gallery */}
              <div>
                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  PHOTO GALLERY
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {profilePhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border border-purple-500/30">
                        <img 
                          src={photo} 
                          alt={`Gallery ${index + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <button 
                        onClick={() => profileInputRef.current[index + 1]?.click()}
                        className="absolute top-2 right-2 bg-black/50 backdrop-blur-sm p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Settings className="w-3 h-3" />
                      </button>
                      <input 
                        type="file" 
                        ref={el => profileInputRef.current[index + 1] = el}
                        onChange={(e) => handleProfilePhotoChange(index, e.target.files[0])}
                        hidden 
                        accept="image/*"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="mt-6 pt-6 border-t border-gray-800">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-cyan-400">1.2K</div>
                    <div className="text-xs text-gray-400">Detections Today</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">98.7%</div>
                    <div className="text-xs text-gray-400">Accuracy</div>
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="mt-6">
                <button className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/30 text-purple-300 py-2 rounded-lg hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300">
                  Contact Developer
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-6 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <div className="text-sm font-mono text-green-400">
                CORE_ENGINE: TENSORFLOW_JS v4.11.0
              </div>
              <div className="text-xs text-gray-500">
                MODEL: COCO-SSD v2.2.3 | FPS: 30 | RESOLUTION: 720p
              </div>
            </div>
            <div className="flex items-center gap-4 mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-400">SYSTEM ACTIVE</span>
              </div>
              <div className="text-xs text-gray-500">
                © 2024 Neural Vision AI. All rights reserved.
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-500/20 backdrop-blur-sm border border-red-500/30 text-red-300 px-4 py-3 rounded-lg animate-in slide-in-from-right">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DetectionToolkit;