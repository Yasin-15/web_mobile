# Contact Form - Quick Start Guide

## 🎯 For Website Visitors

### Submitting a Contact Form

1. **Navigate to the Contact Page**
   - Go to: `http://localhost:3000/contact`
   - Or click "Contact" in the navigation menu

2. **Fill Out the Form**
   - **First Name** (required)
   - **Last Name** (required)
   - **Email** (required) - Must be a valid email
   - **Institution** (optional) - Your school/organization
   - **Message** (required) - Your inquiry or message

3. **Submit**
   - Click "Send Message" button
   - Wait for confirmation message
   - Form will reset automatically after successful submission

4. **Success/Error Messages**
   - ✅ Green message: "Thank you for contacting us! We will get back to you soon."
   - ❌ Red message: Error details if submission fails

---

## 👨‍💼 For Super-Admin Users

### Accessing the Contact Messages Dashboard

1. **Login as Super-Admin**
   - Go to: `http://localhost:3000/login`
   - Use super-admin credentials
   - Role must be: `super-admin`

2. **Navigate to Contact Messages**
   - Look in the left sidebar
   - Click on "Contact Messages" (with message icon)
   - Or go directly to: `http://localhost:3000/dashboard/contact-messages`

### Dashboard Overview

#### Statistics Cards (Top Section)
- **Total Messages**: All messages ever received
- **New**: Unread messages (blue)
- **Read**: Messages that have been viewed (yellow)
- **Replied**: Messages with admin responses (green)
- **Today**: Messages received today (purple)

#### Filter Tabs
- Click on tabs to filter messages by status:
  - All
  - New
  - Read
  - Replied
  - Archived

#### Messages Table
Displays all messages with:
- **From**: Sender name and email
- **Institution**: Organization (if provided)
- **Message Preview**: First line of the message
- **Status**: Current status badge (color-coded)
- **Date**: When the message was received
- **Actions**: View and Delete buttons

### Managing Messages

#### Viewing a Message
1. Click **"View"** button on any message
2. Modal opens with full details:
   - Sender information
   - Institution
   - Complete message
   - Received date/time
   - Current status

#### Changing Status
1. Open a message (click View)
2. In the modal, click one of the status buttons:
   - **New**: Mark as unread
   - **Read**: Mark as read (happens automatically when viewing)
   - **Replied**: Mark as replied (use when you've responded)
   - **Archived**: Archive the message
3. Status updates immediately

#### Adding a Reply/Note
1. Open a message
2. Scroll to "Reply" section
3. Type your response or internal notes
4. Click **"Save Reply"**
5. Reply is saved with your name and timestamp
6. Status automatically changes to "Replied"

#### Deleting a Message
1. Click **"Delete"** button in the table
2. Confirm deletion in the popup
3. Message is permanently removed

### Tips for Super-Admins

✅ **Best Practices:**
- Check "New" messages daily
- Add replies/notes for record-keeping
- Archive old messages to keep dashboard clean
- Use status changes to track workflow

⚠️ **Important Notes:**
- Only super-admin role can access this dashboard
- Deleting messages is permanent (no undo)
- Replies are for internal notes only (not sent to visitor)
- Messages auto-mark as "Read" when you view them

---

## 🔧 Technical Details

### API Endpoints Used

**Public (No Auth):**
- `POST /api/contact-messages` - Submit form

**Super-Admin Only:**
- `GET /api/contact-messages` - List messages
- `GET /api/contact-messages/stats` - Get statistics
- `GET /api/contact-messages/:id` - View message
- `PATCH /api/contact-messages/:id` - Update status/reply
- `DELETE /api/contact-messages/:id` - Delete message

### Status Flow
```
New → Read → Replied → Archived
 ↓      ↓       ↓         ↓
(Can change to any status at any time)
```

### Message Statuses Explained

| Status | Color | Meaning |
|--------|-------|---------|
| **New** | Blue | Just received, not viewed yet |
| **Read** | Yellow | Viewed but no action taken |
| **Replied** | Green | Admin has responded/added notes |
| **Archived** | Gray | Completed/no longer active |

---

## 🐛 Troubleshooting

### Contact Form Issues

**Problem:** Form won't submit
- ✅ Check all required fields are filled
- ✅ Verify email format is valid
- ✅ Check backend server is running (port 5000)
- ✅ Check browser console for errors

**Problem:** No success message
- ✅ Check network tab in browser dev tools
- ✅ Verify backend API is responding
- ✅ Check CORS settings

### Dashboard Issues

**Problem:** Can't access dashboard
- ✅ Verify you're logged in as super-admin
- ✅ Check role in localStorage: `localStorage.getItem('user')`
- ✅ Try logging out and back in

**Problem:** Messages not loading
- ✅ Check authentication token is valid
- ✅ Verify backend is running
- ✅ Check browser console for errors
- ✅ Try refreshing the page

**Problem:** Can't update status
- ✅ Verify you have super-admin role
- ✅ Check network requests in dev tools
- ✅ Ensure message ID is valid

---

## 📞 Support

If you encounter any issues:
1. Check the browser console for errors
2. Check the backend terminal for error logs
3. Verify both servers are running:
   - Backend: `http://localhost:5000`
   - Frontend: `http://localhost:3000`
4. Review the `CONTACT_FORM_FEATURE.md` for technical details

---

**Last Updated:** January 3, 2026
**Version:** 1.0.0
