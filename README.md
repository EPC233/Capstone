# Fitness Tracker Application

A full-stack fitness tracking application with accelerometer data management and visualization capabilities.

## Project Structure

- **backend/** - FastAPI backend with PostgreSQL database
- **ui/** - React web application (Vite + TypeScript)
- **mobile/** - React Native mobile app (Expo)
- **database/** - PostgreSQL database configuration

## Features

- **User Authentication** - Secure login and registration with JWT tokens
- **Workout Tracking** - Create and manage workout sessions
- **Accelerometer Data** - Upload and store CSV accelerometer data files
- **Graph Visualization** - Upload and manage workout visualization graphs
- **Multi-platform** - Web and mobile (iOS/Android) support

## Tech Stack

### Backend
- FastAPI - Modern Python web framework
- SQLAlchemy - Database ORM with async support
- PostgreSQL - Primary database
- JWT - Authentication tokens
- Pydantic - Data validation

### Web UI
- React + TypeScript
- Vite - Build tool
- Axios - HTTP client
- Tailwind CSS (optional)

### Mobile
- React Native
- Expo
- TypeScript

## Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL
- Poetry (Python package manager)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
poetry install
```

3. Create a `.env` file with your database credentials:
```
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/fitness_tracker
SECRET_KEY=your-secret-key-here
```

4. Run the server:
```bash
poetry run python server.py
```

The API will be available at `http://localhost:8000`
- API docs: `http://localhost:8000/docs`

### Web UI Setup

1. Navigate to the ui directory:
```bash
cd ui
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
VITE_API_URL=http://localhost:8000/api
```

4. Run the development server:
```bash
npm run dev
```

### Mobile Setup

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```
EXPO_PUBLIC_API_URL=http://YOUR_COMPUTER_IP:8000
```

4. Start the Expo development server:
```bash
npm start
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Users
- `GET /api/users` - List all users (admin)
- `GET /api/users/{id}` - Get user by ID
- `PUT /api/users/{id}` - Update user profile

### Workouts
- `GET /api/workouts` - List user's workouts
- `POST /api/workouts` - Create new workout session
- `GET /api/workouts/{id}` - Get workout details
- `PUT /api/workouts/{id}` - Update workout
- `DELETE /api/workouts/{id}` - Delete workout
- `POST /api/workouts/{id}/accelerometer` - Upload accelerometer data CSV
- `POST /api/workouts/{id}/graph` - Upload graph image
- `DELETE /api/workouts/accelerometer/{id}` - Delete accelerometer data
- `DELETE /api/workouts/graph/{id}` - Delete graph image

## Database Schema

### Users
- Authentication and profile information
- Relationships to workout sessions

### Roles
- User role management (user, manager, admin)

### WorkoutSessions
- Workout metadata (name, type, description)
- Linked to users

### AccelerometerData
- CSV file storage and metadata
- Linked to workout sessions

### GraphImages
- Image file storage and metadata
- Linked to workout sessions

## Development

### Code Quality
```bash
# Format code
poetry run black .
poetry run isort .

# Lint code
poetry run flake8
poetry run ruff check .
```

### Database Migrations
The application uses SQLAlchemy's `create_all()` for initial table creation. For production, consider using Alembic for migrations.

## Docker Deployment

Docker configuration files are included:
- `docker-compose.yaml` - Multi-container orchestration
- `Dockerfile.prod` - Production backend build
- `backend/Dockerfile` - Development backend build
- `ui/Dockerfile` - UI build
- `database/Dockerfile` - PostgreSQL setup

To run with Docker:
```bash
docker-compose up -d
```

## License

This project is a refactored starter template for fitness tracking applications.
