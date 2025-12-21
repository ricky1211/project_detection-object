import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download, Users, Zap } from 'lucide-react';

// --- Styles separated for readability ---
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
    padding: '1rem',
    fontFamily: '"Orbitron", "Rajdhani", sans-serif',
    position: 'relative',
    overflowX: 'hidden'
  },
  scanlineOverlay: {
    position: 'fixed',
    top: 0, left: 0, width: '100%', height: '100%',
    background: 'repeating-linear-gradient(0deg, rgba(0, 255, 65, 0.03) 0px, transparent 2px)',
    pointerEvents: 'none',
    zIndex: 1,
  },
  wrapper: {
    maxWidth: '1400px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 2
  },
  title: {
    fontSize: 'clamp(1.5rem, 5vw, 3.5rem)',
    fontWeight: 'bold',
    textAlign: 'center',
    background: 'linear-gradient(90deg, #00ff41, #00d9ff, #ff2a6d)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 20px rgba(0, 255, 65, 0.5)',
    letterSpacing: '2px',
    textTransform: 'uppercase',
    marginBottom: '0.5rem'
  },
  card: {
    background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.05), rgba(0, 217, 255, 0.05))',
    border: '2px solid rgba(0, 255, 65, 0.3)',
    padding: '1.5rem',
    position: 'relative',
    clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%)'
  },
  detectionArea: {
    background: 'rgba(0, 0, 0, 0.8)',
    border: '2px solid rgba(0, 255, 65, 0.5)',
    minHeight: '300px',
    marginBottom: '1rem',
    position: 'relative',
    overflow: 'hidden'
  },
  primaryButton: {
    flex: 1,
    background: 'linear-gradient(135deg, rgba(0, 255, 65, 0.2), rgba(0, 217, 255, 0.2))',
    color: '#00ff41',
    padding: '0.75rem 1.5rem',
    border: '2px solid #00ff41',
    cursor: 'pointer',
    textTransform: 'uppercase',
    clipPath: 'polygon(5% 0%, 100% 0%, 95% 100%, 0% 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    transition: 'all 0.3s'
  }
};

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
  const [cameraLoading, setCameraLoading] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  // Load COCO-SSD Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        if (!window.cocoSsd) {
          // Tunggu sebentar jika script sedang dimuat via CDN di index.html
          await new Promise(r => setTimeout(r, 1000));
        }
        const loadedModel = await window.cocoSsd.load();
        setModel(loadedModel);
        setLoading(false);
      } catch (err) {
        setError("AI Engine failed to initialize. Please check connection.");
        setLoading(false);
      }
    };
    loadModel();
  }, []);

  const startCamera = async () => {
    setCameraLoading(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;
      setMode('camera');
      setCameraLoading(false);
    } catch (err) {
      setError("Camera access denied.");
      setCameraLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach(track => track.stop());
    setStream(null);
    setMode('upload');
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

  const detect = async (source) => {
    if (!model || !source) return;
    setDetecting(true);
    try {
      const preds = await model.detect(source);
      setPredictions(preds);
      drawPredictions(preds, source);
      analyzeResults(preds);
    } catch (err) {
      setError("Detection process failed.");
    }
    setDetecting(false);
  };

  const drawPredictions = (preds, source) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = source.videoWidth || source.width;
    const height = source.videoHeight || source.height;
    
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    preds.forEach(pred => {
      const [x, y, w, h] = pred.bbox;
      ctx.strokeStyle = '#00ff41';
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, w, h);
      
      ctx.fillStyle = '#00ff41';
      ctx.font = 'bold 16px Orbitron';
      ctx.fillText(`${pred.class.toUpperCase()} ${Math.round(pred.score * 100)}%`, x, y > 20 ? y - 10 : 20);
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
      avgConfidence: preds.length ? (preds.reduce((a, b) => a + b.score, 0) / preds.length * 100).toFixed(1) : 0
    });
  };

  if (loading) return (
    <div style={{ ...styles.container, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', color: '#00ff41' }}>
        <Zap size={50} className="animate-pulse" />
        <h2>SYSTEM INITIALIZING...</h2>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.scanlineOverlay}></div>
      
      <div style={styles.wrapper}>
        <header style={{ marginBottom: '2rem' }}>
          <h1 style={styles.title}>NEURAL VISION AI</h1>
          <p style={{ color: '#00ff41', textAlign: 'center', fontFamily: 'monospace' }}>
            &gt; CLASSIFYING REALITY... [STATUS: OPTIMAL]
          </p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          {/* Main Visualizer */}
          <section style={styles.card}>
            <div style={styles.detectionArea}>
              {mode === 'camera' ? (
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%' }} />
              ) : imageSrc ? (
                <img ref={imageRef} src={imageSrc} alt="Preview" style={{ width: '100%' }} onLoad={() => detect(imageRef.current)} />
              ) : (
                <div style={{ height: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#00d9ff' }}>
                  WAITING FOR INPUT...
                </div>
              )}
              <canvas ref={canvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', pointerEvents: 'none' }} />
            </div>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {mode === 'upload' ? (
                <button style={styles.primaryButton} onClick={() => fileInputRef.current.click()}>
                  <Upload size={18} /> UPLOAD IMAGE
                </button>
              ) : (
                <button style={styles.primaryButton} onClick={() => detect(videoRef.current)}>
                  <Zap size={18} /> {detecting ? 'SCANNING...' : 'SCAN FRAME'}
                </button>
              )}
              
              <button style={{ ...styles.primaryButton, borderColor: '#00d9ff', color: '#00d9ff' }} onClick={stream ? stopCamera : startCamera}>
                <Camera size={18} /> {stream ? 'OFF' : 'LIVE'}
              </button>
              
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} hidden accept="image/*" />
            </div>
          </section>

          {/* Data Analysis Panel */}
          <section style={styles.card}>
            <h2 style={{ color: '#00d9ff', borderBottom: '1px solid #00d9ff', paddingBottom: '0.5rem' }}>
              <ZoomIn size={20} /> ANALYTICS
            </h2>
            
            {analysis ? (
              <div style={{ color: '#fff', marginTop: '1rem' }}>
                <div style={{ fontSize: '1.5rem', color: '#00ff41', marginBottom: '1rem' }}>
                  {analysis.total} OBJECTS DETECTED
                </div>
                {Object.entries(analysis.counts).map(([name, count]) => (
                  <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <span style={{ textTransform: 'uppercase' }}>{name}</span>
                    <span style={{ color: '#00ff41' }}>x{count}</span>
                  </div>
                ))}
                <div style={{ marginTop: '1rem', padding: '1rem', background: 'rgba(0,217,255,0.1)' }}>
                  AVG CONFIDENCE: {analysis.avgConfidence}%
                </div>
              </div>
            ) : (
              <p style={{ color: 'rgba(255,255,255,0.3)', marginTop: '2rem', textAlign: 'center' }}>
                NO DATA ANALYZED
              </p>
            )}
          </section>
        </div>

        {/* Footer info */}
        <footer style={{ marginTop: '4rem', textAlign: 'center', opacity: 0.6 }}>
          <p style={{ color: '#00ff41', fontSize: '0.8rem' }}>
            CORE_ENGINE: TENSORFLOW_JS // MODEL: COCO_SSD_V2
          </p>
        </footer>
      </div>
    </div>
  );
};

export default DetectionToolkit;