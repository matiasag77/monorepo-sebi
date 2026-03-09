import * as mongoose from 'mongoose';
import * as bcrypt from 'bcryptjs';

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/sebi-chatbot';

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    provider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, required: false },
    avatar: { type: String, required: false },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date, required: false },
    loginCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const User = mongoose.model('User', UserSchema);

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@sebi.com' });
    if (existingAdmin) {
      console.log('Admin user already exists. Skipping seed.');
      await mongoose.disconnect();
      return;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('Admin123!', 10);

    // Create admin user
    const admin = new User({
      email: 'admin@sebi.com',
      password: hashedPassword,
      name: 'Admin',
      role: 'admin',
      provider: 'local',
      isActive: true,
      loginCount: 0,
    });

    await admin.save();
    console.log('Default admin user created successfully:');
    console.log('  Email: admin@sebi.com');
    console.log('  Password: Admin123!');
    console.log('  Role: admin');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB. Seed complete.');
  } catch (error) {
    console.error('Seed failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seed();
