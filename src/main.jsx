import React from 'react';
import ReactDOM from 'react-dom/client';
import DetectionToolkit from './DetectionToolkit'; // Komponen utama
import './index.css'; // Memuat Tailwind CSS

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DetectionToolkit />
  </React.StrictMode>,
);