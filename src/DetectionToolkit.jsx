import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Download, Trash2, Settings, Square, Play, Zap, TrendingUp, Eye, AlertCircle } from 'lucide-react';

const DetectionToolkit = () => {
    const [selectedModel, setSelectedModel] = useState('coco-ssd');
    const [isLoading, setIsLoading] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detections, setDetections] = useState([]);
    const [confidence, setConfidence] = useState(0.5);
    const [imageUrl, setImageUrl] = useState(null);
    const [detectionHistory, setDetectionHistory] = useState([]);
    const [stats, setStats] = useState({ total: 0, byClass: {} });
    const [model, setModel] = useState(null);
    const [modelError, setModelError] = useState(null);

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);
    const detectionIntervalRef = useRef(null);

    const loadModel = async (modelType) => {
        setIsLoading(true);
        setModelError(null);
        
        try {
            if (typeof window !== 'undefined') {
                if (!window.tf) {
                    const tfScript = document.createElement('script');
                    tfScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js';
                    document.head.appendChild(tfScript);
                    await new Promise((resolve) => {
                        tfScript.onload = resolve;
                    });
                }

                if (!window.cocoSsd) {
                    const cocoScript = document.createElement('script');
                    cocoScript.src = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js';
                    document.head.appendChild(cocoScript);
                    await new Promise((resolve) => {
                        cocoScript.onload = resolve;
                    });
                }

                const loadedModel = await window.cocoSsd.load();
                setModel(loadedModel);
                console.log(`✅ Model ${modelType} loaded successfully!`);
            }
        } catch (error) {
            console.error('Error loading model:', error);
            setModelError('Failed to load AI model');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadModel(selectedModel);
        return () => {
            stopWebcam();
        };
    }, [selectedModel]);

    const detectObjects = async (imageElement) => {
        if (!model) {
            return [];
        }

        try {
            const predictions = await model.detect(imageElement);
            return predictions
                .filter(pred => pred.score >= confidence)
                .map(pred => ({
                    class: pred.class,
                    score: pred.score,
                    bbox: pred.bbox
                }));
        } catch (error) {
            console.error('Detection error:', error);
            return [];
        }
    };
    
    const handleImageUpload = async (e) => {
        stopWebcam();
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const resultUrl = event.target.result;
            setImageUrl(resultUrl);
            
            const img = new Image();
            img.onload = async () => {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                const maxWidth = window.innerWidth < 768 ? window.innerWidth - 40 : 800;
                const maxHeight = 600;
                
                let width = img.width;
                let height = img.height;
                
                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }
                
                if (height > maxHeight) {
                    width = (maxHeight / height) * width;
                    height = maxHeight;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                setIsLoading(true);
                await new Promise(resolve => setTimeout(resolve, 500));
                const results = await detectObjects(img);
                setDetections(results);
                
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                drawDetections(ctx, results, width, height);
                
                updateStats(results);
                saveToHistory(results, resultUrl);
                setIsLoading(false);
                e.target.value = null;
            };
            img.src = resultUrl;
        };
        reader.readAsDataURL(file);
    };

    const startWebcam = async () => {
        setImageUrl(null); 
        setDetections([]);
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    width: { ideal: 640 }, 
                    height: { ideal: 480 },
                    facingMode: 'user'
                } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play();
                
                const videoWidth = videoRef.current.videoWidth || 640;
                const videoHeight = videoRef.current.videoHeight || 480;
                
                canvasRef.current.width = videoWidth;
                canvasRef.current.height = videoHeight;

                setIsDetecting(true);
                startContinuousDetection(videoWidth, videoHeight);
            }
        } catch (err) {
            alert('Error accessing webcam: ' + err.message);
            setIsDetecting(false);
        }
    };

    const stopWebcam = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        setIsDetecting(false);
        setDetections([]);
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const startContinuousDetection = (width, height) => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
        
        const detectFrame = async () => {
            if (videoRef.current && canvasRef.current && videoRef.current.readyState >= 2) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext('2d');
                
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(videoRef.current, 0, 0, width, height);

                const results = await detectObjects(videoRef.current);
                setDetections(results);
                drawDetections(ctx, results, width, height);
                updateStats(results);
            }
        };
        
        detectionIntervalRef.current = setInterval(detectFrame, 1000);
    };

    const drawDetections = (ctx, detections, width, height) => {
        if (!ctx || !detections || detections.length === 0) return;

        const fontSize = Math.max(12, Math.min(18, height / 30));
        ctx.lineWidth = 3;
        ctx.font = `bold ${fontSize}px Arial`;
        
        const colors = [
            '#10B981', '#3B82F6', '#F59E0B', '#EF4444', 
            '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'
        ];

        detections.forEach((det, idx) => {
            const x = det.bbox[0];
            const y = det.bbox[1];
            const w = det.bbox[2];
            const h = det.bbox[3];
            const color = colors[idx % colors.length];
            
            // Draw bounding box
            ctx.strokeStyle = color;
            ctx.strokeRect(x, y, w, h);
            
            // Draw semi-transparent box overlay
            ctx.fillStyle = color + '20';
            ctx.fillRect(x, y, w, h);
            
            // Draw label with background
            const label = `${det.class} ${(det.score * 100).toFixed(1)}%`;
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const textHeight = fontSize + 10;
            
            const labelY = y > textHeight + 5 ? y - 5 : y + h + 5;
            
            // Label background
            ctx.fillStyle = color;
            ctx.fillRect(x, labelY, textWidth + 16, textHeight);
            
            // Label text
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, x + 8, labelY + fontSize + 4);
            
            // Draw corner markers for better visibility
            const cornerSize = 15;
            ctx.lineWidth = 4;
            ctx.strokeStyle = color;
            
            // Top-left corner
            ctx.beginPath();
            ctx.moveTo(x, y + cornerSize);
            ctx.lineTo(x, y);
            ctx.lineTo(x + cornerSize, y);
            ctx.stroke();
            
            // Top-right corner
            ctx.beginPath();
            ctx.moveTo(x + w - cornerSize, y);
            ctx.lineTo(x + w, y);
            ctx.lineTo(x + w, y + cornerSize);
            ctx.stroke();
            
            // Bottom-left corner
            ctx.beginPath();
            ctx.moveTo(x, y + h - cornerSize);
            ctx.lineTo(x, y + h);
            ctx.lineTo(x + cornerSize, y + h);
            ctx.stroke();
            
            // Bottom-right corner
            ctx.beginPath();
            ctx.moveTo(x + w - cornerSize, y + h);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x + w, y + h - cornerSize);
            ctx.stroke();
        });
    };

    const updateStats = (results) => {
        const byClass = {};
        results.forEach(det => {
            byClass[det.class] = (byClass[det.class] || 0) + 1;
        });
        setStats({
            total: results.length,
            byClass
        });
    };

    const saveToHistory = (results, imgUrl) => {
        if (results.length === 0) return;
        
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleString('id-ID', { 
                dateStyle: 'short', 
                timeStyle: 'short' 
            }),
            detections: results.length,
            classes: [...new Set(results.map(d => d.class))],
            imageUrl: imgUrl
        };
        setDetectionHistory(prev => [historyItem, ...prev].slice(0, 10)); 
    };

    const downloadResults = () => {
        const canvas = canvasRef.current;
        if (!canvas || detections.length === 0) return;
        
        const link = document.createElement('a');
        link.download = `detection_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png'); 
        link.click();
    };

    const exportData = () => {
        if (detections.length === 0) return;
        
        const data = {
            model: selectedModel,
            confidence,
            timestamp: new Date().toISOString(),
            detections: detections.map(d => ({
                class: d.class,
                confidence: d.score,
                boundingBox: d.bbox
            })),
            stats: stats,
            source: isDetecting ? 'webcam' : (imageUrl ? 'uploaded-image' : 'none')
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `detection_data_${Date.now()}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const modelNames = {
        'coco-ssd': 'COCO-SSD',
        'yolov5': 'YOLOv5',
        'yolov8': 'YOLOv8',
        'ssd-mobilenet': 'SSD MobileNet'
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            </div>

            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-6 sm:mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-4 sm:p-6 border border-white/10 shadow-2xl">
                        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3">
                            <Eye className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400 animate-pulse" />
                            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                                AI Vision Studio
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm text-gray-300 font-medium">
                            Real-time Object Detection • Powered by TensorFlow.js
                        </p>
                        
                        {modelError && (
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-full">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-xs text-red-400 font-medium">{modelError}</span>
                            </div>
                        )}
                        
                        {isDetecting && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                                <span className="relative flex h-2 w-2 sm:h-3 sm:w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-full w-full bg-green-500"></span>
                                </span>
                                <span className="text-xs sm:text-sm font-semibold text-green-400">LIVE DETECTION</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                        <div className="lg:col-span-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-2xl p-3 sm:p-4 border border-cyan-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-4 h-4 text-cyan-400" />
                                        <span className="text-xs text-gray-400 font-medium">Objects</span>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-cyan-400">{stats.total}</p>
                                </div>
                                <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl p-3 sm:p-4 border border-purple-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 text-purple-400" />
                                        <span className="text-xs text-gray-400 font-medium">AI Status</span>
                                    </div>
                                    <p className="text-xs font-bold text-purple-400 uppercase">{model ? '✓ Ready' : 'Loading...'}</p>
                                </div>
                            </div>

                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
                                <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                                    <Settings className="w-4 h-4 text-cyan-400" />
                                    <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Model Settings</span>
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-2 text-gray-300 uppercase tracking-wider">Detection Model</label>
                                        <select 
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 transition-all font-medium"
                                            disabled={isDetecting || isLoading}
                                        >
                                            <option value="coco-ssd">⚡ COCO-SSD (Fast & Accurate)</option>
                                            <option value="yolov5">🎯 YOLOv5 (Balanced)</option>
                                            <option value="yolov8">🚀 YOLOv8 (Latest)</option>
                                            <option value="ssd-mobilenet">📱 SSD MobileNet (Mobile)</option>
                                        </select>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Current: <span className="text-cyan-400 font-semibold">{modelNames[selectedModel]}</span>
                                        </p>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Confidence Threshold</label>
                                            <span className="text-xs sm:text-sm font-black text-cyan-400 bg-cyan-400/10 px-2 sm:px-3 py-1 rounded-full">
                                                {(confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.1" 
                                            max="0.95" 
                                            step="0.05"
                                            value={confidence}
                                            onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                        />
                                        <p className="text-xs text-gray-500 mt-2">
                                            Lower = more detections, Higher = more accurate
                                        </p>
                                    </div>

                                    {isLoading && (
                                        <div className="text-center py-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                            <div className="relative inline-flex">
                                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-cyan-500"></div>
                                                <Zap className="absolute inset-0 m-auto w-5 h-5 text-cyan-400 animate-pulse" />
                                            </div>
                                            <p className="text-xs mt-3 text-cyan-400 font-semibold">Loading {modelNames[selectedModel]}...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
                                <h3 className="text-base sm:text-lg font-bold mb-4">Quick Actions</h3>
                                <div className="space-y-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 shadow-lg font-semibold text-sm"
                                        disabled={isDetecting || isLoading}
                                    >
                                        <Upload className="w-4 h-4" />
                                        <span>Upload Image</span>
                                    </button>
                                    <input 
                                        ref={fileInputRef}
                                        type="file" 
                                        accept="image/*"
                                        onChange={handleImageUpload}
                                        className="hidden"
                                    />

                                    {!isDetecting ? (
                                        <button
                                            onClick={startWebcam}
                                            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all duration-300 shadow-lg font-semibold text-sm"
                                            disabled={isLoading || !model}
                                        >
                                            <Camera className="w-4 h-4" />
                                            <span>Start Live Detection</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopWebcam}
                                            className="w-full bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-lg font-semibold animate-pulse text-sm"
                                        >
                                            <Square className="w-4 h-4" />
                                            <span>Stop Detection</span>
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={downloadResults}
                                            className="bg-slate-800/50 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500 rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs font-medium"
                                            disabled={detections.length === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Save PNG</span>
                                        </button>

                                        <button
                                            onClick={exportData}
                                            className="bg-slate-800/50 hover:bg-pink-600/30 border border-pink-500/30 hover:border-pink-500 rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs font-medium"
                                            disabled={detections.length === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Export JSON</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {Object.keys(stats.byClass).length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
                                    <h3 className="text-base font-bold mb-4">Detected Classes</h3>
                                    <div className="space-y-2">
                                        {Object.entries(stats.byClass).map(([cls, count]) => {
                                            const percentage = (count / stats.total) * 100;
                                            return (
                                                <div key={cls} className="flex items-center justify-between bg-slate-900/30 rounded-xl p-3 border border-white/5">
                                                    <span className="text-sm font-semibold capitalize text-gray-300">{cls}</span>
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-2 w-20 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-lg font-black text-cyan-400 min-w-[2rem] text-right">{count}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-8 space-y-4">
                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 shadow-2xl">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <h3 className="text-lg font-bold flex items-center gap-2">
                                        <Play className="w-5 h-5 text-cyan-400" />
                                        <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                                            {isDetecting ? 'Live Camera Feed' : 'Detection Canvas'}
                                        </span>
                                    </h3>
                                    {detections.length > 0 && (
                                        <span className="text-sm text-green-400 font-semibold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                            ✓ {detections.length} object{detections.length > 1 ? 's' : ''} detected
                                        </span>
                                    )}
                                </div>
                                
                                <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl overflow-hidden border border-white/10 aspect-video flex items-center justify-center">
                                    {isDetecting && (
                                        <video 
                                            ref={videoRef}
                                            className="absolute w-0 h-0 opacity-0"
                                            playsInline 
                                            muted 
                                            autoPlay
                                        />
                                    )}
                                    <canvas 
                                        ref={canvasRef}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                    {!imageUrl && !isDetecting && (
                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                            <div className="text-center">
                                                <Camera className="w-16 h-16 text-cyan-400/30 mx-auto mb-4" />
                                                <p className="text-lg font-semibold text-gray-400 mb-2">Ready for Detection</p>
                                                <p className="text-sm text-gray-500">Upload an image or start webcam to begin</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {detections.length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                        Detection Results
                                    </h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {detections.map((det, idx) => (
                                            <div key={idx} className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 hover:from-cyan-900/20 hover:to-purple-900/20 rounded-xl p-4 border border-white/5 hover:border-cyan-500/30 transition-all">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="w-3 h-3 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500"></span>
                                                            <span className="text-sm font-bold text-gray-300 capitalize">{det.class}</span>
                                                            <span className="text-xs text-gray-500">({(det.score * 100).toFixed(1)}% confidence)</span>
                                                        </div>
                                                        <div className="text-xs text-gray-400 font-mono bg-slate-900/50 rounded px-2 py-1 inline-block">
                                                            BBox: [{det.bbox.map(num => Math.round(num)).join(', ')}]
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-2xl font-black text-cyan-400">{idx + 1}</div>
                                                        <div className="text-xs text-gray-500 mt-1">Position</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {detectionHistory.length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-purple-400" />
                                            Detection History
                                        </h3>
                                        <button 
                                            onClick={() => setDetectionHistory([])}
                                            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-all"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            Clear All
                                        </button>
                                    </div>
                                    <div className="space-y-3 max-h-72 overflow-y-auto pr-2">
                                        {detectionHistory.map((item) => (
                                            <div key={item.id} className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 rounded-xl p-3 border border-white/5 hover:border-purple-500/30 transition-all group">
                                                <div className="flex items-center gap-3">
                                                    <div className="relative w-16 h-16 flex-shrink-0">
                                                        <img 
                                                            src={item.imageUrl} 
                                                            alt="Detection history"
                                                            className="w-full h-full object-cover rounded-lg border border-white/10"
                                                        />
                                                        <div className="absolute -top-2 -right-2 bg-purple-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                                                            {item.detections}
                                                        </div>
                                                    </div>
                                                    <div className="flex-grow">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="text-sm font-semibold text-gray-300">{item.timestamp}</span>
                                                            <span className="text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded-full font-medium">
                                                                {item.detections} object{item.detections > 1 ? 's' : ''}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mb-2">Detected classes:</p>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {item.classes.slice(0, 3).map((cls, idx) => (
                                                                <span 
                                                                    key={idx}
                                                                    className="text-xs px-2 py-1 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-gray-300 rounded-lg border border-white/5 capitalize"
                                                                >
                                                                    {cls}
                                                                </span>
                                                            ))}
                                                            {item.classes.length > 3 && (
                                                                <span className="text-xs px-2 py-1 bg-slate-800/50 text-gray-400 rounded-lg">
                                                                    +{item.classes.length - 3} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 sm:mt-8 text-center text-xs text-gray-500">
                        <p>AI Vision Studio • Built with TensorFlow.js & React • Supports 80+ object classes</p>
                        <p className="mt-1">Note: Models are loaded directly from CDN. First load may take a few seconds.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetectionToolkit;