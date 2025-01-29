const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const {SpinModel,SpinModelUserSet,LoginModel} = require("./model/SpinModel");
const connectDB = require("./db/connection");
const axios = require('axios');

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
    
  var spinValues = await SpinModelUserSet.find({
    timestamp: { $gte: intervalStart, $lt: intervalEnd }
  }).sort({ timestamp: -1 }); // Sort by latest timestamp
  if(spinValues.length>0){
    res.json(spinValues);  // Send all records as the response

  }else{
    spinValues=[];
    res.json(spinValues);  // Send all records as the response

  }
  } catch (error) {
    res.status(500).send({message:'Error while fetching.'});
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
    return res.status(400).send({
      error: 'Please provide a value between 1 and 10..'
    });
  }

  const intervalRegex = /^\d{1,2}:(00|10|20|30|40|50)\s(?:AM|PM)$/;
  if (!intervalRegex.test(interval)) {
    return res.status(400).json({
      error: 'Interval must be in HH:MM AM/PM format with MM as 00, 10, 20, 30, 40, or 50.'
    });  }

  try {
    // Get the current date in YYYY-MM-DD format
    const today = new Date();
    
    // Create new instances to avoid mutating the 'today' object
    const startOfDay = new Date(today.setHours(0, 0, 0, 0)); // Start of the current day
    const endOfDay = new Date(today.setHours(23, 59, 59, 999)); // End of the current day
    
    // Reset the today object to prevent mutation in future use
    today.setHours(12, 0, 0, 0);

 

    // Check if a record exists for the same interval within today's date
    const existingRecord = await SpinModel.findOne({
      interval,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    if (existingRecord) {
      return res.status(400).json({
        error: `Spin value for interval "${interval}" is already posted today.`
      });
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
    return res.status(400).send({message:'Please provide a value between 1 and 10.'});
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
    res.status(500).send({message:`Error saving spin value: ${error}`});
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
// ----Cron

// Function to call the API
async function RunInBackend(UserSetValue) {
  console.log(UserSetValue);
  const apiEndpoint = `http://localhost:${port}/api/spinValue`;
  
  // Get current time in UTC
  const now = new Date();
  
  // Convert UTC to IST (Asia/Kolkata)
  const options = { timeZone: "Asia/Kolkata", hour12: true, hour: "2-digit", minute: "2-digit" };
  const localTime = now.toLocaleTimeString("en-US", options);
  
  // Get today's date in YYYY-MM-DD format (IST)
  const todayDate = now.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

  try {
    // Fetch existing records from DB
    const checkExisting = await axios.get(`http://localhost:${port}/api/spinValue`);
    
    // Check if a record with the same date and interval exists
    const existingSpin = checkExisting.data.find(spin => {
      const spinDate = new Date(spin.timestamp)
        .toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // Convert DB timestamp (UTC) to IST date

      return spin.interval === localTime && spinDate === todayDate;
    });

    if (existingSpin) {
      console.log(`Skipping duplicate spin value for interval ${localTime} on ${todayDate}`);
      return; // Stop execution if duplicate found
    }

    // Create payload
    const payload = {
      value: UserSetValue !== 0 ? UserSetValue : Math.floor(Math.random() * 10) + 1,
      interval: localTime,  // HH:MM AM/PM format
      timestamp: now.toISOString(), // Store original UTC timestamp
    };

    const response = await axios.post(apiEndpoint, payload);
    console.log(`API Response at ${localTime} ${port}:`, response.data);
  } catch (error) {
    if (error.response) {
      console.error(`Error calling API at ${localTime} ${port}:`, error.response.status, error.response.data);
    } else if (error.request) {
      console.error(`Error calling API at ${localTime} ${port}: No response received`);
    } else {
      console.error(`Error calling API at ${localTime} ${port}:`, error.message);
    }
  }
}


function runAtInterval() {
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();
  const targetTimes = [0,30,10,40,50,20]; // Define target times

  if (targetTimes.includes(minutes) && lastExecutedMinute !== minutes) {
    lastExecutedMinute = minutes; // Update last executed time
    console.log(`API called at ${currentTime.toLocaleTimeString()}`);
    
    // Call the API
    fetchSpinValueFromApi();
}


let isRunning = false; // Flag to prevent concurrent execution

async function fetchSpinValueFromApi() {
  if (isRunning) return; // Prevent running multiple times at the same time
  isRunning = true;

  try {
    const apiEndpoint = `http://localhost:${port}/api/spinValueUserSet`;
    const response = await axios.get(apiEndpoint);
    const spinValues = response.data;

    if (spinValues && spinValues.length > 0) {
      const latestSpin = spinValues[0]; // Most recent spin value
      const spinValue = latestSpin.value;
      console.log(spinValue);
      await RunInBackend(spinValue);
    } else {
      await RunInBackend(0);
    }
  } catch (error) {
    console.error('Error fetching spin value:', error);
    await RunInBackend(0);
  } finally {
    isRunning = false; // Reset flag after execution
  }
}


let intervalStarted = false; // Prevent multiple intervals

function alignToRealTime() {
  if (intervalStarted) return; // Ensure only one interval is created
  intervalStarted = true;

  const now = new Date();
  const secondsUntilNextMinute = 60 - now.getSeconds();

  setTimeout(() => {
    setInterval(runAtInterval, 60000);
  }, secondsUntilNextMinute * 1000);
}

alignToRealTime(); // Call it only once




// Start the server
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.setTimeout(300000);
