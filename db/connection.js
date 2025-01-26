const mongoose = require('mongoose');
require('dotenv').config();
// MongoDB connection URI
const mongoURI = `mongodb+srv://${process.env.USERID}:${process.env.PASSWORD}@192.241.138.16:5000/spinWheelCollection`;

// Function to connect to MongoDB using Mongoose
const connectDB = async () => {
  try {
    await mongoose.connect(mongoURI);
    console.log('MongoDB connected successfully!');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1); // Exit the process if connection fails
  }
};

// Export the connection function to be used in other files
module.exports = connectDB;
