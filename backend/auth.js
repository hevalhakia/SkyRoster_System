const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const JWT_SECRET = 'gizli_anahtar';

// Load users from JSON file
let MOCK_USERS = {};
try {
  const usersPath = path.join(__dirname, 'mockUsers.json');
  const usersData = fs.readFileSync(usersPath, 'utf8');
  const usersJson = JSON.parse(usersData);
  
  // Convert array to object keyed by username for easy lookup
  usersJson.users.forEach(user => {
    MOCK_USERS[user.username] = user;
  });
  
  console.log(`✅ Loaded ${Object.keys(MOCK_USERS).length} mock users from mockUsers.json`);
} catch (error) {
  console.error('❌ Error loading mockUsers.json:', error.message);
  // Fallback to minimal users if file doesn't exist
  MOCK_USERS = {
    'admin': { user_id: 1, username: 'admin', password: 'admin123', role: 'Admin' }
  };
}

// LOGIN: POST /auth/login (Mock version - no DB required)
function login(req, res, pool) {
  const { username, password } = req.body;

  console.log('LOGIN BODY:', req.body);

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Mock user lookup
    const user = MOCK_USERS[username];

    if (!user) {
      console.log('LOGIN ERROR: User not found');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    if (password !== user.password) {
      console.log('LOGIN ERROR: Password mismatch');
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const payload = {
      userId: user.user_id,
      username: user.username,
      role: user.role
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });

    console.log('LOGIN SUCCESS, TOKEN CREATED');

    return res.json({
      message: 'Login successful',
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}

// JWT middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']; // "Bearer xxx"
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      console.error('JWT verify error:', err);
      return res.status(403).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  });
}

module.exports = {
  login,
  authenticateToken
};
