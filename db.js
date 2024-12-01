const mongoose = require("mongoose");
// require("dotenv").config();

// Access your MongoDB connection string from secrets
//const mongoURI = process.env.MONGODB_URI;
const mongoURI = process.env.MONGODB_URI;

const initializeDatabase = async () => {
  try {
    // const connection = await mongoose.connect(mongoURI);
    const connection = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    if (connection) {
      console.log("connected succesfully");
    }
  } catch (error) {
    console.log("connection failed", error);
  }
};

module.exports = { initializeDatabase };
