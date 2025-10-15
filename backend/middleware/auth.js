const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Mock users database (replace with actual database)
const users = [
  {
    id: 1,
    email: 'admin1@viducate.com',
    password: '$2a$10$...',  // This should be bcrypt hashed 'admin123'
    role: 'admin',
    name: 'Admin User'
  },
  {
    id: 2,
    email: 'teacher1@viducate.com',
    password: '$2a$10$...',  // This should be bcrypt hashed 'teacher123'
    role: 'teacher',
    name: 'Teacher User'
  },
  {
    id: 3,
    email: 'student1@viducate.com',
    password: '$2a$10$...',  // This should be bcrypt hashed 'student123'
    role: 'student',
    name: 'Student User'
  }
];

// For development, create users with plain text passwords
const initializeUsers = async () => {
  const salt = await bcrypt.genSalt(10);
  users[0].password = await bcrypt.hash('admin123', salt);
  users[1].password = await bcrypt.hash('teacher123', salt);
  users[2].password = await bcrypt.hash('student123', salt);
};

// Initialize users on startup
initializeUsers();

const authenticateUser = async (email, password) => {
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  
  if (!isValidPassword) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

const verifyToken = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = {
  authenticateUser,
  generateToken,
  verifyToken
};
