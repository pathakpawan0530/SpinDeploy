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
  console.log(UserSetValue)
  const apiEndpoint = `http://localhost:${port}/api/spinValue`; // Adjust as needed
  const localTime = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true, // Ensures AM/PM format
    timeZone: 'Asia/Kolkata', // Replace with your local timezone if needed
  });

  const payload = {
    value: UserSetValue!=0 ? UserSetValue: Math.floor(Math.random() * 10) + 1, // Random value between 1 and 10
    interval: localTime, // HH:MM AM/PM format
  };

  try {
    const response = await axios.post(apiEndpoint, payload);
    console.log(`API Response at ${localTime} ${port}:`, response.data);
  } catch (error) {
    console.error(`Error calling API at ${localTime}:`, error.message);
  }
}


function runAtInterval() {
  const currentTime = new Date();
  const minutes = currentTime.getMinutes();
  const targetTimes = [0,30,20,40,50]; // Define target times

  if (targetTimes.includes(minutes)) {
    console.log(`API called at ${currentTime.toLocaleTimeString()}`);
    // Call the API
    fetchSpinValueFromApi();
  }
}


async function fetchSpinValueFromApi() {
  try {
    const apiEndpoint = `http://localhost:${port}/api/spinValueUserSet`; // Adjust as needed
    var response = await axios.get(apiEndpoint);
    var spinValues = response.data; // ✅ Correct way to get JSON from axios response

    if (spinValues && spinValues.length > 0) {

      const latestSpin = spinValues[0]; // The most recent spin value
      const spinValue = latestSpin.value;
      console.log(spinValue)
      RunInBackend(spinValue);
    } else {
      RunInBackend(0);
    }
  } catch (error) {
    console.error('Error fetching spin value:', error);
    RunInBackend(0);


  }
}


// Function to align the next interval at a real-time 30-minute mark
function alignToRealTime() {
  const now = new Date();
    const secondsUntilNextMinute = 60 - now.getSeconds(); // Calculate seconds to align with the next minute
  
    // Align to the next minute
    setTimeout(() => {
      setInterval(runAtInterval, 60000); // Start interval after alignment
    }, secondsUntilNextMinute * 1000);
  }
// Start the process
alignToRealTime();



// Start the server
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

server.setTimeout(300000);
