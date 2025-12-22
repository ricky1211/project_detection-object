import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download, Github, Linkedin, Mail } from 'lucide-react';

const DetectionToolkit = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
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

  // --- LOGIKA DETEKSI TEROPTIMASI ---
  // Kita menggunakan fungsi terpisah agar bisa dipanggil oleh Kamera maupun Upload
  const runDetection = useCallback(async (source) => {
    if (!model || !source) return;

    try {
      // tf.tidy() mencegah memory leak agar browser tidak berat
      const preds = await model.detect(source, 5, 0.45); // Limit 5 objek, threshold 45%
      setPredictions(preds);
      drawPredictions(preds, source);
      analyzeResults(preds);
    } catch (err) {
      console.error("Detection error:", err);
    }
  }, [model]);

  // Loop deteksi khusus untuk kamera
  const detectFrame = useCallback(async () => {
    if (mode === 'camera' && videoRef.current && !videoRef.current.paused) {
      await runDetection(videoRef.current);
      requestRef.current = requestAnimationFrame(detectFrame);
    }
  }, [mode, runDetection]);

  useEffect(() => {
    if (stream && model && mode === 'camera') {
      requestRef.current = requestAnimationFrame(detectFrame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [stream, model, mode, detectFrame]);

  // --- INISIALISASI MODEL ---
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        // Pastikan tfjs dan coco-ssd terload
        if (window.cocoSsd) {
          const loadedModel = await window.cocoSsd.load({
            base: 'mobilenet_v2' // Menggunakan mobilenet_v2 untuk akurasi yang lebih stabil
          });
          setModel(loadedModel);
          startCamera(); 
        }
      } catch (err) {
        setError('Gagal memuat sistem AI.');
      } finally {
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  // --- FUNGSI KAMERA ---
  const startCamera = async () => {
    setError(null);
    setMode('camera');
    setImageSrc(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 }, // Resolusi lebih tinggi untuk akurasi lebih baik
          height: { ideal: 720 }
        },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);
      }
    } catch (err) {
      setError('Kamera tidak dapat diakses.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    cancelAnimationFrame(requestRef.current);
  };

  // --- FUNGSI UPLOAD ---
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      stopCamera();
      setMode('upload');
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  // --- RENDER VISUAL ---
  const drawPredictions = (preds, source) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Sinkronisasi ukuran canvas dengan sumber (Video/Image)
    const displayWidth = source.videoWidth || source.width;
    const displayHeight = source.videoHeight || source.height;
    
    canvas.width = displayWidth;
    canvas.height = displayHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    preds.forEach(p => {
      const [x, y, w, h] = p.bbox;
      // Style Kotak (Neon look)
      ctx.strokeStyle = '#00f2ff';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      
      // Style Label
      ctx.fillStyle = '#00f2ff';
      ctx.font = 'bold 18px sans-serif';
      const text = `${p.class.toUpperCase()} ${Math.round(p.score * 100)}%`;
      ctx.fillText(text, x, y > 25 ? y - 10 : y + 25);
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
    container: { minHeight: '100vh', background: '#0a0a0f', color: 'white', padding: '2rem 1rem', fontFamily: 'Inter, sans-serif' },
    card: { background: '#16161e', borderRadius: '1.5rem', padding: '1.5rem', border: '1px solid #23232e', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' },
    btnPrimary: { padding: '0.8rem 1.5rem', borderRadius: '0.75rem', background: '#3d5aff', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', transition: '0.3s' },
    btnSecondary: { padding: '0.8rem 1.5rem', borderRadius: '0.75rem', background: '#23232e', color: '#a0a0ab', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' },
    profileCard: { background: '#16161e', padding: '2rem', borderRadius: '1.5rem', textAlign: 'center', border: '1px solid #23232e' }
  };

  if (loading) return <div style={{textAlign:'center', padding:'10rem', background:'#0a0a0f', color:'white'}}>Menginisialisasi AI Engine...</div>;

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.8rem', fontWeight: '800', letterSpacing: '-1px', marginBottom: '0.5rem' }}>Visionary <span style={{color:'#3d5aff'}}>AI</span></h1>
          <p style={{ color: '#a0a0ab' }}>Sistem Pemindaian Objek Terpadu</p>
        </header>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2.5rem' }}>
          <button onClick={startCamera} style={mode === 'camera' ? styles.btnPrimary : styles.btnSecondary}>
            <Camera size={20} /> Kamera Aktif
          </button>
          <button onClick={() => fileInputRef.current.click()} style={mode === 'upload' ? styles.btnPrimary : styles.btnSecondary}>
            <Upload size={20} /> Unggah Gambar
          </button>
          <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 900 ? '1fr 320px' : '1fr', gap: '2rem' }}>
          <div style={styles.card}>
            <div style={{ position: 'relative', background: '#000', borderRadius: '1rem', overflow: 'hidden', minHeight: '400px', display: 'flex', alignItems: 'center' }}>
              {mode === 'camera' ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
              ) : imageSrc ? (
                <img ref={imageRef} src={imageSrc} alt="source" onLoad={() => runDetection(imageRef.current)} style={{ width: '100%', display: 'block' }} />
              ) : null}
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={styles.card}>
              <h3 style={{ fontSize: '1.1rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ZoomIn size={18} color="#3d5aff"/> DATA ANALISIS</h3>
              {analysis ? (
                <div>
                  <div style={{ background: 'linear-gradient(135deg, #3d5aff 0%, #703dff 100%)', padding: '1.2rem', borderRadius: '1rem', marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8, marginBottom: '0.2rem' }}>OBJEK TERDETEKSI</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '800' }}>{analysis.total}</p>
                  </div>
                  {Object.entries(analysis.counts).map(([name, count]) => (
                    <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.8rem 0', borderBottom: '1px solid #23232e' }}>
                      <span style={{ textTransform: 'uppercase', fontSize: '0.8rem', fontWeight: '600', color: '#a0a0ab' }}>{name}</span>
                      <span style={{ fontWeight: 'bold', color: '#00f2ff' }}>{count} UNIT</span>
                    </div>
                  ))}
                </div>
              ) : <p style={{ color: '#52525b', textAlign: 'center', padding: '2rem' }}>Menunggu Input...</p>}
            </div>
          </div>
        </div>

        {/* --- PROFIL PEMBUAT --- */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '6rem' }}>
          <ProfileCard name="Faisal Hanif" role="AI Scientist" initial="F" color="#3d5aff" />
          <ProfileCard name="Rina Septiani" role="Fullstack Architect" initial="R" color="#703dff" />
          <ProfileCard name="Andika Pratama" role="Visual Experience" initial="A" color="#00f2ff" />
        </div>
        
        <footer style={{ textAlign: 'center', marginTop: '4rem', paddingBottom: '2rem', color: '#52525b', fontSize: '0.8rem' }}>
          &copy; 2024 Visionary AI Engine. Versi Optimal 2.1
        </footer>
      </div>
    </div>
  );
};

const ProfileCard = ({ name, role, initial, color }) => (
  <div style={{ background: '#16161e', padding: '2.5rem', borderRadius: '1.5rem', textAlign: 'center', border: '1px solid #23232e', transition: '0.3s' }}>
    <div style={{ width: '60px', height: '60px', background: color, borderRadius: '1.2rem', margin: '0 auto 1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold', transform: 'rotate(-5deg)' }}>
      <span style={{ transform: 'rotate(5deg)', color: '#000' }}>{initial}</span>
    </div>
    <h3 style={{ fontSize: '1.2rem', marginBottom: '0.2rem' }}>{name}</h3>
    <p style={{ color: '#52525b', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{role}</p>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '1.2rem', opacity: 0.3 }}>
      <Github size={18} /> <Linkedin size={18} /> <Mail size={18} />
    </div>
  </div>
);

export default DetectionToolkit;