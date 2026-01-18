# Smart Attendance Hub

A modern, comprehensive attendance management system designed for educational institutions. Streamline your attendance tracking, reporting, and student management with ease.

## 🚀 Features

- **Multi-role Support**: Dedicated dashboards for Admins, Teachers, and Students.
- **Real-time Tracking**: Mark and monitor attendance in real-time.
- **Comprehensive Reports**: Generate detailed attendance reports for classes, subjects, and individual students.
- **User Management**: Efficiently manage students, teachers, classes, and subjects.
- **Secure Authentication**: Robust authentication system with role-based access control.
- **Responsive Design**: Fully optimized for both desktop and mobile devices.

## 🛠️ Tech Stack

- **Frontend**: React, Vite, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **Database & Auth**: Supabase
- **Icons**: Lucide React
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form, Zod

## 🏁 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/DavidManiIbrahim/smart-attendance-hub.git
   cd smart-attendance-hub
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## 📂 Project Structure

- `src/components`: Reusable UI components and feature-specific components.
- `src/contexts`: React contexts for global state management (e.g., Auth).
- `src/hooks`: Custom React hooks.
- `src/pages`: Main application pages and routes.
- `src/integrations`: Supabase and other third-party integrations.

## 📄 License

This project is licensed under the MIT License.
