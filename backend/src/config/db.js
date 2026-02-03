const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI ? process.env.MONGO_URI.trim() : '';

        if (!uri) {
            console.error('CRITICAL: MONGO_URI is not defined in environment variables!');
            process.exit(1);
        }

        console.log('Attempting to connect to MongoDB...');
        const conn = await mongoose.connect(uri, {
            // These options help with stability and faster failure reporting
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        console.log(` MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(` MongoDB Connection Error: ${error.message}`);
        if (error.reason) console.error('Reason:', error.reason);

        if (error.message.includes('authentication failed')) {
            console.error('Please check your MONGO_URI credentials in the Render environment variables.');
        }

        // On Render/Production, it's often better to exit so the platform can restart the service
        process.exit(1);
    }
};

// Monitor connection events
mongoose.connection.on('error', err => {
    console.error(`MongoDB runtime error: ${err}`);
});

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
});

module.exports = connectDB;
