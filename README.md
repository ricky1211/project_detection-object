# Object Detection Toolkit - YOLO & SSD

Aplikasi web untuk deteksi objek menggunakan YOLO dan SSD models dengan antarmuka yang user-friendly.

## 🚀 Features

- ✅ Multiple model support (COCO-SSD, YOLOv5, YOLOv8, SSD MobileNet)
- ✅ Real-time webcam detection
- ✅ Image upload & batch processing
- ✅ Adjustable confidence threshold
- ✅ Detection statistics & history
- ✅ Export results (PNG & JSON)
- ✅ Responsive & modern UI
- ✅ Database integration for tracking

## 📋 Prerequisites

- Node.js 18+ (untuk Vercel deployment)
- PostgreSQL/MySQL (opsional, untuk database)
- Account Vercel (gratis)

## 🛠️ Installation

### 1. Clone atau Download Project

```bash
# Buat folder project
mkdir detection-toolkit
cd detection-toolkit

# Copy semua file yang telah dibuat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment Variables

Buat file `.env.local`:

```env
# Database (opsional)
DATABASE_URL=postgresql://user:password@localhost:5432/detection_db

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000

# Model Configuration
MODEL_PATH=/models
```

### 4. Run Development Server

```bash
npm run dev
```

Buka browser: `http://localhost:3000`

## 🌐 Deploy ke Vercel

### Method 1: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login ke Vercel
vercel login

# Deploy
vercel --prod
```

### Method 2: Via Vercel Dashboard

1. Push code ke GitHub repository
2. Import project di [vercel.com](https://vercel.com)
3. Configure environment variables
4. Deploy!

### Method 3: Vercel Git Integration

```bash
# Push ke GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_GITHUB_REPO
git push -u origin main

# Vercel akan auto-deploy dari GitHub
```

## ⚙️ Configuration

### vercel.json

File `vercel.json` sudah dikonfigurasi untuk:
- Next.js build optimization
- Serverless function memory (3GB)
- Max duration 60 seconds
- Custom routes

### Database Setup (Opsional)

Jika ingin menggunakan database:

```bash
# Install PostgreSQL
# Jalankan schema SQL
psql -U username -d detection_db -f database_schema.sql

# Atau gunakan Vercel Postgres (recommended)
# https://vercel.com/docs/storage/vercel-postgres
```

## 📁 Project Structure

```
detection-toolkit/
├── api/
│   └── detect.js          # Serverless detection endpoint
├── components/
│   └── DetectionToolkit.jsx
├── public/
│   └── models/            # Pre-trained models (opsional)
├── database_schema.sql    # Database schema
├── package.json
├── vercel.json
├── requirements.txt       # Python backend (alternatif)
└── README.md
```

## 🔧 API Usage

### Detection Endpoint

```javascript
POST /api/detect

// Request body
{
  "imageData": "data:image/jpeg;base64,...",
  "confidence": 0.5
}

// Response
{
  "success": true,
  "detections": [
    {
      "class": "person",
      "score": 0.92,
      "bbox": [100, 50, 200, 300]
    }
  ],
  "total": 1,
  "timestamp": "2024-12-09T..."
}
```

## 🎯 Model Options

| Model | Speed | Accuracy | Use Case |
|-------|-------|----------|----------|
| COCO-SSD | Fast | Good | Real-time webcam |
| YOLOv5 | Medium | Excellent | Balanced |
| YOLOv8 | Fast | Best | Production |
| SSD MobileNet | Fastest | Good | Mobile devices |

## 📊 Database Schema

Database mencakup:
- `models` - Model configurations
- `detection_sessions` - Session tracking
- `detections` - Detection results
- `detection_statistics` - Analytics
- `uploaded_images` - Image storage
- `user_preferences` - User settings

## 🚨 Important Notes

### Vercel Limitations

- **Function timeout**: Max 60 detik (Hobby plan) / 300 detik (Pro)
- **Memory**: Max 1GB (Hobby) / 3GB (Pro)
- **File size**: Max 50MB upload
- **Cold start**: First request mungkin lambat

### Alternatif Deployment (Recommended untuk Heavy Models)

Untuk model besar (YOLOv5/v8), pertimbangkan:

1. **Railway.app**
```bash
railway login
railway init
railway up
```

2. **Render.com**
- Support Docker
- Lebih besar memory & timeout

3. **Google Cloud Run**
- Scalable
- Pay-per-use

4. **Hugging Face Spaces**
- Gratis untuk ML models
- GPU support

## 🔐 Security

```javascript
// Rate limiting (tambahkan di vercel.json)
{
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

## 🐛 Troubleshooting

### Error: Module not found

```bash
npm install --force
rm -rf node_modules package-lock.json
npm install
```

### Error: Function timeout

- Reduce image resolution
- Use lighter model (COCO-SSD)
- Upgrade Vercel plan

### Error: Out of memory

- Optimize tensor operations
- Dispose tensors properly
- Use `tf.tidy()`

## 📈 Performance Tips

1. **Model Loading**: Cache model di serverless function
2. **Image Preprocessing**: Resize gambar sebelum detection
3. **Batch Processing**: Process multiple images efficiently
4. **CDN**: Use Vercel CDN untuk static assets

## 📝 License

MIT License - Feel free to use for commercial projects

## 🤝 Contributing

Pull requests welcome!

## 📧 Support

- GitHub Issues
- Email: your-email@example.com
- Documentation: [docs.yoursite.com]

## 🙏 Acknowledgments

- TensorFlow.js team
- YOLO developers
- SSD paper authors
- Anthropic Claude

---

**Made with ❤️ for Object Detection**
