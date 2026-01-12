const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';
        if (!uri) {
            throw new Error('MONGO_URI is not defined in environment variables');
        }
        const conn = await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`MongoDB Connection Error: ${error.message}`);
        if (error.message.includes('authentication failed')) {
            console.error('Please check your MONGO_URI credentials in the .env file.');
        }
        process.exit(1);
    }
};

module.exports = connectDB;
