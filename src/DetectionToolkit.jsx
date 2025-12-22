import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download, Github, Linkedin, Mail } from 'lucide-react';

const DetectionToolkit = () => {
  const [model, setModel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stream, setStream] = useState(null);
  const [mode, setMode] = useState('camera'); // Default ke kamera
  const [predictions, setPredictions] = useState([]);
  const [imageSrc, setImageSrc] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);
  const requestRef = useRef(); // Untuk menyimpan ID animasi

  // --- LOGIKA DETEKSI OTOMATIS (REAL-TIME) ---
  const detectFrame = useCallback(async () => {
    if (!model || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

    try {
      const preds = await model.detect(videoRef.current);
      setPredictions(preds);
      drawPredictions(preds, videoRef.current);
      analyzeResults(preds);
      
      // Loop terus menerus selama kamera aktif
      requestRef.current = requestAnimationFrame(detectFrame);
    } catch (err) {
      console.error("Detection loop error:", err);
    }
  }, [model]);

  // Mulai loop saat kamera siap
  useEffect(() => {
    if (stream && model) {
      requestRef.current = requestAnimationFrame(detectFrame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [stream, model, detectFrame]);

  // --- MODEL LOADING ---
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        if (window.cocoSsd) {
          const loadedModel = await window.cocoSsd.load();
          setModel(loadedModel);
          startCamera(); // Auto-start kamera setelah model siap
        }
      } catch (err) {
        setError('Gagal memuat model AI.');
      } finally {
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  // --- OPTIMASI KAMERA ---
  const startCamera = async () => {
    setError(null);
    setMode('camera');
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
      ctx.font = 'bold 16px Arial';
      ctx.fillText(`${p.class} ${Math.round(p.score * 100)}%`, x, y > 20 ? y - 10 : y + 20);
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
    profileGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginTop: '4rem' },
    profileCard: { background: '#1e293b', padding: '2rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid #334155' }
  };

  if (loading) return <div style={{...styles.container, textAlign:'center'}}>Memuat AI...</div>;

  return (
    <div style={styles.container}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <header style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>Visionary AI Real-Time</h1>
          <p style={{ opacity: 0.6 }}>Deteksi Otomatis Tanpa Klik</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth > 900 ? '1fr 300px' : '1fr', gap: '2rem' }}>
          <div style={styles.card}>
            <div style={{ position: 'relative', background: 'black', borderRadius: '1rem', overflow: 'hidden' }}>
              <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
              <button onClick={stream ? stopCamera : startCamera} style={{ flex: 1, padding: '0.8rem', borderRadius: '0.5rem', background: '#3b82f6', color: 'white', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>
                {stream ? 'Matikan Kamera' : 'Aktifkan Kamera'}
              </button>
            </div>
          </div>

          <div style={styles.card}>
            <h3>Hasil Analisis</h3>
            <hr style={{ opacity: 0.1, margin: '1rem 0' }} />
            {analysis ? (
              <div>
                <p style={{ fontSize: '0.8rem', opacity: 0.6 }}>TOTAL OBJEK</p>
                <p style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>{analysis.total}</p>
                {Object.entries(analysis.counts).map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0' }}>
                    <span style={{ textTransform: 'capitalize' }}>{name}</span>
                    <span style={{ color: '#10b981', fontWeight: 'bold' }}>{count}x</span>
                  </div>
                ))}
              </div>
            ) : <p>Menunggu input...</p>}
          </div>
        </div>

        {/* --- PROFIL PEMBUAT --- */}
        <div style={styles.profileGrid}>
          <ProfileCard name="Faisal Hanif" role="Lead Developer" github="faisalh" />
          <ProfileCard name="Rina Septiani" role="AI Research" github="rinasep" />
          <ProfileCard name="Andika Pratama" role="Frontend Expert" github="andika88" />
        </div>
      </div>
    </div>
  );
};

const ProfileCard = ({ name, role, github }) => (
  <div style={{ background: '#1e293b', padding: '1.5rem', borderRadius: '1rem', textAlign: 'center', border: '1px solid #334155' }}>
    <div style={{ width: '60px', height: '60px', background: '#3b82f6', borderRadius: '50%', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>{name[0]}</div>
    <h4 style={{ margin: 0 }}>{name}</h4>
    <p style={{ fontSize: '0.8rem', color: '#3b82f6', marginBottom: '1rem' }}>{role}</p>
    <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', opacity: 0.6 }}>
      <Github size={18} /> <Linkedin size={18} /> <Mail size={18} />
    </div>
  </div>
);

export default DetectionToolkit;