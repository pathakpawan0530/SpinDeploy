const mongoose = require('mongoose');

// Define the schema to include value and timestamp
const spinSchema = new mongoose.Schema({
  value: { type: Number, required: true },
  interval: {type:String, required: true,unique:true},
  timestamp: { type: Date, default: Date.now }
});



const loginModel = new mongoose.Schema({
  UserID: { type: String, required: true, unique: true },
  Password: { type: String, required: true, unique: true },
  timestamp: { type: Date, default: Date.now }
});


// Define the schema for user-set spin value
const spinSchemaUserSet = new mongoose.Schema({
  value: { type: Number, required: true },
  interval: {type:String, required: true},
  timestamp: { type: Date, default: Date.now }
});

// Create separate models for both schemas
const SpinModel = mongoose.model('SpinModel', spinSchema);
const SpinModelUserSet = mongoose.model('SpinModelUserSet', spinSchemaUserSet);
const LoginModel = mongoose.model('loginModel', loginModel);

// Export both models
module.exports = { SpinModel, SpinModelUserSet,LoginModel };