const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Department = require('./models/Department');

async function bootstrap() {
  try {
    console.log('🚀 Bootstrapping Leave Management System...\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leave-approval-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: 'admin@company.com' });
    if (existingAdmin) {
      console.log('👤 Admin user already exists!');
      console.log('📧 Email: admin@company.com');
      console.log('🔑 Password: admin123');
      return;
    }

    // Create or find Administration department
    let department = await Department.findOne({ name: 'Administration' });
    if (!department) {
      department = new Department({
        name: 'Administration',
        description: 'Administrative department for system management',
        isActive: true
      });
      await department.save();
      console.log('✅ Created Administration department');
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@company.com',
      password: hashedPassword,
      employeeId: 'ADMIN001',
      department: department._id,
      role: 'admin',
      isActive: true,
      phone: '+1234567890',
      position: 'System Administrator'
    });

    await adminUser.save();
    
    console.log('\n🎉 Bootstrap completed successfully!');
    console.log('\n🔐 Admin Login Credentials:');
    console.log('   📧 Email: admin@company.com');
    console.log('   🔑 Password: admin123');
    console.log('   🆔 Employee ID: ADMIN001');
    console.log('   👑 Role: admin');
    
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed.');
  }
}

// Run bootstrap
bootstrap();
