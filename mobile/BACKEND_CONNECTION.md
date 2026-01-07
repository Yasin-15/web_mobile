# Mobile App Backend Connection Guide

## Overview
This guide explains how to connect the Flutter mobile app to the backend API in different scenarios.

## Current Configuration

The mobile app automatically detects the platform and uses the appropriate API URL:

- **Android Emulator**: `http://10.0.2.2:5000/api`
- **iOS Simulator**: `http://localhost:5000/api`
- **Physical Device**: You need to configure your computer's IP address

## Setup Instructions

### 1. For Android Emulator (Default)
The app is already configured to work with Android emulator. Just make sure:
- Backend is running on `http://localhost:5000`
- The emulator can access the host machine

### 2. For iOS Simulator
The app is already configured. Just ensure:
- Backend is running on `http://localhost:5000`

### 3. For Physical Device (Android/iOS)

#### Step 1: Find Your Computer's IP Address

**On Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)

**On macOS/Linux:**
```bash
ifconfig
```
Look for "inet" under your active network adapter

#### Step 2: Update the API Service

Edit `mobile/lib/services/api_service.dart` and update the fallback URL:

```dart
static String get baseUrl {
  if (kIsWeb) {
    return 'http://localhost:5000/api';
  } else if (Platform.isAndroid) {
    return 'http://10.0.2.2:5000/api';
  } else if (Platform.isIOS) {
    return 'http://localhost:5000/api';
  }
  // Replace 192.168.1.100 with your computer's IP address
  return 'http://192.168.1.100:5000/api';
}
```

#### Step 3: Ensure Backend is Accessible

Make sure your backend server is listening on all interfaces (0.0.0.0) not just localhost.

In `backend/src/server.js`, the server should bind to:
```javascript
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
```

#### Step 4: Allow Firewall Access
- On Windows: Allow Node.js through Windows Firewall
- On macOS: System Preferences → Security & Privacy → Firewall → Allow incoming connections for Node

#### Step 5: Ensure Same Network
Make sure your phone and computer are on the same WiFi network.

## Testing the Connection

### 1. Test Backend Availability
From your phone's browser, navigate to:
```
http://YOUR_COMPUTER_IP:5000
```
You should see: `{"message": "School Management System API is running"}`

### 2. Check Mobile App Logs
When running the app, check the console for API request logs:
```
flutter run
```

Look for debug prints like:
```
GET Request: http://10.0.2.2:5000/api/auth/login
POST Response [/auth/login]: 200
```

## API Endpoints Used by Mobile App

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/logout` - User logout

### Dashboard
- `GET /api/students` - Get students count
- `GET /api/timetable/teacher/me` - Get teacher's timetable
- `GET /api/notifications` - Get notifications

### Classes & Students
- `GET /api/classes` - Get all classes
- `GET /api/students?class={classId}` - Get students by class

### Attendance
- `POST /api/attendance/mark` - Mark attendance

## Troubleshooting

### Connection Refused
- Ensure backend is running (`npm run dev` in backend folder)
- Check if backend port is 5000
- Verify firewall settings

### 401 Unauthorized
- Token might be expired or invalid
- Try logging out and logging in again
- Check if backend JWT_SECRET matches

### Network Error
- Verify IP address is correct
- Ensure phone and computer are on same network
- Check if backend is accessible from phone's browser

### CORS Issues
The backend is configured with CORS enabled. If you still face issues, check `backend/src/app.js`:
```javascript
app.use(cors());
```

## Environment-Specific Configuration

### Development
Use the automatic detection (current setup)

### Production
Update the API URL to your production server:
```dart
static String get baseUrl {
  return 'https://your-production-api.com/api';
}
```

## Security Notes

1. **HTTPS**: In production, always use HTTPS
2. **Token Storage**: Tokens are stored securely using `flutter_secure_storage`
3. **API Keys**: Never commit sensitive API keys to version control

## Demo Credentials

For testing, you can create a teacher account through the web frontend or use existing credentials from your database.

Example:
- Email: teacher@school.com
- Password: (as set in your database)

## Support

If you encounter issues:
1. Check the Flutter console for error messages
2. Check the backend console for API errors
3. Verify network connectivity
4. Ensure all dependencies are installed (`flutter pub get`)
