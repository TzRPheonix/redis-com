const express = require('express');
const redis = require('redis');
const app = express();

// Redis server IP address and port configuration
const redisHost = '127.0.0.1';
const redisPort = 6379;

const client = redis.createClient(redisPort, redisHost);

// User registration function
function registerUser(username, password) {
  return new Promise((resolve, reject) => {
    // Generating a unique identifier for the user
    const uniqueId = generateUniqueID(username);
    console.log('Registering user:', username);
    console.log('Generated unique ID:', uniqueId);

    // Storing user information in Redis
    const promises = [
      client.hSet(uniqueId, 'username', username),
      client.hSet(uniqueId, 'password', password)
    ];

    Promise.all(promises)
      .then(() => {
        console.log('User information stored in Redis');
        resolve();
      })
      .catch(error => {
        console.log('Error storing user information in Redis:', error);
        reject(error);
      });
  });
}

// User login function
function loginUser(username, password) {
  return new Promise((resolve, reject) => {
    // Verifying user credentials
    const uniqueId = generateUniqueID(username);
    client.hGet(uniqueId, 'password')
      .then(storedPassword => {
        if (storedPassword === password) {
          // User successfully logged in
          client.set('user_session', uniqueId)
            .then(() => {
              console.log('User logged in');
              resolve();
            })
            .catch(error => {
              console.error('Error storing user session in Redis:', error);
              reject(error);
            });
        } else {
          console.log('Login failed.');
          reject();
        }
      })
      .catch(error => {
        console.error('Error verifying user credentials in Redis:', error);
        reject(error);
      });
  });
}

// Function to generate a unique identifier
function generateUniqueID(username) {
  const crypto = require('crypto');
  const hash = crypto.createHash('sha1');
  hash.update(username);
  return hash.digest('hex');
}

// Express middleware to parse form data
app.use(express.urlencoded({ extended: false }));

// Express middleware to serve static files
app.use(express.static('../frontend'));

// Route for user registration
app.post('/register', (req, res) => {
  const { username, password, confirmPassword } = req.body;

  // Validate password requirements
  if (!validatePassword(password)) {
    return res.status(400).send('Password must contain at least one number and be 6 characters long');
  }

  // Validate password match
  if (password !== confirmPassword) {
    return res.status(400).send('Passwords do not match');
  }

  // Proceed with registration
  registerUser(username, password)
    .then(() => {
      res.send('User registered successfully');
    })
    .catch(error => {
      console.error('Error registering user:', error);
      res.status(500).send('An error occurred');
    });
});

// Function to validate password requirements
function validatePassword(password) {
  const regex = /^(?=.*[0-9]).{6,}$/;
  return regex.test(password);
}

// Route for user login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  loginUser(username, password)
    .then(() => {
      res.send('Login successful');    
    })
    .catch(() => {
      res.send('Login failed');    
    });
});

// Connection function
async function connectToRedis() {
  try {
    client.connect();
    console.log('Connecting to Redis...');
    console.log('Redis server host:', redisHost);
    console.log('Redis server port:', redisPort);

    return new Promise((resolve, reject) => {
      client.on('ready', () => {
        console.log('Redis client ready');
        resolve();
      });

     client.on('connect', () => {
        console.log('Redis client connected');
      });

      client.on('error', (error) => {
        console.error('Redis connection error:', error);
        reject(error);
      });

      client.on('end', () => {
        console.log('Redis client disconnected');
      });
    });
  } catch (error) {
    console.error('Error connecting to Redis:', error);
    throw error;
  }
}

// Usage example
(async () => {
  try {
    await connectToRedis();
    console.log('Connected to Redis');
  } catch (error) {
    console.error('Example error:', error);
  }
})();

// Start the server
const port = 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
