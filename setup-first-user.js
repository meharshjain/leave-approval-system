const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Import models
const User = require('./models/User');
const Department = require('./models/Department');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/leave-approval-system', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Create first department
const createFirstDepartment = async () => {
  try {
    // Check if any departments exist
    const existingDepartments = await Department.find();
    if (existingDepartments.length > 0) {
      console.log('📁 Departments already exist. Using existing department.');
      return existingDepartments[0]._id;
    }

    // Create the first department
    const department = new Department({
      name: 'Administration',
      description: 'Administrative department for system management',
      isActive: true
    });

    await department.save();
    console.log('✅ First department created:', department.name);
    return department._id;
  } catch (error) {
    console.error('❌ Error creating first department:', error);
    throw error;
  }
};

// Create first admin user
const createFirstAdmin = async (departmentId) => {
  try {
    // Check if any users exist
    const existingUsers = await User.find();
    if (existingUsers.length > 0) {
      console.log('👤 Users already exist. Skipping user creation.');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('admin123', salt);

    // Create the first admin user
    const adminUser = new User({
      name: 'System Administrator',
      email: 'admin@company.com',
      password: hashedPassword,
      employeeId: 'ADMIN001',
      department: departmentId,
      role: 'admin',
      isActive: true,
      phone: '+1234567890',
      position: 'System Administrator'
    });

    await adminUser.save();
    console.log('✅ First admin user created successfully!');
    console.log('\n🔐 Login Credentials:');
    console.log('   📧 Email: admin@company.com');
    console.log('   🔑 Password: admin123');
    console.log('   🆔 Employee ID: ADMIN001');
    console.log('   👑 Role: admin');
  } catch (error) {
    console.error('❌ Error creating first admin user:', error);
    throw error;
  }
};

// Create additional sample departments
const createSampleDepartments = async () => {
  try {
    const sampleDepartments = [
      {
        name: 'Human Resources',
        description: 'Human Resources department',
        isActive: true
      },
      {
        name: 'Information Technology',
        description: 'IT department for technical support',
        isActive: true
      },
      {
        name: 'Finance',
        description: 'Finance and accounting department',
        isActive: true
      },
      {
        name: 'Operations',
        description: 'Operations and logistics department',
        isActive: true
      }
    ];

    for (const deptData of sampleDepartments) {
      const existingDept = await Department.findOne({ name: deptData.name });
      if (!existingDept) {
        const department = new Department(deptData);
        await department.save();
        console.log(`✅ Created department: ${deptData.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Error creating sample departments:', error);
    throw error;
  }
};

// Main setup function
const setupFirstUser = async () => {
  try {
    console.log('🚀 Setting up first user for Leave Management System...\n');
    
    // Connect to database
    await connectDB();
    
    // Create first department
    const departmentId = await createFirstDepartment();
    
    // Create first admin user
    await createFirstAdmin(departmentId);
    
    // Create sample departments
    await createSampleDepartments();
    
    console.log('\n🎉 Setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Start your server: npm run dev');
    console.log('2. Start your client: npm run client');
    console.log('3. Login with: admin@company.com / admin123');
    console.log('4. Create additional users through the admin panel');
    console.log('\n💡 You can now:');
    console.log('   • Create more departments');
    console.log('   • Add employees, managers, and coordinators');
    console.log('   • Set up leave policies');
    console.log('   • Start using the leave management system');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed.');
  }
};

// Run the setup
setupFirstUser();
