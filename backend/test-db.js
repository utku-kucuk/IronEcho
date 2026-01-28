console.log("Node test script running");
const mongoose = require('mongoose');
console.log("Mongoose required");
require('dotenv').config();
console.log("Dotenv loaded, URI:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ironecho')
.then(() => {
    console.log("Connected to MongoDB from test script");
    process.exit(0);
})
.catch(err => {
    console.error("Failed to connect:", err);
    process.exit(1);
});
