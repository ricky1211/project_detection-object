import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Download, Trash2, Settings, Square } from 'lucide-react';

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
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 3;
        ctx.font = `${fontSize}px Arial`;
        
        detections.forEach(det => {
            const [x, y, w, h] = det.bbox;
            
            ctx.strokeRect(x, y, w, h);
            
            const label = `${det.class} ${(det.score * 100).toFixed(1)}%`;
            const textWidth = ctx.measureText(label).width;
            const textHeight = fontSize + 4;
            
            ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
            ctx.fillRect(x, y > textHeight ? y - textHeight : y, textWidth + 10, textHeight);
            
            ctx.fillStyle = '#000000';
            ctx.fillText(label, x + 5, y > textHeight ? y - 5 : y + textHeight - 5);
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
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-green-400">
                        Object Detection Toolkit 🤖
                    </h1>
                    <p className="text-gray-400">Simulasi Deteksi Objek Real-time (YOLO & SSD)</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Panel - Controls */}
                    <div className="lg:col-span-1 space-y-4">
                        {/* Model Selection */}
                        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-blue-400" />
                                Model Configuration
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">Select Model</label>
                                    <select 
                                        value={selectedModel}
                                        onChange={(e) => setSelectedModel(e.target.value)}
                                        className="w-full bg-gray-700 rounded px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        disabled={isDetecting || isLoading}
                                    >
                                        <option value="coco-ssd">COCO-SSD (Fast)</option>
                                        <option value="yolov5">YOLOv5 (Accurate - Mock)</option>
                                        <option value="yolov8">YOLOv8 (Latest - Mock)</option>
                                        <option value="ssd-mobilenet">SSD MobileNet (Mock)</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        Confidence Threshold: <span className="font-bold text-green-400">{confidence.toFixed(2)}</span>
                                    </label>
                                    <input 
                                        type="range" 
                                        min="0.1" 
                                        max="1" 
                                        step="0.05"
                                        value={confidence}
                                        onChange={(e) => setConfidence(parseFloat(e.target.value))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer range-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                {isLoading && (
                                    <div className="text-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                                        <p className="text-sm mt-2 text-blue-400">Loading model...</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4">Actions</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full bg-blue-600 hover:bg-blue-700 rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
                                    disabled={isDetecting || isLoading}
                                >
                                    <Upload className="w-5 h-5" />
                                    Upload Image
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
                                        className="w-full bg-green-600 hover:bg-green-700 rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
                                        disabled={isLoading}
                                    >
                                        <Camera className="w-5 h-5" />
                                        Start Webcam
                                    </button>
                                ) : (
                                    <button
                                        onClick={stopWebcam}
                                        className="w-full bg-red-600 hover:bg-red-700 rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition"
                                    >
                                        <Square className="w-5 h-5" />
                                        Stop Webcam
                                    </button>
                                )}

                                <button
                                    onClick={downloadResults}
                                    className="w-full bg-purple-600 hover:bg-purple-700 rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
                                    disabled={detections.length === 0 && !imageUrl}
                                >
                                    <Download className="w-5 h-5" />
                                    Download Annotated Image
                                </button>

                                <button
                                    onClick={exportData}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 rounded-lg px-4 py-3 flex items-center justify-center gap-2 transition disabled:opacity-50"
                                    disabled={detections.length === 0}
                                >
                                    <Download className="w-5 h-5" />
                                    Export Detection Data (JSON)
                                </button>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4">Statistics</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center pb-2 border-b border-gray-700">
                                    <span className="text-gray-400">Total Objects Detected:</span>
                                    <span className="text-3xl font-extrabold text-blue-400">{stats.total}</span>
                                </div>
                                {Object.entries(stats.byClass).map(([cls, count]) => (
                                    <div key={cls} className="flex justify-between items-center">
                                        <span className="text-gray-400 capitalize">{cls}:</span>
                                        <span className="font-semibold text-green-400">{count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Center Panel - Detection View */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                            <h3 className="text-xl font-semibold mb-4">Detection View</h3>
                            <div 
                                className="relative bg-black rounded-lg overflow-hidden flex items-center justify-center" 
                                style={{ minHeight: '400px', aspectRatio: '4/3' }}
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
                                    className="w-full h-full object-contain"
                                    style={displayStyle}
                                />
                                {!imageUrl && !isDetecting && (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="text-center text-gray-500">
                                            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                            <p className="text-lg">Upload an image or start webcam to begin detection</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detection Results */}
                        {detections.length > 0 && (
                            <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                                <h3 className="text-xl font-semibold mb-4">Detection Results</h3>
                                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                                    {detections.map((det, idx) => (
                                        <div key={idx} className="bg-gray-700 rounded px-4 py-2 flex justify-between items-center border border-gray-600">
                                            <span className="capitalize font-medium text-lg text-blue-300">{det.class}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-gray-400">
                                                    Confidence: <span className="font-bold text-green-400">{(det.score * 100).toFixed(1)}%</span>
                                                </span>
                                                <div className="w-24 bg-gray-600 rounded-full h-2">
                                                    <div 
                                                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                                        style={{ width: `${det.score * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Detection History */}
                        {detectionHistory.length > 0 && (
                            <div className="bg-gray-800 rounded-lg p-6 shadow-xl border border-gray-700">
                                <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                                    <h3 className="text-xl font-semibold">Detection History (Last 10)</h3>
                                    <button
                                        onClick={() => setDetectionHistory([])}
                                        className="text-red-400 hover:text-red-300 flex items-center gap-1 transition"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Clear History
                                    </button>
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                    {detectionHistory.map((item) => (
                                        <div key={item.id} className="bg-gray-700 rounded px-4 py-3 border border-gray-600 hover:bg-gray-600 transition">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="text-sm text-gray-400">{item.timestamp}</p>
                                                    <p className="font-medium mt-1 text-white">
                                                        <span className="text-blue-300 font-bold">{item.detections}</span> objects detected
                                                    </p>
                                                    <p className="text-sm text-green-400 mt-1">
                                                        Classes: {item.classes.join(', ')}
                                                    </p>
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
    );
};

export default DetectionToolkit;