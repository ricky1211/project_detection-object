import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, AlertCircle, Image } from 'lucide-react';

const DetectionToolkit = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('upload');
  const [predictions, setPredictions] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [profilePhotos] = useState([
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1494790108755-2616b786d4d1?w=400&h=400&fit=crop',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=400&h=400&fit=crop'
  ]);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const animationRef = useRef(null);

  // Inisialisasi Model COCO-SSD
  useEffect(() => {
    const loadModel = async () => {
      try {
        if (!window.cocoSsd) {
          await new Promise((resolve) => {
            const check = setInterval(() => {
              if (window.cocoSsd) { clearInterval(check); resolve(); }
            }, 100);
          });
        }
        const loadedModel = await window.cocoSsd.load();
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        setError("Gagal memuat sistem AI Vision.");
        setLoading(false);
      }
    };
    loadModel();
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Logika Kamera Real-time - Dioptimalkan
  const startCamera = async () => {
    setCameraLoading(true);
    setError(null);
    setPredictions([]);
    setAnalysis(null);
    
    try {
      // Stop kamera sebelumnya jika ada
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'user',
          width: { ideal: 1280 }, 
          height: { ideal: 720 } 
        },
        audio: false
      });
      
      setStream(mediaStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => {
            setCameraLoading(false);
            setMode('camera');
            setCameraActive(true);
            setTimeout(() => detectContinuously(), 100);
          }).catch(err => {
            setError("Gagal memutar video kamera.");
            setCameraLoading(false);
          });
        };
      }
    } catch (err) {
      console.error("Kesalahan kamera:", err);
      if (err.name === 'NotAllowedError') {
        setError("Izin kamera ditolak. Silakan izinkan akses kamera di pengaturan browser.");
      } else if (err.name === 'NotFoundError') {
        setError("Kamera tidak ditemukan pada perangkat ini.");
      } else {
        setError("Gagal mengakses kamera. Pastikan kamera tidak digunakan aplikasi lain.");
      }
      setCameraLoading(false);
    }
  };

  const detectContinuously = useCallback(() => {
    if (!model || !videoRef.current || mode !== 'camera' || !cameraActive) return;

    const detectFrame = async () => {
      if (videoRef.current && videoRef.current.readyState === 4) {
        try {
          const preds = await model.detect(videoRef.current);
          setPredictions(preds);
          drawResults(preds, videoRef.current);
          processAnalysis(preds);
        } catch (err) {
          console.error("Error deteksi:", err);
        }
      }
      if (mode === 'camera' && cameraActive) {
        animationRef.current = requestAnimationFrame(detectFrame);
      }
    };
    detectFrame();
  }, [model, mode, cameraActive]);

  useEffect(() => {
    if (mode === 'camera' && cameraActive) {
      detectContinuously();
    }
    return () => cancelAnimationFrame(animationRef.current);
  }, [mode, cameraActive, detectContinuously]);

  const stopCamera = () => {
    cancelAnimationFrame(animationRef.current);
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setMode('upload');
    setCameraActive(false);
    setPredictions([]);
    setAnalysis(null);
  };

  const drawResults = (preds, source) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = source.videoWidth || source.width;
    canvas.height = source.videoHeight || source.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    preds.forEach(p => {
      const [x, y, w, h] = p.bbox;
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      
      ctx.fillStyle = '#3b82f6';
      ctx.font = '500 14px Inter';
      const label = `${p.class.toUpperCase()} ${Math.round(p.score * 100)}%`;
      ctx.fillText(label, x, y > 20 ? y - 10 : 20);
    });
  };

  const processAnalysis = (preds) => {
    const counts = preds.reduce((acc, curr) => {
      acc[curr.class] = (acc[curr.class] || 0) + 1;
      return acc;
    }, {});
    setAnalysis({
      total: preds.length,
      counts,
      avgConfidence: preds.length ? (preds.reduce((a, b) => a + b.score, 0) / preds.length * 100).toFixed(1) : 0,
      timestamp: new Date().toLocaleTimeString('id-ID')
    });
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

  const handleImageDetection = async () => {
    if (imageRef.current && model) {
      try {
        const preds = await model.detect(imageRef.current);
        setPredictions(preds);
        drawResults(preds, imageRef.current);
        processAnalysis(preds);
      } catch (err) {
        console.error("Error deteksi gambar:", err);
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 font-medium tracking-wide">Memuat Sistem Vision...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Neural Vision</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Deteksi Objek Secara Real-time
            </p>
          </div>
          <div className="flex gap-2">
            <span className="px-3 py-1 bg-white border border-slate-200 text-slate-600 rounded-full text-xs font-semibold shadow-sm">
              TensorFlow JS v4.1
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Area Konten Utama */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Toolbar */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div className="flex bg-slate-200/50 p-1 rounded-xl">
                  <button 
                    onClick={() => { stopCamera(); setMode('upload'); }}
                    className={`px-6 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'upload' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                  >
                    Unggah
                  </button>
                  <button 
                    onClick={startCamera}
                    disabled={cameraLoading}
                    className={`px-6 py-1.5 rounded-lg text-sm font-medium transition-all ${mode === 'camera' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'} disabled:opacity-50`}
                  >
                    Kamera Langsung
                  </button>
                </div>
              </div>

              {/* Area Viewport */}
              <div className="relative bg-slate-900 aspect-video flex items-center justify-center overflow-hidden">
                {mode === 'camera' ? (
                  <video 
                    ref={videoRef}
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-full object-cover"
                    style={{ transform: 'scaleX(-1)' }}
                  />
                ) : imageSrc ? (
                  <img 
                    ref={imageRef}
                    src={imageSrc} 
                    alt="Gambar yang diunggah"
                    className="w-full h-full object-contain"
                    onLoad={handleImageDetection}
                  />
                ) : (
                  <div className="text-slate-400 text-center">
                    <Image className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-sm font-medium">Silakan unggah gambar atau gunakan kamera</p>
                  </div>
                )}
                
                <canvas 
                  ref={canvasRef} 
                  className="absolute top-0 left-0 w-full h-full pointer-events-none"
                  style={{ transform: mode === 'camera' ? 'scaleX(-1)' : 'none' }}
                />

                {cameraLoading && (
                  <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-white flex flex-col items-center">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin mb-3"></div>
                      <span className="text-sm font-medium">Menghubungkan Kamera...</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Kontrol Footer */}
              <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                >
                  <Upload className="w-5 h-5" />
                  Pilih Gambar
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} hidden accept="image/*" />
                
                <button
                  onClick={() => { 
                    setImageSrc(null); 
                    setAnalysis(null); 
                    setPredictions([]); 
                    stopCamera(); 
                  }}
                  className="p-3 border border-slate-200 text-slate-400 rounded-xl hover:bg-slate-50 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Grid Statistik Cepat */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Objek</p>
                <p className="text-3xl font-bold text-slate-800">{analysis?.total || 0}</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Tingkat Keyakinan</p>
                <p className="text-3xl font-bold text-blue-600">{analysis?.avgConfidence || 0}%</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">Waktu Analisis</p>
                <p className="text-sm font-medium text-slate-800 mt-3">{analysis?.timestamp || '--:--:--'}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Profil */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <img 
                    src={profilePhotos[0]} 
                    className="w-24 h-24 rounded-3xl object-cover ring-4 ring-slate-50" 
                    alt="Profil" 
                  />
                  <div className="absolute -bottom-1 -right-1 bg-green-500 w-5 h-5 border-4 border-white rounded-full"></div>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Pengembang Neural</h3>
                <p className="text-sm text-slate-500 mt-1 px-2 leading-relaxed">Insinyur AI yang mengkhususkan diri dalam computer vision real-time.</p>
              </div>

              <div className="mt-8">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Aktivitas Terkini</h4>
                <div className="grid grid-cols-3 gap-2">
                  {profilePhotos.map((p, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-slate-100 overflow-hidden border border-slate-100">
                       <img src={p} className="w-full h-full object-cover" alt="Riwayat" />
                    </div>
                  ))}
                </div>
              </div>

              <button className="w-full mt-8 py-3 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800 transition-colors shadow-xl shadow-slate-200">
                Hubungi Pengembang
              </button>
            </div>
          </div>
        </div>

        {/* Info Footer */}
        <footer className="mt-12 py-6 border-t border-slate-200 text-center text-slate-400 text-xs font-medium">
          &copy; 2024 NEURAL VISION AI. SEMUA SISTEM OPERASIONAL.
        </footer>
      </div>

      {/* Notifikasi Error */}
      {error && (
        <div className="fixed bottom-6 right-6 bg-white border-l-4 border-red-500 shadow-2xl p-4 rounded-r-xl flex items-center gap-3 max-w-md z-50">
          <AlertCircle className="text-red-500 w-5 h-5 flex-shrink-0" />
          <span className="text-sm font-medium text-slate-700">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-slate-400 hover:text-slate-600 text-xl"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default DetectionToolkit;