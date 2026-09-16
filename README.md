# Exam Management and Information Portal

A modern, standalone React frontend for an institutional **Exam Management and Information Portal**, inspired by the Enlight academic design language.

> **Note**: This application is strictly an **informational and scheduling portal** (exam dates, halls, seat allocations, official instructions, grade results, notifications, student dossiers). It deliberately contains no online test-taking, question banks, or timed attempt engines.

---

## 🎨 Visual Design & Design System

The visual language follows the **Enlight** educational dashboard reference specification:
- **Primary Color:** Indigo / Purple (`#6C5DD3`) with soft lavender tint backgrounds (`#EFEBFC`)
- **Secondary Accent:** Coral-Pink (`#FF6B81` / `#F45B69`) for comparison lines and alerts
- **Surface Canvas:** Soft lavender-gray (`#F5F5FA`) with pure white elevated surface cards (`#FFFFFF`)
- **Geometry:** Rounded 12px–16px card radii, full pill buttons, circular avatars
- **Hierarchy:** High-density yet calm information architecture with 1 bold metric per card
- **Responsive Layout:** 3-column / 2-column desktop shell (Sidebar + Main Column + Right Schedule Rail), collapsible to icon rail on tablet, and off-canvas drawer on mobile.

---

## 🚀 Quick Start

This project is 100% standalone and does not require an active backend to run:

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev
```

The portal runs on **`http://localhost:4890`** (or your configured Vite host).

---

## 🔑 Demo Accounts & Credentials

One-click demo buttons are provided on the login page, or you can enter credentials manually:

### 1. Student Account
- **Email:** `student@example.com`
- **Password:** `password123`
- **Redirects to:** `/dashboard`
- **Features:** View upcoming exam schedules, next exam countdown, GPA & cohort comparison charts, official grade transcripts, downloadable certificates, notification center, personal profile editing.

### 2. Administrator Account
- **Email:** `admin@example.com`
- **Password:** `admin123`
- **Redirects to:** `/admin/dashboard`
- **Features:** Candidate directory (search, filter, dossier, status toggle), exam scheduler (create/edit/delete timetables, venue and invigilator assignment), results manager (record marks, publish/unpublish transcripts), circular notices broadcaster, audit activity log.

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── common/              # Reusable UI primitives
│   │   ├── Avatar.jsx       # Avatar with fallback initials & status dot
│   │   ├── Button.jsx       # Primary, secondary, outline, ghost, danger
│   │   ├── Card.jsx         # Elevated panel with titles & actions
│   │   ├── ConfirmDialog.jsx# Modal confirmation for destructive actions
│   │   ├── DataTable.jsx    # Responsive tables with loading & empty states
│   │   ├── Dropdown.jsx     # Floating menu trigger
│   │   ├── EmptyState.jsx   # Clean empty state cards
│   │   ├── FormField.jsx    # Form label, error, and helper wrapper
│   │   ├── Input.jsx        # Text, email, password with icons
│   │   ├── LoadingState.jsx # Shimmer & spinners
│   │   ├── Modal.jsx        # Accessible dialog with ESC & outside click
│   │   ├── PageHeader.jsx   # Consistent page breadcrumb & heading
│   │   ├── Pagination.jsx   # Numbered pagination controls
│   │   ├── SearchBar.jsx    # Pill-shaped search bar with clear button
│   │   ├── Select.jsx       # Custom styled select
│   │   ├── Skeleton.jsx     # Pulse shimmer placeholder
│   │   ├── StatCard.jsx     # Enlight metric card with delta pills
│   │   ├── StatusBadge.jsx  # Soft tinted pill badges
│   │   ├── Tabs.jsx         # Pill and underline tab bars
│   │   ├── Textarea.jsx     # Resizable text areas
│   │   └── Toast.jsx        # Toast notification system
│   ├── dashboard/           # SVG trend chart & right rail schedule
│   │   ├── AdminTrendChart.jsx
│   │   ├── PerformanceChart.jsx
│   │   └── ScheduleRightRail.jsx
│   ├── layout/              # Sidebar & Topbar
│   │   ├── Sidebar.jsx
│   │   └── Topbar.jsx
│   └── notifications/       # Enlight-styled floating popover
│       ├── NotificationItem.jsx
│       └── NotificationPanel.jsx
├── context/
│   └── AuthContext.jsx      # Session management & role protection
├── data/
│   └── mockData.js          # Initial academic database
├── layouts/
│   ├── AdminLayout.jsx
│   ├── AuthLayout.jsx
│   └── StudentLayout.jsx
├── pages/
│   ├── NotFound.jsx
│   ├── auth/
│   │   ├── LoginPage.jsx
│   │   └── RegisterPage.jsx
│   ├── student/
│   │   ├── StudentDashboard.jsx
│   │   ├── StudentExams.jsx
│   │   ├── StudentExamDetail.jsx
│   │   ├── StudentResults.jsx
│   │   ├── StudentResultDetail.jsx
│   │   ├── StudentNotifications.jsx
│   │   └── StudentProfile.jsx
│   └── admin/
│       ├── AdminDashboard.jsx
│       ├── AdminStudents.jsx
│       ├── AdminStudentDetail.jsx
│       ├── AdminExams.jsx
│       ├── AdminExamDetail.jsx
│       ├── AdminResults.jsx
│       ├── AdminResultDetail.jsx
│       ├── AdminAnnouncements.jsx
│       ├── AdminAnnouncementDetail.jsx
│       └── AdminProfile.jsx
├── routes/
│   ├── AppRoutes.jsx        # Complete route table
│   └── RouteGuards.jsx      # Role & session protection
├── services/                # Centralized Service Layer
│   ├── activityService.js
│   ├── announcementService.js
│   ├── api.js               # Central API client & storage abstraction
│   ├── authService.js
│   ├── dashboardService.js
│   ├── examService.js
│   ├── notificationService.js
│   ├── profileService.js
│   ├── resultService.js
│   └── studentService.js
├── index.css                # Centralized CSS variables & base reset
├── App.jsx
└── main.jsx
```

---

## 🔌 Connecting to a Real Backend API

Every page in this application is completely decoupled from mock data and consumes the centralized service layer under `src/services/`.

To connect this frontend to your real backend:

1. Open `src/services/api.js`:
   ```javascript
   // Set your backend base URL
   export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

   // Replace getStoredItem / setStoredItem with standard fetch calls:
   export const apiClient = async (endpoint, options = {}) => {
     const token = localStorage.getItem('auth_token');
     const response = await fetch(`${API_BASE_URL}${endpoint}`, {
       ...options,
       headers: {
         'Content-Type': 'application/json',
         ...(token ? { Authorization: `Bearer ${token}` } : {}),
         ...options.headers,
       },
     });
     if (!response.ok) {
       const errorData = await response.json().catch(() => ({}));
       throw new Error(errorData.message || `Request failed with status ${response.status}`);
     }
     return response.json();
   };
   ```

2. Replace the simulated methods in each service file (`src/services/examService.js`, `src/services/resultService.js`, etc.) with `apiClient('/exams')`, `apiClient('/results')`, etc. The page components require zero modifications because they already consume standardized `{ data, message }` responses.

---

## 🛠 Tech Stack

- **React 19**
- **Vite**
- **React Router v7**
- **Lucide React** (consistent stroke iconography)
- **Pure CSS with Design Tokens** (no heavy external component frameworks)
