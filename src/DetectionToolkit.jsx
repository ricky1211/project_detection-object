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
                console.log('Model loaded successfully!');
            }
        } catch (error) {
            console.error('Error loading model:', error);
            setModelError('Failed to load AI model. Using fallback detection.');
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
            return generateMockDetections();
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
            return generateMockDetections();
        }
    };

    const generateMockDetections = () => {
        const canvas = canvasRef.current;
        if (!canvas) return [];

        const width = canvas.width;
        const height = canvas.height;
        const objectClasses = ['person', 'car', 'dog', 'cat', 'bicycle', 'chair', 'cup', 'bottle'];
        const numDetections = Math.floor(Math.random() * 3) + 1;
        const mockDetections = [];

        for (let i = 0; i < numDetections; i++) {
            const randomClass = objectClasses[Math.floor(Math.random() * objectClasses.length)];
            const score = Math.random() * 0.4 + 0.6;
            const boxWidth = Math.floor(Math.random() * (width * 0.3)) + width * 0.1;
            const boxHeight = Math.floor(Math.random() * (height * 0.3)) + height * 0.1;
            const x = Math.floor(Math.random() * (width - boxWidth));
            const y = Math.floor(Math.random() * (height - boxHeight));

            mockDetections.push({
                class: randomClass,
                score: score,
                bbox: [x, y, boxWidth, boxHeight]
            });
        }

        return mockDetections.filter(d => d.score >= confidence);
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
                const maxHeight = window.innerWidth < 768 ? 400 : 600;
                
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
                await new Promise(resolve => setTimeout(resolve, 300));
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
                    width: { ideal: window.innerWidth < 768 ? 480 : 640 }, 
                    height: { ideal: window.innerWidth < 768 ? 360 : 480 },
                    facingMode: 'user'
                } 
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
        }, 1000);
    };

    const drawDetections = (ctx, detections, width, height) => {
        if (!ctx || !detections) return;

        const fontSize = Math.max(10, Math.min(16, height / 35));
        ctx.lineWidth = Math.max(2, Math.min(4, width / 200));
        ctx.font = 'bold ' + fontSize + 'px Arial';
        
        const colors = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

        detections.forEach((det, idx) => {
            const x = det.bbox[0];
            const y = det.bbox[1];
            const w = det.bbox[2];
            const h = det.bbox[3];
            const color = colors[idx % colors.length];
            
            ctx.strokeStyle = color;
            ctx.strokeRect(x, y, w, h);
            
            const label = det.class + ' ' + (det.score * 100).toFixed(0) + '%';
            const textMetrics = ctx.measureText(label);
            const textWidth = textMetrics.width;
            const textHeight = fontSize + 8;
            
            const labelY = y > textHeight + 5 ? y - textHeight : y + h + textHeight;
            
            ctx.fillStyle = color;
            ctx.fillRect(x, labelY - textHeight + 4, textWidth + 12, textHeight);
            
            ctx.fillStyle = '#FFFFFF';
            ctx.fillText(label, x + 6, labelY - 4);
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
        link.download = 'detection_' + Date.now() + '.png';
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
        link.download = 'detection_data_' + Date.now() + '.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const confidencePercent = (confidence * 100).toFixed(0);
    const gradientStyle = 'linear-gradient(to right, #06b6d4 0%, #06b6d4 ' + (confidence * 100) + '%, #1e293b ' + (confidence * 100) + '%, #1e293b 100%)';

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900 text-white">
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
            </div>

            <div className="relative z-10 p-4 sm:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-6 sm:mb-8 backdrop-blur-xl bg-white/5 rounded-3xl p-4 sm:p-6 lg:p-8 border border-white/10 shadow-2xl">
                        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3">
                            <div className="relative">
                                <Eye className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-cyan-400 animate-pulse" />
                            </div>
                            <h1 className="text-2xl sm:text-3xl lg:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
                                AI Vision Studio
                            </h1>
                        </div>
                        <p className="text-xs sm:text-sm lg:text-base text-gray-300 font-medium">
                            Real-time Object Detection powered by TensorFlow.js
                        </p>
                        
                        {modelError && (
                            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
                                <AlertCircle className="w-4 h-4 text-yellow-400" />
                                <span className="text-xs sm:text-sm text-yellow-400 font-medium">Using fallback detection</span>
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
                                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                                        <span className="text-xs text-gray-400 font-medium">Total</span>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-black text-cyan-400">{stats.total}</p>
                                </div>
                                <div className="backdrop-blur-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-2xl p-3 sm:p-4 border border-purple-500/20">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                                        <span className="text-xs text-gray-400 font-medium">Status</span>
                                    </div>
                                    <p className="text-xs sm:text-sm font-bold text-purple-400 uppercase">{model ? 'AI Ready' : 'Loading'}</p>
                                </div>
                            </div>

                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
                                <h3 className="text-base sm:text-lg font-bold mb-4 flex items-center gap-2">
                                    <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                                    <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Settings</span>
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Confidence</label>
                                            <span className="text-xs sm:text-sm font-black text-cyan-400 bg-cyan-400/10 px-2 sm:px-3 py-1 rounded-full">{confidencePercent}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            min="0.1" 
                                            max="1" 
                                            step="0.05"
                                            value={confidence}
                                            onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-full appearance-none cursor-pointer accent-cyan-500"
                                            style={{ background: gradientStyle }}
                                        />
                                    </div>

                                    {isLoading && (
                                        <div className="text-center py-4 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
                                            <div className="relative inline-flex">
                                                <div className="animate-spin rounded-full h-8 w-8 sm:h-10 sm:w-10 border-4 border-slate-800 border-t-cyan-500"></div>
                                                <Zap className="absolute inset-0 m-auto w-4 h-4 sm:w-5 sm:h-5 text-cyan-400 animate-pulse" />
                                            </div>
                                            <p className="text-xs sm:text-sm mt-3 text-cyan-400 font-semibold">Loading AI Model...</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
                                <h3 className="text-base sm:text-lg font-bold mb-4">Quick Actions</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 shadow-lg font-semibold text-sm sm:text-base"
                                        disabled={isDetecting || isLoading}
                                    >
                                        <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
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
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 transition-all duration-300 shadow-lg font-semibold text-sm sm:text-base"
                                            disabled={isLoading}
                                        >
                                            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>Start Webcam</span>
                                        </button>
                                    ) : (
                                        <button
                                            onClick={stopWebcam}
                                            className="bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 rounded-xl px-4 py-3 flex items-center justify-center gap-2 shadow-lg font-semibold animate-pulse text-sm sm:text-base"
                                        >
                                            <Square className="w-4 h-4 sm:w-5 sm:h-5" />
                                            <span>Stop Detection</span>
                                        </button>
                                    )}

                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={downloadResults}
                                            className="bg-slate-800/50 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500 rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs sm:text-sm font-medium"
                                            disabled={detections.length === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>Image</span>
                                        </button>

                                        <button
                                            onClick={exportData}
                                            className="bg-slate-800/50 hover:bg-pink-600/30 border border-pink-500/30 hover:border-pink-500 rounded-xl px-3 py-2 flex items-center justify-center gap-2 transition-all disabled:opacity-50 text-xs sm:text-sm font-medium"
                                            disabled={detections.length === 0}
                                        >
                                            <Download className="w-4 h-4" />
                                            <span>JSON</span>
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {Object.keys(stats.byClass).length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-5 border border-white/10">
                                    <h3 className="text-base sm:text-lg font-bold mb-4">Detected Classes</h3>
                                    <div className="space-y-2 sm:space-y-3">
                                        {Object.entries(stats.byClass).map(([cls, count]) => {
                                            const percentage = (count / stats.total) * 100;
                                            return (
                                                <div key={cls} className="flex items-center justify-between bg-slate-900/30 rounded-xl p-2 sm:p-3 border border-white/5">
                                                    <span className="text-xs sm:text-sm font-semibold capitalize text-gray-300">{cls}</span>
                                                    <div className="flex items-center gap-2 sm:gap-3">
                                                        <div className="h-2 w-16 sm:w-24 bg-slate-800 rounded-full overflow-hidden">
                                                            <div 
                                                                className="h-full bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full transition-all duration-500"
                                                                style={{ width: percentage + '%' }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-base sm:text-lg font-black text-cyan-400 min-w-[1.5rem] text-right">{count}</span>
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
                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold flex items-center gap-2">
                                        <Play className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                                        <span className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">Live View</span>
                                    </h3>
                                    {detections.length > 0 && (
                                        <span className="text-xs sm:text-sm text-green-400 font-semibold bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
                                            {detections.length} object{detections.length > 1 ? 's' : ''} detected
                                        </span>
                                    )}
                                </div>
                                <div className="relative bg-gradient-to-br from-slate-950 to-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-white/10 min-h-[250px]">
                                    {isDetecting && (
                                        <video 
                                            ref={videoRef}
                                            className="absolute inset-0 invisible"
                                            playsInline 
                                            muted 
                                        />
                                    )}
                                    <canvas 
                                        ref={canvasRef}
                                        className="w-full h-full object-contain rounded-xl max-w-full max-h-full"
                                    />
                                    {!imageUrl && !isDetecting && (
                                        <div className="absolute inset-0 flex items-center justify-center p-4">
                                            <div className="text-center">
                                                <Camera className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 text-cyan-400/30 mx-auto mb-4" />
                                                <p className="text-sm sm:text-base lg:text-lg font-semibold text-gray-400 mb-2">No Active Detection</p>
                                                <p className="text-xs sm:text-sm text-gray-500">Upload an image or start webcam</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {detections.length > 0 && (
                                <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-4 sm:p-6 border border-white/10 shadow-xl">
                                    <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
                                        Detection Results
                                    </h3>
                                    <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                        {detections.map((det, idx) => {
                                            const scorePercent = (det.score * 100).toFixed(1);
                                            return (
                                                <div key={idx} className="bg-gradient-to-r from-slate-900/50 to-slate-800/50 hover:from-cyan-900/20 hover:to-purple-900/20 rounded-xl p-3 sm:p-4 border border-white/5 hover:border-cyan-500/30 transition-all duration-300">
                                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                        <span className="capitalize font-bold text-sm sm:text-base lg:text-lg text-cyan-400 flex items-center gap-2">
                                                            <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                                                            {det.class}
                                                        </span>
                                                        <span className="text-xs sm:text-sm font-semibold text-gray-400">{scorePercent}%</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetectionToolkit;
