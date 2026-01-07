const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');

dotenv.config({ path: __dirname + '/../../.env' });

const seedSuperAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected...');

        const superAdminEmail = 'yasindev54@gmail.com';
        const existingAdmin = await User.findOne({ email: superAdminEmail });

        if (existingAdmin) {
            console.log('Super Admin already exists.');
            process.exit();
        }

        // Create a default tenant or null for super admin context if needed?
        // Usually Super Admin is platform level, no specific tenantId needed 
        // or 'platform' as tenantId.

        await User.create({
            firstName: 'Yasin',
            lastName: 'Dev',
            email: superAdminEmail,
            password: 'Yaasiin@2027', // Change this in production
            role: 'super-admin',
            tenantId: 'platform', // Special identifier
            status: 'active'
        });

        console.log('Super Admin Created:');
        console.log('Email: yasindev54@gmail.com');
        console.log('Password: Yaasiin@2027');

        process.exit();
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

seedSuperAdmin();
