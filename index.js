const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {SpinModel,SpinModelUserSet,LoginModel} = require("./model/SpinModel");
const connectDB = require("./db/connection");
const path = require("path");
require('dotenv').config();

// Create an Express app
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());



// Connect to MongoDB
connectDB();

const frontendPath = path.join(__dirname, 'frontend');

app.use(express.static(frontendPath));

app.get("*", (req, res) => {
  res.sendFile(frontendPath);
});

app.get('/api/ValidUsers', async (req, res) => {
  const { UserID, Password } = req.query; // Extract UserID and Password from query parameters

  try {
    // Validate input
    if (!UserID || !Password) {
      return res.status(400).json({ message: "UserID and Password are required" });
    }

    // Find the user in the database
    const user = await LoginModel.findOne({ UserID, Password });

    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: "No matching user found" });
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});




app.get('/api/spinValueUserSet', async (req, res) => {
  try {
    const currentTime = new Date();
    // Set to the start of the current 30-minute interval
    const minutes = currentTime.getMinutes();
    const intervalStart = new Date(currentTime.setMinutes(minutes - (minutes % 30), 0, 0)); // Example: for 9:43, sets to 9:30
    const intervalEnd = new Date(intervalStart.getTime() + 30 * 60 * 1000); // Example: 9:30 to 10:00
    
  const spinValues = await SpinModelUserSet.find({
    timestamp: { $gte: intervalStart, $lt: intervalEnd }
  }).sort({ timestamp: -1 }); // Sort by latest timestamp

  res.json(spinValues);  // Send all records as the response
  } catch (error) {
    res.status(500).send('Error retrieving spin value');
  }
});


app.get('/api/spinValue', async (req, res) => {
  try {
  
  const spinValues = await SpinModel.find()
  res.json(spinValues);  // Send all records as the response
  } catch (error) {
    res.status(500).send('Error retrieving spin value');
  }
});

app.post('/api/spinValue', async (req, res) => {
  const { value, interval } = req.body;

  // Validate the value range
  if (value < 1 || value > 10) {
    return res.status(400).send('Please provide a value between 1 and 10.');
  }

  try {
    // Get the current date in YYYY-MM-DD format
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Start of the current day
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // End of the current day

    // Check if a record exists for the same interval within today's date
    const existingRecord = await SpinModel.findOne({
      interval,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingRecord) {
      return res.status(400).send(`Spin value for interval "${interval}" is already posted today.`);
    }

    // Save the spin value along with the timestamp
    const newSpinValue = new SpinModel({
      value,
      interval,
      timestamp: new Date(),
    });

    await newSpinValue.save();
    console.log(newSpinValue);

    res.status(200).json({ statuscode: 200, message: 'Spin value saved successfully.' });
  } catch (error) {
    res.status(500).send(`Error saving spin value: ${error.message}`);
  }
});




app.post('/api/spinValueUserSet', async (req, res) => {
  const { value,interval } = req.body;

  if (value < 1 || value > 10) {
    return res.status(400).send('Please provide a value between 1 and 10.');
  }

  try {

    const newSpinValue = new SpinModelUserSet({
      value,
      interval,
      timestamp: new Date()
    });
    await newSpinValue.save();
    res.status(200).json(newSpinValue);
  } catch (error) {
    res.status(500).send(`Error saving spin value: ${error}`);
  }
});

// Delete spin value records within the time interval
app.post('/api/deleteSpinValue', async (req, res) => {


  const { startTimestamp, endTimestamp } = req.body;

  try {
    // Convert string timestamps to Date objects
    const start = new Date(startTimestamp);
    const end = new Date(endTimestamp);

    // Delete records within the time interval
    const result = await SpinModelUserSet.deleteMany({
      timestamp: { $gte: start, $lt: end }
    });

    if (result.deletedCount > 0) {
      res.status(200).json({ success: true });
    } else {
      res.status(404).json({ success: false, message: "No records found within the specified time interval." });
    }
  } catch (error) {
    console.error("Error deleting records:", error);
    res.status(500).json({ success: false, message: "Error deleting records." });
  }
});


//make Users
// API to create a new user
app.post('/api/createUser', async (req, res) => {
  const { UserID, Password } = req.body;

  try {
    // Validate input
    if (!UserID || !Password) {
      return res.status(400).json({ success: false, message: "UserID and Password are required" });
    }

    // Check if the UserID already exists
    const existingUser = await LoginModel.findOne({ UserID });
    if (existingUser) {
      return res.status(409).json({ success: false, message: "UserID already exists" });
    }

    // Create a new user
    const newUser = new LoginModel({
      UserID,
      Password
    });

    // Save to the database
    await newUser.save();

    res.status(201).json({ success: true, message: "User created successfully", data: { UserID } });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

app.get('/api/LastTimeValueSpinned', async (req, res) => {
  try {
  
    const currentTime = new Date();
    // Set to the start of the current 30-minute interval
    const minutes = currentTime.getMinutes();
    const intervalStart = new Date(currentTime.setMinutes(minutes - (minutes % 30), 0, 0)); // Example: for 9:43, sets to 9:30
    const intervalEnd = new Date(intervalStart.getTime() + 30 * 60 * 1000); // Example: 9:30 to 10:00
    
 // Fetch the latest spin value within the interval
 const latestSpinValue = await SpinModel.findOne()
 .sort({ timestamp: -1 }) // Sort by timestamp in descending order
 .exec(); // Execute the query
  
    res.json(latestSpinValue)
  } catch (error) {
    res.status(500).send('Error retrieving spin value');
  }
});



// Start the server
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.setTimeout(300000);
