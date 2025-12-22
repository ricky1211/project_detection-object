import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download, Github, Linkedin, Mail } from 'lucide-react';

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
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  // --- STYLES ---
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
      padding: '2rem 1rem',
      fontFamily: 'Inter, system-ui, sans-serif',
      color: 'white'
    },
    wrapper: { maxWidth: '1200px', margin: '0 auto' },
    header: { textAlign: 'center', marginBottom: '3rem' },
    card: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      borderRadius: '24px',
      padding: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.6rem',
      padding: '0.8rem 1.5rem',
      borderRadius: '12px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    primaryButton: {
      background: '#4f46e5',
      color: 'white',
      width: '100%'
    },
    profileSection: {
      marginTop: '5rem',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '2rem',
      paddingBottom: '4rem'
    },
    profileCard: {
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '20px',
      padding: '2rem',
      textAlign: 'center',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'transform 0.3s ease'
    }
  };

  // Load COCO-SSD Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        // Memastikan script tfjs sudah dimuat di index.html atau via npm
        const loadedModel = await window.cocoSsd.load();
        setModel(loadedModel);
      } catch (err) {
        setError('Gagal memuat model AI. Pastikan koneksi internet stabil.');
      } finally {
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  // --- OPTIMASI KAMERA ---
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setMode('upload');
    setIsCameraLoading(false);
  }, [stream]);

  const startCamera = async () => {
    setIsCameraLoading(true);
    setError(null);
    setMode('camera');

    const constraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 640 }, // Resolusi ideal untuk kecepatan proses
        height: { ideal: 480 }
      },
      audio: false
    };

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Tunggu hingga metadata dimuat sebelum menandakan kamera siap
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          setStream(mediaStream);
          setIsCameraLoading(false);
        };
      }
    } catch (err) {
      setError('Akses kamera ditolak atau tidak ditemukan.');
      setIsCameraLoading(false);
      setMode('upload');
    }
  };

  // Cleanup pada unmount
  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  // --- LOGIKA DETEKSI ---
  const detect = async (source) => {
    if (!model || !source) return;
    setDetecting(true);
    try {
      const predictions = await model.detect(source);
      setPredictions(predictions);
      drawPredictions(predictions, source);
      analyzeResults(predictions);
    } catch (err) {
      setError('Proses deteksi terganggu.');
    } finally {
      setDetecting(false);
    }
  };

  const drawPredictions = (preds, source) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = source.videoWidth || source.width;
    const height = source.videoHeight || source.height;
    
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);
    
    preds.forEach(p => {
      const [x, y, w, h] = p.bbox;
      ctx.strokeStyle = '#4f46e5';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = '#4f46e5';
      ctx.fillRect(x, y - 25, ctx.measureText(p.class).width + 20, 25);
      ctx.fillStyle = 'white';
      ctx.fillText(`${p.class} ${Math.round(p.score * 100)}%`, x + 5, y - 7);
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
      message: preds.length > 0 ? 'Objek Terdeteksi!' : 'Tidak ada objek'
    });
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
      setPredictions([]);
      setAnalysis(null);
    }
  };

  // --- RENDER ---
  if (loading) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div className="spinner" style={{ border: '4px solid #4f46e5', borderTopColor: 'transparent', borderRadius: '50%', width: 50, height: 50, animation: 'spin 1s linear infinite', margin: '0 auto 1rem' }}></div>
        <p>Mengunduh Neural Network...</p>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      
      <div style={styles.wrapper}>
        <header style={styles.header}>
          <h1 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '0.5rem' }}>Visionary AI</h1>
          <p style={{ opacity: 0.7 }}>Sistem Deteksi Objek Cerdas Berbasis Web</p>
        </header>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem' }}>
          <button 
            onClick={() => { stopCamera(); setMode('upload'); }}
            style={{ ...styles.button, background: mode === 'upload' ? 'white' : 'rgba(255,255,255,0.1)', color: mode === 'upload' ? '#1a1a2e' : 'white' }}
          >
            <Upload size={18} /> Upload
          </button>
          <button 
            onClick={stream ? stopCamera : startCamera}
            style={{ ...styles.button, background: mode === 'camera' ? 'white' : 'rgba(255,255,255,0.1)', color: mode === 'camera' ? '#1a1a2e' : 'white' }}
          >
            <Camera size={18} /> {stream ? 'Matikan Kamera' : 'Buka Kamera'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem', flexWrap: 'wrap' }}>
          {/* Main Display */}
          <div style={styles.card}>
            <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', minHeight: '400px' }}>
              {isCameraLoading && (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                  <p>Menyiapkan Kamera...</p>
                </div>
              )}
              
              {mode === 'camera' ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', display: 'block' }} />
              ) : imageSrc ? (
                <img ref={imageRef} src={imageSrc} onLoad={() => detect(imageRef.current)} style={{ width: '100%', display: 'block' }} />
              ) : (
                <div style={{ padding: '5rem', textAlign: 'center', opacity: 0.3 }}>
                   <Camera size={64} style={{ margin: '0 auto 1rem' }} />
                   <p>Pilih sumber input untuk memulai</p>
                </div>
              )}
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              {mode === 'camera' && stream && (
                <button onClick={() => detect(videoRef.current)} style={{ ...styles.button, ...styles.primaryButton }}>
                  {detecting ? 'Memproses...' : 'Ambil & Deteksi Objek'}
                </button>
              )}
              {mode === 'upload' && (
                <button onClick={() => fileInputRef.current.click()} style={{ ...styles.button, ...styles.primaryButton }}>
                  Pilih Gambar dari Perangkat
                </button>
              )}
              <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
            </div>
          </div>

          {/* Results Side */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={styles.card}>
              <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ZoomIn size={20}/> Ringkasan</h3>
              {analysis ? (
                <>
                  <div style={{ background: 'rgba(79, 70, 229, 0.2)', padding: '1rem', borderRadius: '12px', border: '1px solid #4f46e5' }}>
                    <p style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Objek</p>
                    <p style={{ fontSize: '2.5rem', fontWeight: '800' }}>{analysis.total}</p>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    {Object.entries(analysis.counts).map(([name, count]) => (
                      <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ textTransform: 'capitalize' }}>{name}</span>
                        <span style={{ fontWeight: '700' }}>{count}x</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : <p style={{ opacity: 0.5, textAlign: 'center' }}>Menunggu analisis...</p>}
            </div>
          </div>
        </div>

        {/* --- SECTION PROFIL PEMBUAT --- */}
        <section style={styles.profileSection}>
          <ProfileCard 
            name="Ahmad Fauzi" 
            role="AI Engineer" 
            email="fauzi@example.com" 
            github="ahmadfauzi"
          />
          <ProfileCard 
            name="Siti Aminah" 
            role="Frontend Developer" 
            email="siti@example.com" 
            github="sitiaminah"
          />
          <ProfileCard 
            name="Budi Santoso" 
            role="UI/UX Designer" 
            email="budi@example.com" 
            github="budisan"
          />
        </section>

        <footer style={{ textAlign: 'center', opacity: 0.5, paddingBottom: '2rem', fontSize: '0.9rem' }}>
          © 2024 Visionary Project. Built with React & TensorFlow.js
        </footer>
      </div>
    </div>
  );
};

// Komponen Kecil untuk Profil
const ProfileCard = ({ name, role, email, github }) => {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.03)',
      borderRadius: '24px',
      padding: '2rem',
      textAlign: 'center',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'transform 0.3s ease',
      cursor: 'default'
    }}
    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-10px)'}
    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
    >
      <div style={{ width: '80px', height: '80px', background: '#4f46e5', borderRadius: '50%', margin: '0 auto 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: 'bold' }}>
        {name.charAt(0)}
      </div>
      <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>{name}</h3>
      <p style={{ color: '#4f46e5', fontWeight: '600', marginBottom: '1.5rem', fontSize: '0.9rem' }}>{role}</p>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
        <a href={`mailto:${email}`} style={{ color: 'white', opacity: 0.6 }}><Mail size={20}/></a>
        <a href={`https://github.com/${github}`} style={{ color: 'white', opacity: 0.6 }}><Github size={20}/></a>
        <a href="#" style={{ color: 'white', opacity: 0.6 }}><Linkedin size={20}/></a>
      </div>
    </div>
  );
};

export default DetectionToolkit;