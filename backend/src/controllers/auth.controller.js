const User = require('../models/user.model');
const jwt = require('jsonwebtoken');

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    const { email, password, tenantId } = req.body;

    console.log('Login attempt:', { email, tenantId, hasPassword: !!password });

    if (!email || !password) {
        console.log('Missing email or password');
        return res.status(400).json({ message: 'Please provide email and password' });
    }

    try {
        console.log('Finding user by email:', email);
        // Find user by email (allow global search, but validate tenant context)
        const user = await User.findOne({ email });

        if (!user) {
            console.log('User not found:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('User found:', { id: user._id, email: user.email, role: user.role });

        // Check if user belongs to the requested tenant
        // Super Admins can access any tenant (conceptually) or have no tenantId
        if (tenantId && user.role !== 'super-admin' && user.tenantId !== tenantId) {
            console.log('Tenant mismatch:', { userTenant: user.tenantId, requestedTenant: tenantId });
            return res.status(403).json({ message: 'You are not registered in this school.' });
        }

        console.log('Checking password...');
        // Check password
        const isMatch = await user.matchPassword(password);
        console.log('Password match result:', isMatch);

        if (!isMatch) {
            console.log('Password mismatch for user:', email);
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        console.log('Generating JWT token...');
        // Sign Token
        const payload = {
            id: user._id,
            role: user.role,
            tenantId: user.tenantId // Embed tenant ID in token for middleware to use
        };

        const jwtSecret = process.env.JWT_SECRET || 'secret';
        console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);

        const token = jwt.sign(payload, jwtSecret, { expiresIn: '1d' });

        console.log('Login successful for user:', email);
        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                profile: user.profile
            }
        });

    } catch (error) {
        console.error('Login error - FULL DETAILS:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            email: email,
            tenantId: tenantId
        });
        res.status(500).json({
            message: 'Server Error during login',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
    try {
        const { firstName, lastName, phone, address } = req.body;
        const user = await User.findById(req.user.id);

        if (firstName) user.firstName = firstName;
        if (lastName) user.lastName = lastName;
        if (phone) user.profile.phone = phone;
        if (address) user.profile.address = address;

        await user.save();

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
exports.changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const user = await User.findById(req.user.id);

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ message: 'Incorrect current password' });
        }

        user.password = newPassword;
        user.password_plain = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
};
