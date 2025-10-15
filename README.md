# IronEcho: Self-Hosted Fitness Tracker

A cross-platform fitness tracking app built with React Native + Expo, featuring a self-hosted backend on Raspberry Pi 5. Zero cloud costs, market-ready, 100% offline-first with automatic sync to your personal MongoDB server.

## 🏗️ Architecture

### Frontend (React Native + Expo)
- **Platforms**: iOS, Android, Web
- **Database**: Realm (local offline storage)
- **Sync**: Custom sync service with conflict resolution
- **UI**: NativeBase components with dark mode support
- **Navigation**: React Navigation with bottom tabs
- **Charts**: react-native-charts-wrapper for progress visualization
- **Localization**: i18next (English/Turkish)

### Backend (Node.js + Express on Pi 5)
- **Database**: MongoDB with authentication
- **Authentication**: JWT with refresh tokens
- **Real-time**: Socket.io for multi-device sync
- **Security**: Rate limiting, CORS, input validation
- **Deployment**: Docker containers with Nginx reverse proxy

## 🚀 Features

### ✅ Implemented
- [x] **Backend API**: Complete Express server with MongoDB
- [x] **Authentication**: JWT-based auth with refresh tokens
- [x] **Offline-First**: Realm database with local CRUD operations
- [x] **Sync Service**: Background sync with conflict resolution
- [x] **Navigation**: Bottom tab navigation with stack screens
- [x] **User Management**: Registration, login, profile setup
- [x] **Docker Setup**: Complete Pi 5 deployment configuration

### 🚧 In Progress
- [ ] **Workout Entry**: Dynamic forms with progressive overload calculator
- [ ] **Statistics**: Charts and progress tracking
- [ ] **Measurements**: Body measurements with local photos
- [ ] **Real-time Sync**: Socket.io multi-device updates

## 📱 Core Features

### Authentication & Onboarding
- Email/password authentication with JWT tokens
- Onboarding flow: Gender, units (metric/imperial), language
- Secure token storage with automatic refresh
- Profile management

### Workout Tracking (Offline-Capable)
- **Warmup logging**: Type, duration, speed
- **Exercise management**: Predefined + custom exercises
- **Dynamic sets**: Add/remove sets, reps/weight fields
- **Progressive overload**: Gender-based progression rates
  - Male: 5-10% weight increase
  - Female: 3-5% (safer recovery)
- **PR tracking**: Personal records and volume calculation
- **Date picker**: Past/future workout logging

### Statistics (Offline Queries)
- Exercise history with filtering and pagination
- Weekly summaries with infinite scroll
- Progress charts for weight/reps over time
- PR tracking and volume analysis

### Body Measurements
- Comprehensive measurement fields (neck, waist, chest, etc.)
- Local photo storage with date-based gallery
- Progress graphs and trend analysis
- Tutorial with measurement guides

### Offline-First Architecture
- **Local Operations**: All CRUD → Realm immediately
- **Background Sync**: Auto-sync when online
- **Conflict Resolution**: Latest timestamp wins
- **Sync Status**: Offline indicators and pending counts

## 🛠️ Tech Stack

### Frontend
```json
{
  "react-native": "Expo SDK 50+",
  "typescript": "Strict typing",
  "realm": "Local database",
  "native-base": "UI components",
  "react-navigation": "Navigation",
  "i18next": "Internationalization",
  "axios": "HTTP client",
  "socket.io-client": "Real-time sync"
}
```

### Backend
```json
{
  "express": "Web framework",
  "mongodb": "Database",
  "mongoose": "ODM",
  "jsonwebtoken": "Authentication",
  "socket.io": "Real-time",
  "joi": "Validation",
  "helmet": "Security",
  "cors": "Cross-origin"
}
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB 7.0+
- Expo CLI
- Docker (for Pi 5 deployment)

### Backend Setup

1. **Clone and install dependencies**:
```bash
cd backend
npm install
```

2. **Configure environment**:
```bash
cp env.example .env
# Edit .env with your settings
```

3. **Start MongoDB**:
```bash
# Using Docker
docker run -d --name mongodb -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:7.0

# Or install locally
```

4. **Start the server**:
```bash
npm run dev
```

### Frontend Setup

1. **Install dependencies**:
```bash
npm install --legacy-peer-deps
```

2. **Start Expo development server**:
```bash
npx expo start
```

3. **Run on device/simulator**:
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android

# Web
npx expo start --web
```

### Pi 5 Deployment

1. **Prepare Pi 5**:
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

2. **Deploy with Docker**:
```bash
cd backend/docker
cp ../env.example .env
# Edit .env with production settings

docker-compose up -d
```

3. **Configure network**:
```bash
# Local access: http://192.168.x.x:3000
# External: Set up port forwarding + DuckDNS
# SSL: Let's Encrypt certificates
```

## 📁 Project Structure

```
ironEcho/
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── controllers/     # Route controllers
│   │   ├── middleware/      # Auth, validation
│   │   ├── models/          # MongoDB schemas
│   │   ├── routes/          # API routes
│   │   └── server.js        # Main server file
│   └── docker/              # Docker configuration
├── src/                     # React Native app
│   ├── context/             # React contexts
│   ├── database/            # Realm schemas & config
│   ├── screens/             # App screens
│   ├── services/            # API, sync, calculations
│   └── types/               # TypeScript definitions
├── App.tsx                  # Main app component
└── package.json
```

## 🔧 Configuration

### Environment Variables

**Backend (.env)**:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/ironecho
JWT_SECRET=your-super-secret-key
CORS_ORIGIN=http://localhost:19006
```

**Frontend**: Update API base URL in `src/services/api.ts`

### Database Schemas

- **Users**: Profile, settings, authentication
- **Workouts**: Exercises, sets, progressive overload
- **Measurements**: Body measurements, photos
- **SyncStatus**: Offline sync state

## 🔄 Sync Architecture

### Data Flow
```
Realm (Local) → UI (Immediate) → API (Background) → MongoDB (Server)
```

### Conflict Resolution
- **Strategy**: Last-write-wins based on timestamp
- **Local Priority**: Client timestamp takes precedence
- **Real-time**: Socket.io for multi-device updates

### Offline Support
- **Full CRUD**: All operations work offline
- **Auto-sync**: Background sync when online
- **Status Indicators**: Offline/pending sync UI
- **Manual Sync**: Pull-to-refresh functionality

## 🎯 Progressive Overload

### Algorithm
- **Gender-based rates**: Male 5-10%, Female 3-5%
- **Exercise types**: Strength, bodyweight, cardio
- **Success metrics**: Target reps, recovery time
- **Fallback**: Minimum progression if recovery exceeded

### Implementation
```typescript
// Example progression calculation
const progressionRate = userGender === 'male' ? 0.075 : 0.04;
const newWeight = currentWeight * (1 + progressionRate);
const roundedWeight = Math.round(newWeight / 2.5) * 2.5; // 2.5kg plates
```

## 🔒 Security

### Backend
- JWT authentication with refresh tokens
- Rate limiting per IP
- Input validation with Joi
- CORS configuration
- Helmet security headers

### Frontend
- Secure token storage
- Input sanitization
- Offline data encryption (Realm)
- No sensitive data in logs

## 📊 Performance

### Optimization
- Realm query indexing
- FlatList virtualization
- Background sync (non-blocking)
- Image caching for photos
- Lazy loading for large datasets

### Monitoring
- Health check endpoints
- Sync status tracking
- Error logging and reporting
- Performance metrics

## 🧪 Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
npm test
```

### Integration Testing
- Offline/online scenarios
- Multi-device sync
- Conflict resolution
- Data integrity

## 🚀 Deployment

### Development
- Local MongoDB
- Expo development server
- Hot reloading enabled

### Production (Pi 5)
- Docker containers
- Nginx reverse proxy
- SSL certificates
- Process management (PM2)
- Automated backups

### Scaling
- Load balancing
- Database clustering
- CDN for static assets
- Monitoring and logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: This README
- **Community**: GitHub Discussions

## 🗺️ Roadmap

### Phase 1: Core Features ✅
- [x] Backend API
- [x] Authentication
- [x] Offline storage
- [x] Basic sync

### Phase 2: Workout Features 🚧
- [ ] Workout entry forms
- [ ] Progressive overload
- [ ] Exercise database
- [ ] PR tracking

### Phase 3: Analytics 📊
- [ ] Statistics dashboard
- [ ] Progress charts
- [ ] Export functionality
- [ ] Goal tracking

### Phase 4: Advanced Features 🚀
- [ ] Social features
- [ ] Workout sharing
- [ ] Advanced analytics
- [ ] AI recommendations

---

**IronEcho** - Your personal fitness companion, 100% offline-first, self-hosted, and market-ready.
