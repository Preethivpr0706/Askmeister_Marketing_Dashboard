# Admin User Management System

This document describes the admin functionality that has been added to the WhatsApp Templates system.

## Features Implemented

### ✅ Database Schema Updates
- Added `role` column to `users` table with enum values: 'admin', 'user'
- Updated authentication system to include role-based access control
- Created migration script in `backend/migrations/add_role_based_access.sql`

### ✅ Backend Implementation
- **User Model** (`backend/models/userModel.js`): Complete CRUD operations for user management
- **Business Model** (`backend/models/businessModel.js`): Extended with admin methods for business management
- **User Controller** (`backend/controllers/userController.js`): Admin endpoints for user operations
- **Business Controller** (`backend/controllers/businessController.js`): Extended with admin methods
- **Admin Routes** (`backend/routes/adminRoutes.js`): Protected routes with role-based authorization
- **Authentication Updates**: Role included in login response and JWT tokens

### ✅ Frontend Implementation
- **Admin API Service** (`frontend/src/api/adminService.jsx`): API calls for admin operations
- **Auth Service Updates**: Added role checking methods (`isAdmin()`, `hasRole()`, `getUserRole()`)
- **Sidebar Updates**: Admin navigation with role-based visibility
- **Admin Components**:
  - `AdminDashboard.jsx`: Main admin layout with navigation
  - `AdminStats.jsx`: Overview statistics dashboard
  - `UserManagement.jsx`: Complete user management interface
  - `BusinessManagement.jsx`: Business management interface
- **Admin CSS**: Complete styling for admin components

### ✅ Security Features
- Role-based access control using middleware
- Admin-only routes protected by `authorize('admin')` middleware
- Password hashing with bcrypt
- JWT token authentication with role information

## Setup Instructions

### 1. Run Database Migration
Execute the migration script to add the role column:

```bash
# In the backend directory
mysql -u [username] -p [database_name] < migrations/add_role_based_access.sql
```

Or run the setup script:
```bash
cd backend
node scripts/setupAdmin.js
```

### 2. Start the Servers
```bash
# Backend
cd backend
npm start

# Frontend (in another terminal)
cd frontend
npm run dev
```

### 3. Create Admin User
The setup script creates a default admin user:
- **Email**: admin@askmeister.com
- **Password**: Admin123!
- **Role**: admin

You can also manually create admin users through the database:
```sql
UPDATE users SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Admin Panel Access

1. **Login** with admin credentials
2. **Admin Panel** appears in the sidebar (shield icon) for admin users only
3. **Navigation**:
   - **Overview**: System statistics and metrics
   - **User Management**: Create, edit, delete users; reset passwords
   - **Business Management**: Create, edit, delete businesses; manage settings

## API Endpoints

### Authentication
- `GET /api/admin/users` - Get all users (admin only)
- `POST /api/admin/users` - Create new user (admin only)
- `PUT /api/admin/users/:id` - Update user (admin only)
- `DELETE /api/admin/users/:id` - Delete user (admin only)
- `POST /api/admin/users/:id/reset-password` - Reset user password (admin only)

### Business Management
- `GET /api/admin/businesses` - Get all businesses (admin only)
- `POST /api/admin/businesses` - Create new business (admin only)
- `PUT /api/admin/businesses/:id` - Update business (admin only)
- `DELETE /api/admin/businesses/:id` - Delete business (admin only)
- `GET /api/admin/businesses/:id/settings` - Get business settings (admin only)
- `PUT /api/admin/businesses/:id/settings` - Update business settings (admin only)

## User Roles

### Admin Users
- Can access admin panel
- Can manage all users and businesses
- Can reset passwords
- Can view system statistics
- Full CRUD operations on users and businesses
- **Sidebar shows only:** Admin Panel and Settings (clean admin experience)

### Regular Users
- Cannot access admin panel
- Limited to their own business data
- Standard dashboard functionality
- **Sidebar shows all features:** Dashboard, Templates, Campaigns, etc.

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    business_id INT,
    role ENUM('admin', 'user') NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (business_id) REFERENCES businesses(id)
);
```

### Businesses Table
```sql
CREATE TABLE businesses (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    profile_image_url VARCHAR(500),
    industry VARCHAR(100) DEFAULT 'technology',
    size ENUM('small', 'medium', 'large', 'enterprise') DEFAULT 'medium',
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    website VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## Security Considerations

1. **Role Validation**: All admin routes require `admin` role
2. **Password Security**: Passwords are hashed with bcrypt (12 rounds)
3. **JWT Tokens**: Include role information for client-side checks
4. **Database Security**: Role-based queries prevent unauthorized access
5. **Input Validation**: All inputs are validated on both client and server
6. **Auto-increment IDs**: Secure, sequential numeric IDs instead of UUIDs

## File Structure

```
backend/
├── migrations/
│   └── add_role_based_access.sql          # Database migration
├── models/
│   ├── userModel.js                       # User management model (auto-increment)
│   └── businessModel.js                   # Extended business model (auto-increment)
├── controllers/
│   ├── userController.js                  # User management controller
│   └── businessController.js              # Extended business controller
├── routes/
│   └── adminRoutes.js                     # Admin API routes
└── scripts/
    └── setupAdmin.js                      # Setup script (auto-increment)

frontend/
├── src/
│   ├── api/
│   │   ├── adminService.jsx               # Admin API service
│   │   └── authService.jsx                # Updated auth service
│   └── components/
│       ├── Admin/
│       │   ├── AdminDashboard.jsx         # Main admin layout
│       │   ├── AdminStats.jsx             # Statistics component
│       │   ├── UserManagement.jsx         # User management
│       │   └── BusinessManagement.jsx     # Business management
│       └── Sidebar/
│           └── Sidebar.jsx                # Updated with admin nav
└── App.jsx                                # Updated with admin routes
```

## Troubleshooting

### Common Issues

1. **Admin panel not visible**: Check if user has `admin` role in database
2. **403 Forbidden errors**: Verify JWT token includes role information
3. **Database connection errors**: Check database credentials in `.env`
4. **Migration errors**: Ensure database user has ALTER TABLE permissions

### Debug Commands

```bash
# Check user roles in database
SELECT id, email, name, role FROM users;

# Verify admin routes are registered
curl -H "Authorization: Bearer [token]" http://localhost:5000/api/admin/users

# Check server logs for errors
tail -f backend/server.log
```

## Future Enhancements

- [ ] Activity logging for admin actions
- [ ] Bulk user import/export
- [ ] Advanced user permissions (read-only admin, etc.)
- [ ] Email notifications for user actions
- [ ] Audit trail for security compliance
- [ ] API rate limiting for admin endpoints

## Support

For issues or questions regarding the admin functionality:
1. Check the troubleshooting section above
2. Review server logs for error messages
3. Verify database schema matches migration
4. Test with different admin user accounts
