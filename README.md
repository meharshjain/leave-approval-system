# Leave Management System

A comprehensive MERN stack application for managing employee leave requests with a structured approval workflow, multiple user roles, and email notifications.

## Features

### Core Features
- **Multiple User Roles**: Employee, Manager, Coordinator, and Admin
- **Department-based Organization**: Users organized by departments with coordinators
- **Leave Request System**: Employees can submit leave requests with different types
- **Structured Approval Flow**: Manager and Coordinator approval workflow
- **Academic Year Management**: Leave records organized by academic year
- **Email Notifications**: Automated email notifications for all stakeholders
- **Leave Balance Tracking**: Track remaining leave days by type and academic year

### User Roles & Permissions

#### Employee
- Submit leave requests
- View own leave history and balance
- Update personal profile

#### Manager
- Approve/reject leave requests from team members
- View team leave records
- Manage team members

#### Coordinator
- Approve/reject leave requests from department
- View department leave records
- Manage department users

#### Admin
- Full system access
- User management
- Department management
- System configuration

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Nodemailer** for email notifications
- **bcryptjs** for password hashing

### Frontend
- **React** with TypeScript
- **Material-UI** for UI components
- **React Router** for navigation
- **React Hook Form** with Yup validation
- **Axios** for API calls

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (local or cloud)
- Email service credentials (Gmail recommended)

### Backend Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp env.example .env
   ```
   
   Update `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/leave-approval-system
   JWT_SECRET=your_jwt_secret_key_here
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   NODE_ENV=development
   ```

3. **Start the server**
   ```bash
   npm run dev
   ```

### Frontend Setup

1. **Navigate to client directory**
   ```bash
   cd client
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Leave Management
- `POST /api/leave/request` - Submit leave request
- `GET /api/leave/my-requests` - Get user's leave requests
- `GET /api/leave/pending-approvals` - Get pending approvals
- `PUT /api/leave/approve/:id` - Approve/reject leave request
- `GET /api/leave/balance` - Get leave balance
- `GET /api/leave/records/:academicYear` - Get leave records
- `PUT /api/leave/cancel/:id` - Cancel leave request

### User Management
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate user
- `GET /api/users/managers` - Get all managers

### Department Management
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Deactivate department

## Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  employeeId: String (unique),
  department: ObjectId (ref: Department),
  role: String (enum: employee, manager, coordinator, admin),
  manager: ObjectId (ref: User),
  isActive: Boolean,
  phone: String,
  position: String
}
```

### LeaveRequest Model
```javascript
{
  employee: ObjectId (ref: User),
  leaveType: String (enum: sick, vacation, personal, etc.),
  startDate: Date,
  endDate: Date,
  totalDays: Number,
  reason: String,
  status: String (enum: pending, approved, rejected, cancelled),
  academicYear: String,
  managerApproval: {
    status: String,
    approvedBy: ObjectId,
    approvedAt: Date,
    comments: String
  },
  coordinatorApproval: {
    status: String,
    approvedBy: ObjectId,
    approvedAt: Date,
    comments: String
  }
}
```

### Department Model
```javascript
{
  name: String (unique),
  description: String,
  coordinator: ObjectId (ref: User),
  isActive: Boolean
}
```

### LeaveBalance Model
```javascript
{
  employee: ObjectId (ref: User),
  academicYear: String,
  leaveType: String,
  totalAllocated: Number,
  used: Number,
  remaining: Number
}
```

## Email Notifications

The system sends automated email notifications for:

1. **New Leave Request**: Notifies manager when employee submits request
2. **Leave Approval/Rejection**: Notifies employee of decision
3. **Welcome Email**: Sent to new users upon registration

### Email Configuration
- Uses Nodemailer with SMTP
- Supports Gmail, Outlook, and other SMTP providers
- HTML email templates with responsive design

## Usage Guide

### For Employees
1. **Login** with your credentials
2. **Submit Leave Request**:
   - Select leave type
   - Choose start and end dates
   - Provide reason
   - Submit for approval
3. **Track Status**: View pending, approved, and rejected requests
4. **Check Balance**: Monitor remaining leave days

### For Managers
1. **Review Requests**: View pending leave requests from team members
2. **Approve/Reject**: Make decisions with optional comments
3. **Team Overview**: Monitor team leave patterns and balances

### For Coordinators
1. **Department Oversight**: Manage department-wide leave requests
2. **Final Approval**: Provide coordinator-level approval
3. **Department Analytics**: View department leave statistics

### For Admins
1. **User Management**: Create, update, and manage users
2. **Department Setup**: Configure departments and coordinators
3. **System Monitoring**: Oversee entire system operations

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcryptjs for secure password storage
- **Role-based Access**: Granular permissions based on user roles
- **Input Validation**: Comprehensive validation on both client and server
- **CORS Protection**: Configured for secure cross-origin requests

## Development

### Project Structure
```
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   └── App.tsx        # Main app component
├── models/                 # MongoDB models
├── routes/                 # API routes
├── middleware/             # Custom middleware
├── utils/                  # Utility functions
├── server.js              # Express server
└── package.json           # Dependencies
```

### Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run client` - Start React development server
- `npm run build` - Build React app for production

## Deployment

### Backend Deployment
1. Set up MongoDB database (MongoDB Atlas recommended)
2. Configure environment variables
3. Deploy to cloud platform (Heroku, AWS, etc.)

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to static hosting (Netlify, Vercel, etc.)
3. Update API endpoints for production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support and questions, please contact the development team or create an issue in the repository.
