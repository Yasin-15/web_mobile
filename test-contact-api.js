// Test script for Contact Form API
// Run this with: node test-contact-api.js

const BASE_URL = 'http://localhost:5000';

// Test 1: Submit a contact message (public endpoint)
async function testSubmitMessage() {
    console.log('\n🧪 Test 1: Submit Contact Message (Public Endpoint)');
    console.log('='.repeat(60));

    const testMessage = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        institution: 'Test University',
        message: 'This is a test message from the contact form.'
    };

    try {
        const response = await fetch(`${BASE_URL}/api/contact-messages`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testMessage),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCCESS: Message submitted successfully');
            console.log('Response:', JSON.stringify(data, null, 2));
            return data.data._id; // Return the message ID for further tests
        } else {
            console.log('❌ FAILED: Status', response.status);
            console.log('Error:', data);
            return null;
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
        return null;
    }
}

// Test 2: Get contact messages (requires super-admin token)
async function testGetMessages(token) {
    console.log('\n🧪 Test 2: Get Contact Messages (Super-Admin Only)');
    console.log('='.repeat(60));

    if (!token) {
        console.log('⚠️  SKIPPED: No token provided. Login as super-admin first.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/contact-messages`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCCESS: Retrieved messages');
            console.log(`Total messages: ${data.messages.length}`);
            console.log('First message:', JSON.stringify(data.messages[0], null, 2));
        } else {
            console.log('❌ FAILED: Status', response.status);
            console.log('Error:', data);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

// Test 3: Get statistics (requires super-admin token)
async function testGetStats(token) {
    console.log('\n🧪 Test 3: Get Contact Message Statistics');
    console.log('='.repeat(60));

    if (!token) {
        console.log('⚠️  SKIPPED: No token provided. Login as super-admin first.');
        return;
    }

    try {
        const response = await fetch(`${BASE_URL}/api/contact-messages/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (response.ok) {
            console.log('✅ SUCCESS: Retrieved statistics');
            console.log('Stats:', JSON.stringify(data, null, 2));
        } else {
            console.log('❌ FAILED: Status', response.status);
            console.log('Error:', data);
        }
    } catch (error) {
        console.log('❌ ERROR:', error.message);
    }
}

// Main test runner
async function runTests() {
    console.log('\n🚀 Starting Contact Form API Tests');
    console.log('='.repeat(60));
    console.log('Backend URL:', BASE_URL);

    // Test 1: Submit message (public)
    const messageId = await testSubmitMessage();

    // For tests 2 and 3, you need a super-admin token
    // You can get this by logging in as super-admin in the frontend
    // and copying the token from localStorage
    const SUPER_ADMIN_TOKEN = process.env.SUPER_ADMIN_TOKEN || null;

    if (SUPER_ADMIN_TOKEN) {
        await testGetMessages(SUPER_ADMIN_TOKEN);
        await testGetStats(SUPER_ADMIN_TOKEN);
    } else {
        console.log('\n⚠️  To test super-admin endpoints:');
        console.log('1. Login as super-admin in the frontend');
        console.log('2. Open browser console and run: localStorage.getItem("token")');
        console.log('3. Set the token: SUPER_ADMIN_TOKEN=your_token node test-contact-api.js');
    }

    console.log('\n✨ Tests completed!');
    console.log('='.repeat(60));
}

// Run the tests
runTests();
