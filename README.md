# OnTrak - Training Session Management System

OnTrak is a comprehensive training session management system designed to help trainers and administrators efficiently manage and track training sessions.

## Features

### User Management
- Role-based authentication (Admin and Trainer roles)
- Secure login with rate limiting and account locking
- Password management with strong validation
- Profile management

### Training Management
- Create and manage training templates
- Schedule training sessions
- Real-time progress tracking
- Activity timing and monitoring
- Session completion tracking

### Statistics and Analytics
- Comprehensive training statistics
- Performance metrics visualization
- Time variance analysis
- Trainer-specific analytics

### Administrative Features
- User account management
- Training template administration
- System-wide monitoring
- Access control

## Technical Stack

### Frontend
- React with TypeScript
- Material-UI for styling
- React Query for data fetching
- Socket.IO for real-time updates
- React Router for navigation
- Context API for state management

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Passport.js for authentication
- JWT for session management
- Socket.IO for real-time communication

## Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Rate limiting for API endpoints
- XSS protection
- CSRF protection
- MongoDB injection prevention
- Secure HTTP headers
- Cookie security
- Account locking after failed attempts

## Project Structure

### Frontend (/client)
- `/src/components` - Reusable UI components
- `/src/pages` - Main application pages
- `/src/contexts` - React contexts for state management
- `/src/services` - API service integrations
- `/src/hooks` - Custom React hooks
- `/src/types` - TypeScript type definitions
- `/src/utils` - Utility functions

### Backend (/server)
- `/src/routes` - API route definitions
- `/src/models` - MongoDB schema models
- `/src/middleware` - Express middleware
- `/src/config` - Configuration files
- `/src/utils` - Utility functions

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install frontend dependencies
   cd client
   npm install

   # Install backend dependencies
   cd ../server
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Configure the environment variables as needed

4. Start MongoDB:
   ```bash
   # For macOS with Homebrew
   ./scripts/start-mongodb.sh

   # For other systems, ensure MongoDB is running on default port 27017
   ```

5. Start the development servers:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend server (in a new terminal)
   cd client
   npm start
   ```

## Development Guidelines

- Write clean, maintainable code
- Follow TypeScript best practices
- Use proper error handling
- Implement proper logging
- Follow security best practices
- Test thoroughly before deployment

## Production Deployment

### Using Docker (Recommended)

1. Using Docker Compose (Recommended):
   ```bash
   # Build and start the container
   docker-compose up -d

   # View logs
   docker-compose logs -f
   ```

2. Using Docker directly:
   ```bash
   # Build the image
   docker build -t ontrak .

   # Run the container
   docker run -d \
     -p 0.0.0.0:3000:3000 \
     -v mongodb_data:/app/database/data \
     -v app_logs:/app/logs \
     -e JWT_SECRET=your-secret-key \
     -e HOST=0.0.0.0 \
     --name ontrak \
     ontrak
   ```

The application will be available at http://0.0.0.0:3000 and accessible from any network interface.

## Monitoring and Maintenance

### Regular Maintenance Tasks
- Run database backups daily (automated via cron)
- Store backups in a secure, external location
- Monitor system logs for errors and unusual activity
- Update dependencies monthly
- Run security audits weekly
- Clean up old logs weekly

### Backup Management
- Daily backups are stored in a separate backup location
- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep last 3 monthly backups

### Performance Monitoring
- Monitor server resource usage
- Track API response times
- Monitor database performance
- Set up alerts for abnormal conditions

### Security Maintenance
- Regular security updates for all dependencies
- SSL certificate renewal monitoring
- Access log review
- Failed login attempt monitoring
- Regular security scanning

### Documentation
- Keep documentation up to date with changes
- Document all configuration changes
- Maintain deployment procedures
- Update troubleshooting guides

## Additional Documentation
Refer to the following documents in the `docs` directory for detailed information:
- `TRAINING_DAY_LOGIC.md` - Training session management logic
- `STATISTICS_DATA_FLOW.md` - Data flow for statistics generation
- `CRASH_PREVENTION.md` - System stability and crash prevention measures
