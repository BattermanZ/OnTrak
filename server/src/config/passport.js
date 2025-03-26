const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const User = require('../models/user.model');
const logger = require('./logger');

// Local Strategy for username/password login
passport.use(new LocalStrategy({
  usernameField: 'email',
  passwordField: 'password'
}, async (email, password, done) => {
  try {
    const user = await User.findOne({ email });
    
    if (!user) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    if (!user.active) {
      return done(null, false, { message: 'Account is deactivated' });
    }

    const isMatch = await user.comparePassword(password);
    
    if (!isMatch) {
      return done(null, false, { message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    return done(null, user);
  } catch (error) {
    return done(error);
  }
}));

const cookieExtractor = (req) => {
  let token = null;
  if (req && req.cookies && req.cookies['jwt']) {
    token = req.cookies['jwt'];
  }
  return token;
};

const jwtOptions = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    ExtractJwt.fromAuthHeaderAsBearerToken(),
    cookieExtractor
  ]),
  secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
  algorithms: ['HS256'],
  ignoreExpiration: true,
};

passport.use(new JwtStrategy(jwtOptions, async (jwt_payload, done) => {
  try {
    logger.debug('JWT payload received', { userId: jwt_payload.id });
    const user = await User.findById(jwt_payload.id).select('+active');
    
    if (!user) {
      logger.warn('JWT token for non-existent user', { userId: jwt_payload.id });
      return done(null, false);
    }

    if (!user.active) {
      logger.warn('JWT token for inactive user', { userId: jwt_payload.id });
      return done(null, false, { message: 'User account is deactivated' });
    }

    // Check if password was changed after token was issued
    if (user.passwordChangedAt && jwt_payload.iat < user.passwordChangedAt.getTime() / 1000) {
      logger.warn('JWT token used after password change', { userId: jwt_payload.id });
      return done(null, false, { message: 'Password was changed, please login again' });
    }

    logger.debug('JWT authentication successful', { userId: jwt_payload.id });
    return done(null, user);
  } catch (error) {
    logger.error('JWT authentication error', { error: error.message });
    return done(error, false);
  }
}));

module.exports = passport; 