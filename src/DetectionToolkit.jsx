import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Download, Trash2, Settings, Square, Play, Zap, TrendingUp, Eye } from 'lucide-react';

const DetectionToolkit = () => {
    const [selectedModel, setSelectedModel] = useState('coco-ssd');
    const [isLoading, setIsLoading] = useState(false);
    const [isDetecting, setIsDetecting] = useState(false);
    const [detections, setDetections] = useState([]);
    const [confidence, setConfidence] = useState(0.5);
    const [imageUrl, setImageUrl] = useState(null);
    const [detectionHistory, setDetectionHistory] = useState([]);
    const [stats, setStats] = useState({ total: 0, byClass: {} });

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const fileInputRef = useRef(null);
    const streamRef = useRef(null);
    const detectionIntervalRef = useRef(null);

    const loadModel = async (modelType) => {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log(`Model ${modelType} loaded.`);
        setIsLoading(false);
    };

    useEffect(() => {
        loadModel(selectedModel);
        return () => {
            stopWebcam();
        };
    }, [selectedModel]);

    const detectObjects = async (imageElement) => {
        const mockDetections = [
            { class: 'person', score: 0.92, bbox: [100, 50, 200, 300] },
            { class: 'car', score: 0.87, bbox: [300, 150, 180, 120] },
            { class: 'dog', score: 0.78, bbox: [50, 200, 150, 180] }
        ].filter(d => d.score >= confidence);

        return mockDetections;
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
                
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                setIsLoading(true);
                const results = await detectObjects(img);
                setDetections(results);
                drawDetections(ctx, results, img.width, img.height);
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
                video: { width: { ideal: 640 }, height: { ideal: 480 } } 
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    if (videoRef.current) {
                        const videoWidth = videoRef.current.videoWidth || 640;
                        const videoHeight = videoRef.current.videoHeight || 480;
                        canvasRef.current.width = videoWidth;
                        canvasRef.current.height = videoHeight;

                        videoRef.current.play();
                        setIsDetecting(true);
                        startContinuousDetection(videoWidth, videoHeight);
                    }
                };
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
        if (canvasRef.current) {
             const ctx = canvasRef.current.getContext('2d');
             ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const startContinuousDetection = (width, height) => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }
        
        detectionIntervalRef.current = setInterval(async () => {
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
        }, 100);
    };

    const drawDetections = (ctx, detections, width, height) => {
        const fontSize = Math.max(12, Math.min(18, height / 30)); 
        ctx.strokeStyle = '#10B981';
        ctx.lineWidth = 3;
        ctx.font = `bold ${fontSize}px Arial`;
        
        detections.forEach(det => {
            const [x, y, w, h] = det.bbox;
            
            ctx.strokeRect(x, y, w, h);
            
            const label = `${det.class} ${(det.score * 100).toFixed(1)}%`;
            const textWidth = ctx.measureText(label).width;
            const textHeight = fontSize + 8;
            
            ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
            ctx.fillRect(x, y > textHeight ? y - textHeight : y, textWidth + 16, textHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, x + 8, y > textHeight ? y - 8 : y + textHeight - 8);
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
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toLocaleString(),
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
            detections: detections,
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

    const displayStyle = imageUrl || isDetecting ? {} : { 
        width: '100%', height: '100%' 
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
            {/* Animated Background Effect */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-700"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header with glassmorphism */}
                    <div className="text-center mb-6 sm:mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl">
                        <div className="flex items-center justify-center gap-3 mb-3">
                            <div className="relative">
                                <Eye className="w-10 h-10 sm:w-12 sm:h-12 text-cyan-400 animate-pulse" />
                                <div className="absolute inset-0 bg-cyan-400 blur-xl opacity-50 animate-pulse"></div>
                            </div>
                            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 animate-gradient">
                                AI Vision Studio
                            </h1>
                        </div>
                        <p className="text-sm sm:text-base text-gray-300 font-medium">Real-time Object Detection • YOLO & SSD Powered</p>
                        {isDetecting && (
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-green-500/20 border border-green-500/30 rounded-full">
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                </span>
                                <span className="text-sm font-semibold text-green-400">LIVE DETECTION</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                        {/* Left Panel - Controls */}
                        <div className="lg:col-span-4 space-y-4">
                            {/* Quick Stats Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="backdrop-blur-xl bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 rounded-2xl p-4 border border-cyan-500/20 shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <TrendingUp className="w-5 h-5 text-cyan-400" />
                                        <span className="text-xs text-gray-400 font-medium">Total Objects</span>
                                    </div>
                                    <p className="text-3xl font-black text-cyan-400">{stats.total}</p>
                                </div>
                                <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl p-4 border border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-5 h-5 text-purple-400" />
                                        <span className="text-xs text-gray-400 font-medium">Model</span>
                                    </div>
                                    <p className="text-sm font-bold text-purple-400 uppercase tracking-wider">{selectedModel.split('-')[0]}</p>
                                </div>
                            </div>

                            {/* Model Selection Card */}
                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
                                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                    <Settings className="w-5 h-5 text-cyan-400" />
                                    <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Model Settings</span>
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold mb-2 text-gray-300 uppercase tracking-wider">AI Model</label>
                                        <select 
                                            value={selectedModel}
                                            onChange={(e) => setSelectedModel(e.target.value)}
                                            className="w-full bg-slate-900/50 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent disabled:opacity-50 transition-all font-medium text-sm"
                                            disabled={isDetecting || isLoading}
                                        >
                                            <option value="coco-ssd">⚡ COCO-SSD (Fast)</option>
                                            <option value="yolov5">🎯 YOLOv5 (Accurate)</option>
                                            <option value="yolov8">🚀 YOLOv8 (Latest)</option>
                                            <option value="ssd-mobilenet">📱 SSD MobileNet</option>
                                        </select>
                                    </div>

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Confidence</label>
                                            <span className="text-sm font-black text-cyan-400 bg-cyan-400/10 px-3 py-1 rounded-full">{(confidence * 100).toFixed(0)}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.1" 
                                            max="1" 
                                            step="0.05"
                                            value={confidence}
                                            onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                            style={{
                                                background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${confidence * 100}%, #1e293b ${confidence * 100}%, #1e293b 100%)`
                                            }}
                                        />
                                    </div>

                                    {isLoading && (
                                        <div className="text-center py-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                            <div className="relative inline-flex">
                                                <div className="animate-spin rounded-full h-10 w-10 border-4 border-slate-800 border-t-cyan-500"></div>
                                                <Zap className="absolute inset-0 m-auto w-5 h-5 text-cyan-400 animate-pulse" />
                                            </div>
                                            <p className="text-sm mt-3 text-cyan-400 font-semibold">Loading AI Model...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10 shadow-xl">
                                <h3 className="text-lg font-bold mb-4 text-gray-200">Quick Actions</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="group relative overflow-hidden bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-cyan-500/50 font-semibold"
                                        disabled={isDetecting || isLoading}
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                        <Upload className="w-5 h-5 relative z-10" />
                                        <span className="relative z-10">Upload Image</span>
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
                                            className="group relative overflow-hidden bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-green-500/50 font-semibold"
                                            disabled={isLoading}
                                        >
                                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                            <Camera className="w-5 h-5 relative z-10" />
                                            <span className="relative z-10">Start Webcam</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopWebcam}
                                            className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl px-4 py-3.5 flex items-center justify-center gap-2 transition-all duration-300 shadow-lg hover:shadow-red-500/50 font-semibold animate-pulse"
                                        >
                                            <Square className="w-5 h-5 relative z-10" />
                                            <span className="relative z-10">Stop Detection</span>
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={downloadResults}
                                            className="bg-slate-800/50 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 text-sm font-medium"
                                            disabled={detections.length === 0 && !imageUrl}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden sm:inline">Image</span>
                                        </button>

                                        <button
                                            onClick={exportData}
                                            className="bg-slate-800/50 hover:bg-pink-600/30 border border-pink-500/30 hover:border-pink-500 rounded-xl px-3 py-2.5 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 text-sm font-medium"
                                            disabled={detections.length === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span className="hidden sm:inline">JSON</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Class Statistics */}
                            {Object.keys(stats.byClass).length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10 shadow-xl">
                                    <h3 className="text-lg font-bold mb-4 text-gray-200">Detected Classes</h3>
                                    <div className="space-y-3">
                                        {Object.entries(stats.byClass).map(([cls, count]) => (
                                            <div key={cls} className="flex items-center justify-between bg-slate-900/30 rounded-xl p-3 border border-white/5 hover:border-cyan-500/30 transition-all">
                                                <span className="text-sm font-semibold capitalize text-gray-300">{cls}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-2 w-24 bg-slate-800 rounded-full overflow-hidden">
                                                        <div 
                                                            className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                                                            style={{ width: `${(count / stats.total) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-lg font-black text-cyan-400 min-w-[2rem] text-right">{count}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Center/Right Panel - Detection View */}
                        <div className="lg:col-span-8 space-y-4">
                            {/* Main Detection Canvas */}
                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 shadow-2xl">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                        <Play className="w-5 h-5 text-cyan-400" />
                                        <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Live Detection View</span>
                                    </h3>
                                </div>
                                <div 
                                    className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 shadow-inner"
                                    style={{ minHeight: '300px', aspectRatio: '16/9' }}
                                >
                                    {isDetecting && (
                                        <video 
                                            ref={videoRef}
                                            className="absolute top-0 left-0"
                                            style={{ visibility: 'hidden', width: '100%', height: '100%', objectFit: 'contain' }}
                                            playsInline 
                                            muted 
                                        />
                                    )}
                                    <canvas 
                                        ref={canvasRef}
                                        className="w-full h-full object-contain rounded-xl"
                                        style={displayStyle}
                                    />
                                    {!imageUrl && !isDetecting && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="text-center">
                                                <div className="relative inline-block mb-6">
                                                    <Camera className="w-16 h-16 sm:w-20 sm:h-20 text-cyan-400/30" />
                                                    <div className="absolute inset-0 bg-cyan-400/20 blur-2xl"></div>
                                                </div>
                                                <p className="text-base sm:text-lg font-semibold text-gray-400 mb-2">No Active Detection</p>
                                                <p className="text-xs sm:text-sm text-gray-500">Upload an image or start webcam to begin</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Detection Results */}
                            {detections.length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl">
                                    <h3 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5 text-green-400" />
                                        Detection Results
                                    </h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                        {detections.map((det, idx) => (
                                            <div key={idx} className="group bg-gradient-to-r from-slate-900/50 to-slate-800/50 hover:from-cyan-900/20 hover:to-purple-900/20 rounded-xl p-3 sm:p-4 border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <span className="capitalize font-bold text-base sm:text-lg text-cyan-400 flex items-center gap-2">
                                                        <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                                                        {det.class}
                                                    </span>
                                                    <div className="flex items-center gap-3 sm:gap-4">
                                                        <div className="flex-1 sm:flex-none">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-xs font-medium text-gray-400">Confidence:</span>
                                                                <span className="text-sm font-black text-green-400">{(det.score * 100).toFixed(1)}%</span>
                                                            </div>
                                                            <div className="w-full sm:w-32 bg-slate-800 rounded-full h-2 overflow-hidden">
                                                                <div 
                                                                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500 shadow-lg shadow-green-500/50"
                                                                    style={{ width: `${det.score * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Detection History */}
                            {detectionHistory.length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                        <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                            <TrendingUp className="w-5 h-5 text-purple-400" />
                                            Detection History
                                        </h3>
                                        <button
                                            onClick={() => setDetectionHistory([])}
                                            className="text-red-400 hover:text-red-300 flex items-center gap-2 text-sm font-semibold bg-red-500/10 hover:bg-red-500/20 px-4 py-2 rounded-xl border border-red-500/20 hover:border-red-500/40 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            Clear History
                                        </button>
                                    </div>
                                    <div className="space-y-2 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                        {detectionHistory.map((item) => (
                                            <div key={item.id} className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 hover:from-purple-900/20 hover:to-pink-900/20 rounded-xl p-4 border border-white/5 hover:border-purple-500/30 transition-all duration-300">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400 mb-2 font-medium">{item.timestamp}</p>
                                                        <p className="font-semibold text-white mb-1">
                                                            <span className="text-cyan-400 font-black text-lg">{item.detections}</span> objects detected
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {item.classes.map((cls, i) => (
                                                                <span key={i} className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-1 rounded-lg border border-purple-500/20">
                                                                    {cls}
                                                                </span>
                                                            ))}
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
                </div>
            </div>

            {/* Custom Scrollbar Styles */}
            <style>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(15, 23, 42, 0.5);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(6, 182, 212, 0.3);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(6, 182, 212, 0.5);
                }
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    background-size: 200% 200%;
                    animation: gradient 3s ease infinite;
                }
            `}</style>
        </div>
    );
};

export default DetectionToolkit;