# Security Recommendations for OnTrak Application

This document outlines comprehensive security recommendations for the OnTrak application. Each section details specific security measures, their importance, and implementation guidelines.

## Table of Contents
1. [Authentication & Authorization](#authentication--authorization)
2. [API Security](#api-security)
3. [Environment Configuration](#environment-configuration)
4. [Content Security](#content-security)
5. [Error Handling & Logging](#error-handling--logging)
6. [Input Validation & Sanitization](#input-validation--sanitization)
7. [File Upload Security](#file-upload-security)
8. [Session Management](#session-management)
9. [Dependency Security](#dependency-security)
10. [Production Build Security](#production-build-security)

## Authentication & Authorization

### Token Storage
**Current Issue:** Storing JWT tokens in localStorage is vulnerable to XSS attacks.

**Recommendation:** Use httpOnly cookies for token storage.

```typescript
// Instead of:
localStorage.setItem('token', response.data.token);

// Use secure cookies (set by the server):
res.cookie('jwt', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict'
});
```

**Why?** 
- `httpOnly` cookies cannot be accessed by JavaScript, protecting against XSS attacks
- `secure` ensures cookies are only sent over HTTPS
- `sameSite: 'strict'` prevents CSRF attacks

### Token Expiration & Refresh Mechanism
**Recommendation:** Implement token expiration and refresh mechanism.

```typescript
const token = jwt.sign(
  { id: user._id },
  process.env.JWT_SECRET,
  { 
    expiresIn: '15m',  // Short-lived access token
    algorithm: 'HS256'
  }
);

const refreshToken = jwt.sign(
  { id: user._id },
  process.env.REFRESH_TOKEN_SECRET,
  { 
    expiresIn: '7d',   // Long-lived refresh token
    algorithm: 'HS256'
  }
);
```

**Why?**
- Short-lived tokens minimize the impact of token theft
- Refresh tokens allow for session persistence without compromising security
- Enables token revocation and session management

### CSRF Protection
**Recommendation:** Implement CSRF tokens for form submissions.

```typescript
// Server-side:
app.use(csrf());
app.get('/csrf-token', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Client-side:
const api = axios.create({
  headers: {
    'X-CSRF-Token': getCsrfToken()
  }
});
```

**Why?**
- Prevents Cross-Site Request Forgery attacks
- Ensures requests originate from your application
- Required even with SameSite cookies for complete security

## API Security

### Request Size Limits
**Recommendation:** Implement request size limits to prevent DoS attacks.

```typescript
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const api = axios.create({
  maxContentLength: 10 * 1024 * 1024, // 10MB
  maxBodyLength: 10 * 1024 * 1024
});
```

**Why?**
- Prevents memory exhaustion attacks
- Protects against DoS attempts
- Ensures server stability

### API Versioning
**Recommendation:** Implement API versioning.

```typescript
// In routes:
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);

// In client:
const baseURL = `${env.BACKEND_URL}/api/v1`;
```

**Why?**
- Enables backward compatibility
- Facilitates API evolution
- Improves maintenance and updates

### Request/Response Validation
**Recommendation:** Implement strict validation for all API interactions.

```typescript
// Server-side validation
const validateUserInput = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*])/),
  body('name').trim().isLength({ min: 2, max: 50 }).escape()
];

// Client-side validation
const validateInput = (input: string, type: 'email' | 'name' | 'password') => {
  const sanitized = DOMPurify.sanitize(input.trim());
  const patterns = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    name: /^[a-zA-Z\s-]{2,50}$/,
    password: /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9])(?=.*[!@#$%^&*]).{8,}$/
  };
  return patterns[type].test(sanitized);
};
```

**Why?**
- Prevents injection attacks
- Ensures data integrity
- Reduces server load from invalid requests

## Environment Configuration

### Environment Variable Management
**Recommendation:** Implement strict environment variable validation and management.

```typescript
interface Env {
  BACKEND_URL: string;
  JWT_SECRET: string;
  NODE_ENV: 'development' | 'production' | 'test';
  API_VERSION: string;
  MAX_UPLOAD_SIZE: number;
}

const validateEnv = (): Env => {
  const required = [
    'BACKEND_URL',
    'JWT_SECRET',
    'NODE_ENV',
    'API_VERSION',
    'MAX_UPLOAD_SIZE'
  ];

  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return {
    BACKEND_URL: process.env.BACKEND_URL!,
    JWT_SECRET: process.env.JWT_SECRET!,
    NODE_ENV: process.env.NODE_ENV as Env['NODE_ENV'],
    API_VERSION: process.env.API_VERSION!,
    MAX_UPLOAD_SIZE: parseInt(process.env.MAX_UPLOAD_SIZE!, 10)
  };
};
```

**Why?**
- Prevents application startup with missing configuration
- Ensures type safety
- Makes configuration requirements explicit

### Secrets Management
**Recommendation:** Implement secure secrets management.

```typescript
// Use environment-specific .env files
.env.development
.env.production
.env.test

// Never commit these files to version control
.env*
*.key
*.pem

// Use a secrets management service in production
const secrets = new AWS.SecretsManager();
const getSecret = async (secretName: string) => {
  const data = await secrets.getSecretValue({ SecretId: secretName }).promise();
  return JSON.parse(data.SecretString!);
};
```

**Why?**
- Protects sensitive information
- Enables environment-specific configuration
- Facilitates secrets rotation

## Content Security

### Content Security Policy (CSP)
**Recommendation:** Implement a strict Content Security Policy.

```typescript
// In your Nginx configuration or Express middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));
```

**Why?**
- Prevents XSS attacks
- Controls resource loading
- Mitigates clickjacking attacks

### Security Headers
**Recommendation:** Implement security headers.

```typescript
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: 'same-origin' }
}));
```

**Why?**
- Enforces HTTPS usage
- Prevents clickjacking
- Controls browser security features

## Error Handling & Logging

### Secure Error Handling
**Recommendation:** Implement secure error handling and logging.

```typescript
// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // Log error securely
  logger.error('Error occurred', {
    error: {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    request: {
      method: req.method,
      url: req.url,
      ip: req.ip
    }
  });

  // Send safe error response
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

// Secure logging
const sanitizeLogData = (data: any): any => {
  const sensitiveFields = ['password', 'token', 'authorization'];
  return JSON.parse(JSON.stringify(data), (key, value) => {
    if (sensitiveFields.includes(key.toLowerCase())) {
      return '[REDACTED]';
    }
    return value;
  });
};
```

**Why?**
- Prevents sensitive information leakage
- Facilitates debugging
- Maintains security in production

## File Upload Security

### Secure File Upload Handling
**Recommendation:** Implement secure file upload handling.

```typescript
const validateFile = (file: File): boolean => {
  // Size validation
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File size exceeds limit');
  }

  // Type validation
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('File type not allowed');
  }

  // Content validation
  return true;
};

const handleFileUpload = async (file: File) => {
  if (!validateFile(file)) {
    throw new Error('Invalid file');
  }

  // Generate secure filename
  const ext = path.extname(file.name);
  const filename = `${uuidv4()}${ext}`;

  // Store file securely
  await storeFile(file, filename);
};
```

**Why?**
- Prevents malicious file uploads
- Protects against storage attacks
- Ensures file integrity

## Session Management

### Secure Session Handling
**Recommendation:** Implement secure session management.

```typescript
// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!,
  name: '__Host-sess',  // Cookie name
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  },
  resave: false,
  saveUninitialized: false
}));

// Session monitoring
const monitorSession = () => {
  const inactivityTimeout = 30 * 60 * 1000; // 30 minutes
  let lastActivity = Date.now();

  const checkActivity = () => {
    if (Date.now() - lastActivity > inactivityTimeout) {
      // Log out user
      auth.logout();
    }
  };

  // Update last activity
  document.addEventListener('mousemove', () => {
    lastActivity = Date.now();
  });

  // Check activity every minute
  setInterval(checkActivity, 60 * 1000);
};
```

**Why?**
- Prevents session hijacking
- Manages user inactivity
- Ensures secure session termination

## Dependency Security

### Dependency Management
**Recommendation:** Implement secure dependency management.

```json
{
  "scripts": {
    "audit": "npm audit",
    "audit:fix": "npm audit fix",
    "preinstall": "npx npm-force-resolutions",
    "dependencies:check": "npx depcheck",
    "dependencies:update": "npx npm-check-updates -u"
  },
  "resolutions": {
    "minimist": "^1.2.6",
    "node-fetch": "^2.6.7"
  }
}
```

**Why?**
- Prevents known vulnerabilities
- Ensures dependency updates
- Maintains security compliance

## Production Build Security

### Secure Build Configuration
**Recommendation:** Implement secure build configuration.

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    sourcemap: false,  // Disable source maps in production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      },
      format: {
        comments: false
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          // Split large dependencies into separate chunks
        }
      }
    }
  },
  server: {
    https: true,  // Enable HTTPS in development
    host: true,   // Listen on all addresses
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false
      }
    }
  }
});
```

**Why?**
- Optimizes production builds
- Removes debugging information
- Enhances load performance

## Implementation Priority

1. **High Priority (Implement Immediately)**
   - Token storage in httpOnly cookies
   - Input validation and sanitization
   - Security headers
   - Environment variable validation
   - Error handling and logging

2. **Medium Priority (Implement Within 1 Month)**
   - Token expiration and refresh mechanism
   - API versioning
   - Content Security Policy
   - File upload security
   - Session management

3. **Low Priority (Implement Within 3 Months)**
   - Dependency management automation
   - Production build optimization
   - Advanced logging features
   - Performance monitoring

## Regular Security Maintenance

1. **Weekly Tasks**
   - Run security audits (`npm audit`)
   - Check for dependency updates
   - Review error logs for security issues

2. **Monthly Tasks**
   - Update dependencies
   - Review security configurations
   - Test security measures
   - Update security documentation

3. **Quarterly Tasks**
   - Conduct security training
   - Perform penetration testing
   - Review and update security policies
   - Evaluate new security tools and practices

## Security Contacts

- **Security Team Lead**: [Name] (email@company.com)
- **Emergency Contact**: [Emergency Number]
- **Security Report Email**: security@company.com

## Additional Resources

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [Node.js Security Checklist](https://nodejs.org/en/docs/guides/security/)
- [React Security Best Practices](https://reactjs.org/docs/security.html)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html) 