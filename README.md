# Level Up Agency - BIGO Live Host Management Platform

A modern, AI-powered platform for managing BIGO Live hosts, featuring intelligent coaching, audition management, event scheduling, and voice-enabled recruiting powered by BeanGenie™.

## ⚡ Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/MIHAchoppa/lvl-up-agency.git
cd lvl-up-agency

# Set up environment
cp .env.example .env
# Edit .env with your configuration

# Deploy with one command
./deploy.sh
```

Access the application:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

### Manual Setup

See the [detailed setup instructions](#-setup-instructions) below.

## 🚀 Tech Stack

### Frontend
- **React 19** - Modern UI library with latest features
- **Tailwind CSS 3.4** - Utility-first CSS framework for rapid UI development
- **Radix UI** - Accessible, unstyled component primitives
- **React Router 7.5** - Client-side routing
- **Axios** - HTTP client for API communication
- **Lucide React** - Beautiful icon library
- **CRACO** - Create React App Configuration Override for custom builds

### Backend
- **FastAPI** - Modern Python web framework for building APIs
- **MongoDB** - NoSQL database for flexible data storage
- **JWT Authentication** - Secure token-based authentication
- **WebSockets** - Real-time bidirectional communication
- **ElevenLabs API** - AI voice synthesis integration

### Infrastructure
- **Docker & Docker Compose** - Containerization and orchestration
- **Node.js 20+** - Frontend build tooling
- **Python 3.11+** - Backend runtime
- **MongoDB 7.0** - Database
- **Nginx** - Web server and reverse proxy
- **GitHub Actions** - CI/CD automation
- **Git** - Version control

## 📁 Project Structure

```
lvl-up-agency/
├── frontend/                  # React frontend application
│   ├── public/               # Static assets
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   │   ├── ui/          # Base UI components (Radix UI wrappers)
│   │   │   └── dashboard/   # Dashboard-specific components
│   │   ├── pages/           # Page components (LandingPage, Dashboard, Login)
│   │   ├── context/         # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility functions
│   │   ├── App.js           # Main application component
│   │   ├── App.css          # Application-specific styles
│   │   └── index.css        # Global styles with Tailwind directives
│   ├── tailwind.config.js   # Tailwind CSS configuration
│   ├── craco.config.js      # CRACO configuration
│   └── package.json         # Frontend dependencies
│
├── backend/                  # FastAPI backend application
│   ├── routers/             # API route handlers
│   ├── services/            # Business logic and external integrations
│   └── server.py            # Main FastAPI application
│
├── backend-node/            # Node.js backend services (if applicable)
│
├── scripts/                 # Utility scripts
│   ├── seed_data.py        # Database seeding scripts
│   └── create_test_user.py # Test user creation
│
├── tests/                   # Test files
│   ├── *_test.py           # Python unit and integration tests
│   └── test_auth_and_data.sh # Shell script for testing
│
├── docs/                    # Documentation
│   ├── AUTH_AND_DATA_GUIDE.md
│   ├── BEANGENIE_INTEGRATION.md
│   ├── IMPLEMENTATION_SUMMARY.md
│   └── TODO.md
│
├── .gitignore              # Git ignore rules
├── package.json            # Root package.json (if needed)
└── README.md               # This file

```

## 🛠️ Setup Instructions

### Prerequisites

**For Docker Deployment (Recommended):**
- **Docker** (20.10 or higher)
- **Docker Compose** (2.0 or higher)
- **Git**

**For Manual Development:**
- **Node.js** (v20 or higher) and npm
- **Python** (3.11 or higher)
- **MongoDB** (7.0 or higher)
- **Git**

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   # or
   yarn install
   ```

3. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

   The application will open at `http://localhost:3000`

4. Build for production:
   ```bash
   npm run build
   # or
   yarn build
   ```

### Backend Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Set up environment variables (create `.env` file in project root):
   ```bash
   MONGO_URL=mongodb://localhost:27017
   DB_NAME=lvl_up_agency
   JWT_SECRET=your-secret-key
   ELEVENLABS_API_KEY=your-elevenlabs-key
   ```

4. Ensure MongoDB is running:
   ```bash
   # If using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   
   # Or use local MongoDB installation
   mongod
   ```

5. Run the backend server:
   ```bash
   uvicorn backend.server:app --reload
   ```

   The API will be available at `http://localhost:8000`

## 🎨 Key Features

- **🤖 AI-Powered Coaching** - Intelligent guidance for BIGO Live hosts using Bean Genie
- **🎤 Voice Recruiting** - Interactive voice-based talent recruitment system
- **🔍 Lead Scanner Agent** - Automated internet scanning to discover potential BIGO Live hosts
- **📹 Audition Management** - Upload and review host audition videos
- **📅 Event Calendar** - Schedule and manage events with RSVP functionality
- **💬 Real-time Chat** - Group messaging and communication tools
- **📊 Dashboard Analytics** - Performance tracking and insights
- **🔐 Secure Authentication** - JWT-based user authentication and authorization
- **📱 Responsive Design** - Mobile-first UI built with Tailwind CSS

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm test
```

### Backend Tests
```bash
# Run specific test file
python tests/backend_test.py

# Run comprehensive tests
python tests/comprehensive_backend_test.py

# Run authentication and data tests
bash tests/test_auth_and_data.sh
```

## 🚀 Deployment

### Quick Deploy with Docker

The easiest way to deploy the entire stack:

```bash
# Clone the repository
git clone https://github.com/MIHAchoppa/lvl-up-agency.git
cd lvl-up-agency

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start all services with Docker Compose
docker-compose up -d
```

Access the application:
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **Backend Node**: http://localhost:3001

### CI/CD with GitHub Actions

The project includes automated workflows:
- **Frontend CI**: Builds and tests React application
- **Backend CI**: Lints and tests Python backend
- **Docker Build**: Builds and pushes images to GitHub Container Registry

Images are automatically built and pushed to GHCR on:
- Push to `main` branch
- New version tags (e.g., `v1.0.0`)

### Production Deployment Options

- **GitHub Container Registry**: Pre-built Docker images
- **DigitalOcean App Platform**: One-click deployment
- **AWS ECS/Fargate**: Scalable container orchestration
- **Google Cloud Run**: Serverless containers
- **Azure Container Instances**: Simple container deployment
- **Self-hosted VPS**: Full control deployment

For detailed deployment instructions, see [DEPLOY.md](DEPLOY.md).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is proprietary and confidential.

## 🙏 Acknowledgments

- **BeanGenie™** - AI voice synthesis and coaching technology
- **ElevenLabs** - Advanced voice AI integration
- Built with ❤️ for BIGO Live content creators

---

**Powered by BeanGenie™**
