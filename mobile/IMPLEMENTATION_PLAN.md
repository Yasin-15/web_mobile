# Mobile App Implementation Plan

## 1. Foundation & Architecture
- [ ] **Dependencies**: Add `hive`, `hive_flutter` (local db), `connectivity_plus` (network status), `dio` (optional replacement for http for better interceptors, but can stick to http if preferred), `uuid` (for offline IDs).
- [ ] **Service Layer**:
    - [ ] Update `ApiService` to handle network connectivity checks.
    - [ ] Implement `OfflineService` or `SyncService` to queue requests when offline.
    - [ ] Implement `StorageService` using Hive for caching User, Classes, Assignments, etc.
- [ ] **Authentication**:
    - [ ] Enhance `AuthProvider` to support **Auto-Login** from local storage even when offline.
    - [ ] Implement **Biometric Login** (using `local_auth` package).
    - [ ] Handle **Token Refresh** logic (interceptor in ApiService).

## 2. Shared Features
- [ ] **Profile & Settings**:
    - [ ] Create `ProfileScreen` with edit capabilities.
    - [ ] Add Settings (Theme toggle, Language, Notification prefs).
- [ ] **Notifications**:
    - [ ] Integrate Firebase Messaging (placeholder for now or actual setup if credentials provided).
    - [ ] UI for Notification Center.

## 3. Teacher Module
- [ ] **Dashboard**:
    - [ ] Enhance `DashboardScreen` with widgets: Today's classes, Pending actions.
- [ ] **Attendance**:
    - [ ] Update `AttendanceScreen` for offline support (save locally -> sync later).
    - [ ] Add "Bulk Mark" feature.
- [ ] **Assignments**:
    - [ ] Create `AssignmentListScreen`.
    - [ ] Create `CreateAssignmentScreen` (with file picker).
    - [ ] Create `SubmissionViewScreen` for grading.
- [ ] **Exams**:
    - [ ] Create `ExamScheduleScreen`.
    - [ ] Create `MarksEntryScreen`.

## 4. Student Module
- [ ] **Dashboard**:
    - [ ] Enhance `StudentDashboardScreen` (Attendance stats, upcoming classes).
- [ ] **Timetable**:
    - [ ] Create `TimetableScreen` (Daily/Weekly tabs).
- [ ] **Attendance**:
    - [ ] Create `StudentAttendanceScreen` (View history).
- [ ] **Assignments**:
    - [ ] Create `StudentAssignmentListScreen`.
    - [ ] Create `AssignmentDetailScreen` (Submit work, upload files).
- [ ] **Results**:
    - [ ] Create `ResultsScreen` (View marks, download reports).

## 5. UI/UX Polish
- [ ] **Design System**: Ensure "Premium Dark Mode" is consistent.
- [ ] **Animations**: Add hero animations and smooth transitions.
- [ ] **Error Handling**: Friendly error messages and "Retry" buttons.

---

## Next Steps
1.  Install necessary dependencies.
2.  Set up Hive for local storage.
3.  Refactor `ApiService` for offline readiness.
