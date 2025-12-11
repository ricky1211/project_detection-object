import React from 'react';
import ReactDOM from 'react-dom/client';
import DetectionToolkit from './DetectionToolkit'; // Import komponen Anda
import './index.css'; // Import CSS (yang berisi Tailwind)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <DetectionToolkit />
  </React.StrictMode>,
);