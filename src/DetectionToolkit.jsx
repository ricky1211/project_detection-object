import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download, Github, Linkedin, Mail } from 'lucide-react';

const DetectionToolkit = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('camera'); 
  const [predictions, setPredictions] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const requestRef = useRef();

  // --- LOGIKA DETEKSI OTOMATIS FRAME BY FRAME ---
  const detectFrame = useCallback(async () => {
    if (!model || mode !== 'camera' || !videoRef.current || videoRef.current.paused) return;

    try {
      const preds = await model.detect(videoRef.current);
      setPredictions(preds);
      drawPredictions(preds, videoRef.current);
      analyzeResults(preds);
      
      // Loop berlanjut selama mode adalah kamera
      requestRef.current = requestAnimationFrame(detectFrame);
    } catch (err) {
      console.error("Loop error:", err);
    }
  }, [model, mode]);

  // Efek untuk menjalankan loop saat kamera aktif
  useEffect(() => {
    if (stream && model && mode === 'camera') {
      requestRef.current = requestAnimationFrame(detectFrame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [stream, model, mode, detectFrame]);

  // --- LOAD MODEL ---
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        if (window.cocoSsd) {
          const loadedModel = await window.cocoSsd.load();
          setModel(loadedModel);
          startCamera(); 
        }
      } catch (err) {
        setError('Gagal memuat model AI.');
      } finally {
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  // --- MANAJEMEN KAMERA ---
  const startCamera = async () => {
    setError(null);
    setMode('camera');
    setImageSrc(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 640, height: 480 },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      setError('Akses kamera ditolak.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    cancelAnimationFrame(requestRef.current);
  };

  // --- MANAJEMEN UPLOAD ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera(); // Matikan kamera jika user upload file
      setMode('upload');
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setPredictions([]);
      setAnalysis(null);
    }
  };

  const detectImage = async () => {
    if (!model || !imageRef.current) return;
    setDetecting(true);
    const preds = await model.detect(imageRef.current);
    setPredictions(preds);
    drawPredictions(preds, imageRef.current);
    analyzeResults(preds);
    setDetecting(false);
  };

  // --- DRAW & ANALYZE ---
  const drawPredictions = (preds, source) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    canvas.width = source.videoWidth || source.width;
    canvas.height = source.videoHeight || source.height;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    preds.forEach(p => {
      const [x, y, w, h] = p.bbox;
      ctx.strokeStyle = '#00FF00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#00FF00';
      ctx.fillText(`${p.class} ${Math.round(p.score * 100)}%`, x, y > 10 ? y - 5 : 10);
    });
  };

  const analyzeResults = (preds) => {
    const counts = preds.reduce((acc, curr) => {
      acc[curr.class] = (acc[curr.class] || 0) + 1;
      return acc;
    }, {});
    setAnalysis({ total: preds.length, counts });
  };

  const styles = {
    container: { minHeight: '100vh', background: '#0f172a', color: 'white', padding: '2rem 1rem' },
    card: { background: '#1e293b', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #334155' },
    btnPrimary: { padding: '0.8rem 1.5rem', borderRadius: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    btnSecondary: { padding: '0.8rem 1.5rem', borderRadius: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer' },
    profileCard: { background: '#1e293b', padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', border: '1px solid #334155' }
  };

  if (loading) return <div style={{textAlign:'center', padding:'5rem', color:'white'}}>Memuat Model AI...</div>;

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Visionary AI Pro</h1>
          <p style={{ opacity: 0.6 }}>Deteksi Objek Real-time & Unggah Gambar</p>
        </header>

        {/* Tombol Kontrol Utama */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <button onClick={startCamera} style={mode === 'camera' ? styles.btnPrimary : styles.btnSecondary}>
            <Camera size={20} /> Mode Kamera
          </button>
          <button onClick={() => fileInputRef.current.click()} style={mode === 'upload' ? styles.btnPrimary : styles.btnSecondary}>
            <Upload size={20} /> Mode Upload
          </button>
          <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 900 ? '1fr 320px' : '1fr', gap: '2rem' }}>
          <div style={styles.card}>
            <div style={{ position: 'relative', background: 'black', borderRadius: '1rem', overflow: 'hidden', minHeight: '300px' }}>
              {mode === 'camera' ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
              ) : imageSrc ? (
                <img ref={imageRef} src={imageSrc} alt="uploaded" onLoad={detectImage} style={{ width: '100%', display: 'block' }} />
              ) : null}
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ZoomIn size={20}/> Hasil Deteksi</h3>
            <hr style={{ opacity: 0.1, margin: '1rem 0' }} />
            {analysis ? (
              <div>
                <div style={{ background: '#3b82f6', padding: '1rem', borderRadius: '0.8rem', marginBottom: '1rem' }}>
                  <p style={{ fontSize: '0.7rem', opacity: 0.8, textTransform: 'uppercase' }}>Total Objek</p>
                  <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analysis.total}</p>
                </div>
                {Object.entries(analysis.counts).map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span style={{ textTransform: 'capitalize' }}>{name}</span>
                    <span style={{ fontWeight: 'bold', color: '#10b981' }}>{count}x</span>
                  </div>
                ))}
              </div>
            ) : <p style={{ opacity: 0.5 }}>Menunggu input gambar/kamera...</p>}
          </div>
        </div>

        {/* --- SECTION PROFIL PEMBUAT --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '5rem' }}>
          <ProfileCard name="Faisal Hanif" role="AI Engineer" initial="F" />
          <ProfileCard name="Rina Septiani" role="Fullstack Dev" initial="R" />
          <ProfileCard name="Andika Pratama" role="UI/UX Designer" initial="A" />
        </div>
      </div>
    </div>
  );
};

const ProfileCard = ({ name, role, initial }) => (
  <div style={{ background: '#1e293b', padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', border: '1px solid #334155' }}>
    <div style={{ width: '70px', height: '70px', background: '#3b82f6', borderRadius: '50%', margin: '0 auto 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
      {initial}
    </div>
    <h3 style={{ margin: '0 0 0.3rem 0' }}>{name}</h3>
    <p style={{ color: '#3b82f6', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{role}</p>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', opacity: 0.5 }}>
      <Github size={18} /> <Linkedin size={18} /> <Mail size={18} />
    </div>
  </div>
);

export default DetectionToolkit;