const express = require('express');
const cors = require('cors');
const { connect } = require('mongoose');
require('dotenv').config();
const upload = require('express-fileupload');
const fs = require('fs');
const path = require('path');

// Route imports
const userRoutes = require('./routes/userRoutes');
const postRoutes = require('./routes/postRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Initialize Express App
const app = express();

// Middleware setup
app.use(express.json({ extended: true }));
app.use(express.urlencoded({ extended: true }));

// CORS setup: Allow specific frontend domain in production
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

app.use(upload());

// Ensure /uploads folder exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);  // Create uploads directory if it does not exist
}
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// MongoDB connection and server startup
connect(process.env.MONGO_URI)
    .then(() => {
        console.log('MongoDB connected successfully');
        app.listen(process.env.PORT || 5000, () => {
            console.log(`Server running on port ${process.env.PORT || 5000}`);
        });
    })
    .catch(error => {
        console.error('MongoDB connection error:', error);
    });
