const mongoose = require('mongoose');
 
const dbName = 'spank-me-botty'
// let url = (process.env.NODE_ENV === 'production') ? `${process.env.DATABASE_URL}${dbName}?retryWrites=true&w=majority` : `mongodb://localhost:27017/${dbName}`;
let url = `${process.env.DATABASE_URL}${dbName}?retryWrites=true&w=majority`;

console.log("MongoDB URL: " + url);

mongoose.connect(url, { 
  serverSelectionTimeoutMS: 5000,
});

let db = mongoose.connection;

db.once('open', () => console.log('Connected to the database'));

// checks if connection with the database is successful
db.on('error', console.error.bind(console, 'MongoDB connection error:'));