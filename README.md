# OnTrak - Training Schedule Application

A web-based training schedule management system built with React, Node.js, and MongoDB.

## Project Structure

```
ontrak/
├── client/           # React frontend application
├── server/           # Node.js/Express backend
├── config/           # Configuration files
└── logs/             # Application logs
```

## Tech Stack

- **Frontend**: React.js
- **Backend**: Node.js with Express
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Authentication**: Passport.js

## Features

- User Authentication (Admin/Trainer roles)
- Real-time Dashboard
- Schedule Management
- Progress Tracking
- Live Updates
- Logging System

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone [repository-url]
   ```

2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   ```bash
   # In server directory
   cp .env.example .env
   ```

4. Start the development servers:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend development server
   cd ../client
   npm start
   ```

## Development

- Frontend runs on: http://localhost:3000
- Backend API runs on: http://localhost:5000

## License

MIT
