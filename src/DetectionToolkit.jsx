import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle } from 'lucide-react';

const ObjectDetectionApp = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('upload'); // 'upload' or 'camera'
  const [predictions, setPredictions] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  // Load COCO-SSD model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        const cocoSsd = await window.cocoSsd.load();
        setModel(cocoSsd);
        setLoading(false);
      } catch (error) {
        console.error('Error loading model:', error);
        setLoading(false);
      }
    };
    
    if (window.cocoSsd) {
      loadModel();
    }
  }, []);

  // Start camera
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
      setPredictions([]);
      setAnalysis(null);
    } catch (error) {
      alert('Tidak dapat mengakses kamera: ' + error.message);
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setMode('upload');
  };

  // Detect from camera
  const detectFromCamera = async () => {
    if (!model || !videoRef.current) return;
    
    setDetecting(true);
    try {
      const predictions = await model.detect(videoRef.current);
      setPredictions(predictions);
      drawPredictions(predictions, videoRef.current);
      analyzeResults(predictions);
    } catch (error) {
      console.error('Detection error:', error);
    }
    setDetecting(false);
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        setPredictions([]);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  // Detect from image
  const detectFromImage = async () => {
    if (!model || !imageRef.current) return;
    
    setDetecting(true);
    try {
      const predictions = await model.detect(imageRef.current);
      setPredictions(predictions);
      drawPredictions(predictions, imageRef.current);
      analyzeResults(predictions);
    } catch (error) {
      console.error('Detection error:', error);
    }
    setDetecting(false);
  };

  // Draw bounding boxes
  const drawPredictions = (predictions, sourceElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = sourceElement.videoWidth || sourceElement.width;
    canvas.height = sourceElement.videoHeight || sourceElement.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);

    predictions.forEach(prediction => {
      const [x, y, width, height] = prediction.bbox;
      
      // Draw box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      ctx.fillStyle = '#00ff00';
      const text = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
      const textWidth = ctx.measureText(text).width;
      ctx.fillRect(x, y - 25, textWidth + 10, 25);
      
      // Draw label text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 16px Arial';
      ctx.fillText(text, x + 5, y - 7);
    });
  };

  // Analyze detection results
  const analyzeResults = (predictions) => {
    if (predictions.length === 0) {
      setAnalysis({
        total: 0,
        message: 'Tidak ada objek terdeteksi'
      });
      return;
    }

    const objectCounts = {};
    let totalConfidence = 0;
    let highestConfidence = { class: '', score: 0 };

    predictions.forEach(pred => {
      objectCounts[pred.class] = (objectCounts[pred.class] || 0) + 1;
      totalConfidence += pred.score;
      if (pred.score > highestConfidence.score) {
        highestConfidence = { class: pred.class, score: pred.score };
      }
    });

    const avgConfidence = (totalConfidence / predictions.length * 100).toFixed(1);

    setAnalysis({
      total: predictions.length,
      objectCounts,
      avgConfidence,
      highestConfidence,
      message: 'Deteksi berhasil!'
    });
  };

  // Reset
  const reset = () => {
    setPredictions([]);
    setAnalysis(null);
    setImageSrc(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Loading AI Model...</p>
          <p className="text-white/70 text-sm mt-2">Mohon tunggu sebentar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            🎯 AI Object Detection
          </h1>
          <p className="text-white/80 text-sm md:text-base">
            Deteksi objek secara real-time dengan teknologi AI
          </p>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-4 mb-6 justify-center">
          <button
            onClick={() => {
              stopCamera();
              setMode('upload');
              reset();
            }}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'upload'
                ? 'bg-white text-purple-900 shadow-lg scale-105'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Upload size={20} />
            <span className="hidden sm:inline">Upload Gambar</span>
          </button>
          <button
            onClick={stream ? stopCamera : startCamera}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
              mode === 'camera'
                ? 'bg-white text-purple-900 shadow-lg scale-105'
                : 'bg-white/20 text-white hover:bg-white/30'
            }`}
          >
            <Camera size={20} />
            <span className="hidden sm:inline">{stream ? 'Stop Kamera' : 'Gunakan Kamera'}</span>
          </button>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Detection Area */}
          <div className="lg:col-span-2">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
              <div className="relative bg-black/30 rounded-xl overflow-hidden mb-4" style={{ minHeight: '300px' }}>
                {mode === 'camera' ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-auto"
                  />
                ) : imageSrc ? (
                  <img
                    ref={imageRef}
                    src={imageSrc}
                    alt="Upload"
                    onLoad={detectFromImage}
                    className="w-full h-auto"
                  />
                ) : (
                  <div className="flex items-center justify-center h-64">
                    <div className="text-center text-white/50">
                      <Upload size={48} className="mx-auto mb-4" />
                      <p>Upload gambar atau gunakan kamera</p>
                    </div>
                  </div>
                )}
                <canvas
                  ref={canvasRef}
                  className="absolute top-0 left-0 w-full h-full"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 flex-wrap">
                {mode === 'upload' && (
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={() => fileInputRef.current.click()}
                      className="flex-1 min-w-[120px] bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all"
                    >
                      Pilih Gambar
                    </button>
                  </>
                )}
                {mode === 'camera' && (
                  <button
                    onClick={detectFromCamera}
                    disabled={detecting}
                    className="flex-1 min-w-[120px] bg-gradient-to-r from-green-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {detecting ? 'Mendeteksi...' : 'Deteksi Sekarang'}
                  </button>
                )}
                <button
                  onClick={reset}
                  className="bg-white/20 text-white px-6 py-3 rounded-xl font-semibold hover:bg-white/30 transition-all"
                >
                  <RotateCcw size={20} />
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <ZoomIn size={24} />
                Hasil Analisis
              </h2>

              {analysis ? (
                <div className="space-y-4">
                  <div className="bg-green-500/20 border-2 border-green-500 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-green-300 font-semibold mb-2">
                      <CheckCircle size={20} />
                      {analysis.message}
                    </div>
                    <p className="text-white text-3xl font-bold">{analysis.total} Objek</p>
                  </div>

                  <div className="bg-white/10 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3">📊 Detail Objek:</h3>
                    <div className="space-y-2">
                      {Object.entries(analysis.objectCounts).map(([obj, count]) => (
                        <div key={obj} className="flex justify-between items-center text-white">
                          <span className="capitalize">{obj}:</span>
                          <span className="font-bold bg-white/20 px-3 py-1 rounded-lg">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-white/10 rounded-xl p-4">
                    <h3 className="text-white font-semibold mb-3">📈 Statistik:</h3>
                    <div className="space-y-2 text-white">
                      <div className="flex justify-between">
                        <span>Rata-rata Akurasi:</span>
                        <span className="font-bold text-green-400">{analysis.avgConfidence}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Paling Yakin:</span>
                        <span className="font-bold capitalize">{analysis.highestConfidence.class}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tingkat Keyakinan:</span>
                        <span className="font-bold text-green-400">
                          {Math.round(analysis.highestConfidence.score * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-500/20 border border-blue-500 rounded-xl p-4">
                    <p className="text-blue-200 text-sm">
                      💡 <strong>Tips:</strong> Hasil terbaik didapat dengan pencahayaan yang baik dan objek yang jelas terlihat.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center text-white/50 py-8">
                  <AlertCircle size={48} className="mx-auto mb-4" />
                  <p>Belum ada hasil deteksi</p>
                  <p className="text-sm mt-2">Upload gambar atau gunakan kamera untuk mulai mendeteksi objek</p>
                </div>
              )}
            </div>

            {/* Object List */}
            {predictions.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 shadow-2xl mt-6">
                <h3 className="text-xl font-bold text-white mb-4">🎯 Objek Terdeteksi:</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {predictions.map((pred, idx) => (
                    <div key={idx} className="bg-white/10 rounded-lg p-3 flex justify-between items-center">
                      <span className="text-white font-semibold capitalize">{pred.class}</span>
                      <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                        {Math.round(pred.score * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-6 text-center text-white/60 text-sm">
          <p>Powered by TensorFlow.js & COCO-SSD Model</p>
          <p className="mt-1">Dapat mendeteksi 80+ jenis objek berbeda</p>
        </div>
      </div>

      {/* Load TensorFlow.js and COCO-SSD */}
      <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0"></script>
      <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3"></script>
    </div>
  );
};

export default ObjectDetectionApp;