import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, RotateCcw, ZoomIn, AlertCircle, CheckCircle, Download } from 'lucide-react';

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
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageRef = useRef(null);

  // Styles
  const styles = {
    container: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '1rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    },
    wrapper: {
      maxWidth: '1280px',
      margin: '0 auto'
    },
    header: {
      textAlign: 'center',
      marginBottom: '2rem',
      color: 'white'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem'
    },
    subtitle: {
      fontSize: '1rem',
      opacity: 0.9
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      justifyContent: 'center',
      marginBottom: '2rem',
      flexWrap: 'wrap'
    },
    button: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem 1.5rem',
      borderRadius: '12px',
      fontWeight: '600',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.3s',
      fontSize: '1rem'
    },
    buttonActive: {
      background: 'white',
      color: '#667eea',
      boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
      transform: 'scale(1.05)'
    },
    buttonInactive: {
      background: 'rgba(255,255,255,0.2)',
      color: 'white'
    },
    card: {
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '1.5rem',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
    },
    detectionArea: {
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '12px',
      minHeight: '300px',
      marginBottom: '1rem',
      position: 'relative',
      overflow: 'hidden'
    },
    actionButtons: {
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap'
    },
    primaryButton: {
      flex: 1,
      minWidth: '120px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      padding: '0.75rem 1.5rem',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s',
      fontSize: '1rem'
    },
    secondaryButton: {
      background: 'rgba(255,255,255,0.2)',
      color: 'white',
      padding: '0.75rem 1.5rem',
      borderRadius: '12px',
      border: 'none',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s'
    },
    resultsCard: {
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '1.5rem',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      color: 'white'
    },
    successBox: {
      background: 'rgba(34,197,94,0.2)',
      border: '2px solid #22c55e',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem'
    },
    errorBox: {
      background: 'rgba(239,68,68,0.2)',
      border: '2px solid #ef4444',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem',
      color: '#fecaca'
    },
    infoBox: {
      background: 'rgba(255,255,255,0.1)',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1rem'
    },
    statRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.5rem 0',
      fontSize: '0.95rem'
    },
    loadingContainer: {
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem'
    },
    loadingBox: {
      background: 'rgba(255,255,255,0.15)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      padding: '3rem',
      textAlign: 'center',
      maxWidth: '400px'
    },
    spinner: {
      width: '80px',
      height: '80px',
      border: '4px solid rgba(255,255,255,0.3)',
      borderTop: '4px solid white',
      borderRadius: '50%',
      margin: '0 auto 1.5rem',
      animation: 'spin 1s linear infinite'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: '1fr',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    gridLg: {
      '@media (min-width: 1024px)': {
        gridTemplateColumns: '2fr 1fr'
      }
    }
  };

  // Load COCO-SSD model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setLoading(true);
        setError(null);
        
        if (!window.cocoSsd) {
          await new Promise(resolve => {
            const checkInterval = setInterval(() => {
              if (window.cocoSsd) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 100);
          });
        }
        
        const cocoSsd = await window.cocoSsd.load();
        setModel(cocoSsd);
        setLoading(false);
      } catch (err) {
        console.error('Error loading model:', err);
        setError('Gagal memuat model AI. Silakan refresh halaman.');
        setLoading(false);
      }
    };
    
    loadModel();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setMode('camera');
      setPredictions([]);
      setAnalysis(null);
      setError(null);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setMode('upload');
  };

  const detectFromCamera = async () => {
    if (!model || !videoRef.current) return;
    
    setDetecting(true);
    setError(null);
    try {
      const predictions = await model.detect(videoRef.current);
      setPredictions(predictions);
      drawPredictions(predictions, videoRef.current);
      analyzeResults(predictions);
    } catch (err) {
      console.error('Detection error:', err);
      setError('Gagal mendeteksi objek. Silakan coba lagi.');
    }
    setDetecting(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('File harus berupa gambar!');
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target.result);
        setPredictions([]);
        setAnalysis(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Gagal membaca file. Silakan coba lagi.');
      };
      reader.readAsDataURL(file);
    }
  };

  const detectFromImage = async () => {
    if (!model || !imageRef.current) return;
    
    setDetecting(true);
    setError(null);
    try {
      const predictions = await model.detect(imageRef.current);
      setPredictions(predictions);
      drawPredictions(predictions, imageRef.current);
      analyzeResults(predictions);
    } catch (err) {
      console.error('Detection error:', err);
      setError('Gagal mendeteksi objek. Silakan coba lagi.');
    }
    setDetecting(false);
  };

  const drawPredictions = (predictions, sourceElement) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = sourceElement.videoWidth || sourceElement.width;
    canvas.height = sourceElement.videoHeight || sourceElement.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceElement, 0, 0, canvas.width, canvas.height);

    const colors = [
      '#00ff00', '#ff00ff', '#00ffff', '#ffff00', 
      '#ff8800', '#8800ff', '#ff0088', '#00ff88'
    ];

    predictions.forEach((prediction, idx) => {
      const [x, y, width, height] = prediction.bbox;
      const color = colors[idx % colors.length];
      
      ctx.fillStyle = color + '20';
      ctx.fillRect(x, y, width, height);
      
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.strokeRect(x, y, width, height);
      
      ctx.fillStyle = color;
      const text = `${prediction.class} ${Math.round(prediction.score * 100)}%`;
      ctx.font = 'bold 18px Arial';
      const textMetrics = ctx.measureText(text);
      const textWidth = textMetrics.width;
      const textHeight = 28;
      
      ctx.fillRect(x, y - textHeight, textWidth + 16, textHeight);
      ctx.fillStyle = '#000000';
      ctx.fillText(text, x + 8, y - 8);
    });
  };

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
      uniqueObjects: Object.keys(objectCounts).length,
      objectCounts,
      avgConfidence,
      highestConfidence,
      message: 'Deteksi berhasil!'
    });
  };

  const downloadResult = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const link = document.createElement('a');
    link.download = `detection-result-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const reset = () => {
    setPredictions([]);
    setAnalysis(null);
    setImageSrc(null);
    setError(null);
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <style>
          {`
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
          `}
        </style>
        <div style={styles.loadingBox}>
          <div style={styles.spinner}></div>
          <p style={{ color: 'white', fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
            Memuat Model AI...
          </p>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem' }}>
            Mohon tunggu, sedang mengunduh COCO-SSD model
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.wrapper}>
        <div style={styles.header}>
          <h1 style={styles.title}>🎯 AI Object Detection</h1>
          <p style={styles.subtitle}>Deteksi objek secara real-time dengan teknologi YOLO & SSD</p>
        </div>

        {error && (
          <div style={styles.errorBox}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              <AlertCircle size={24} style={{ flexShrink: 0 }} />
              <div>
                <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Error</p>
                <p style={{ fontSize: '0.9rem' }}>{error}</p>
              </div>
            </div>
          </div>
        )}

        <div style={styles.buttonGroup}>
          <button
            onClick={() => {
              stopCamera();
              setMode('upload');
              reset();
            }}
            style={{
              ...styles.button,
              ...(mode === 'upload' ? styles.buttonActive : styles.buttonInactive)
            }}
          >
            <Upload size={20} />
            Upload Gambar
          </button>
          <button
            onClick={stream ? stopCamera : startCamera}
            style={{
              ...styles.button,
              ...(mode === 'camera' ? styles.buttonActive : styles.buttonInactive)
            }}
          >
            <Camera size={20} />
            {stream ? 'Stop Kamera' : 'Gunakan Kamera'}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth >= 1024 ? '2fr 1fr' : '1fr', gap: '1.5rem' }}>
          <div style={styles.card}>
            <div style={styles.detectionArea}>
              {mode === 'camera' ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              ) : imageSrc ? (
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Upload"
                  onLoad={detectFromImage}
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '300px', color: 'rgba(255,255,255,0.5)', textAlign: 'center' }}>
                  <div>
                    <Upload size={48} style={{ margin: '0 auto 1rem' }} />
                    <p>Upload gambar atau gunakan kamera</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>Mendukung format: JPG, PNG, WEBP</p>
                  </div>
                </div>
              )}
              <canvas
                ref={canvasRef}
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              />
            </div>

            <div style={styles.actionButtons}>
              {mode === 'upload' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileInputRef.current.click()}
                    style={styles.primaryButton}
                  >
                    Pilih Gambar
                  </button>
                </>
              )}
              {mode === 'camera' && (
                <button
                  onClick={detectFromCamera}
                  disabled={detecting}
                  style={{ ...styles.primaryButton, opacity: detecting ? 0.5 : 1 }}
                >
                  {detecting ? 'Mendeteksi...' : '📸 Deteksi Sekarang'}
                </button>
              )}
              {predictions.length > 0 && (
                <button
                  onClick={downloadResult}
                  style={{ ...styles.primaryButton, background: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)' }}
                >
                  <Download size={18} /> Download
                </button>
              )}
              <button onClick={reset} style={styles.secondaryButton}>
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          <div>
            <div style={styles.resultsCard}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ZoomIn size={24} />
                Hasil Analisis
              </h2>

              {analysis ? (
                <div>
                  <div style={styles.successBox}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: '#86efac', fontWeight: '600' }}>
                      <CheckCircle size={20} />
                      {analysis.message}
                    </div>
                    <p style={{ fontSize: '2rem', fontWeight: 'bold' }}>{analysis.total} Objek</p>
                    <p style={{ fontSize: '0.85rem', opacity: 0.8 }}>{analysis.uniqueObjects} jenis berbeda</p>
                  </div>

                  <div style={styles.infoBox}>
                    <h3 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>📊 Detail Objek:</h3>
                    <div>
                      {Object.entries(analysis.objectCounts).map(([obj, count]) => (
                        <div key={obj} style={styles.statRow}>
                          <span style={{ textTransform: 'capitalize' }}>{obj}:</span>
                          <span style={{ fontWeight: 'bold', background: 'rgba(255,255,255,0.2)', padding: '0.25rem 0.75rem', borderRadius: '8px' }}>
                            {count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div style={styles.infoBox}>
                    <h3 style={{ fontWeight: '600', marginBottom: '0.75rem' }}>📈 Statistik:</h3>
                    <div style={styles.statRow}>
                      <span>Rata-rata Akurasi:</span>
                      <span style={{ fontWeight: 'bold', color: '#86efac' }}>{analysis.avgConfidence}%</span>
                    </div>
                    <div style={styles.statRow}>
                      <span>Paling Yakin:</span>
                      <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>{analysis.highestConfidence.class}</span>
                    </div>
                    <div style={styles.statRow}>
                      <span>Keyakinan:</span>
                      <span style={{ fontWeight: 'bold', color: '#86efac' }}>
                        {Math.round(analysis.highestConfidence.score * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem 0', opacity: 0.6 }}>
                  <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
                  <p>Belum ada hasil deteksi</p>
                  <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    Upload gambar atau gunakan kamera untuk mulai mendeteksi objek
                  </p>
                </div>
              )}
            </div>

            {predictions.length > 0 && (
              <div style={{ ...styles.resultsCard, marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>🎯 Objek Terdeteksi:</h3>
                <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                  {predictions.map((pred, idx) => (
                    <div key={idx} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '600', textTransform: 'capitalize' }}>{pred.class}</span>
                      <span style={{ background: '#22c55e', color: 'white', padding: '0.25rem 0.75rem', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 'bold' }}>
                        {Math.round(pred.score * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ marginTop: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
          <p>⚡ Powered by TensorFlow.js & COCO-SSD Model (SSD-Based)</p>
          <p style={{ marginTop: '0.25rem' }}>🎯 Dapat mendeteksi 80+ jenis objek berbeda secara real-time</p>
        </div>
      </div>
    </div>
  );
};

export default DetectionToolkit;