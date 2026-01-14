
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

const app = express();
const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// --- Mongoose Schemas ---
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEAM_MEMBER'], default: 'TEAM_MEMBER' }
});

const fieldSchema = new mongoose.Schema({
  id: String,
  label: String,
  type: { type: String, default: 'text' },
  options: [String],
  isPrimary: { type: Boolean, default: false }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  statusOptions: [String],
  fields: [fieldSchema]
});

const deviceSchema = new mongoose.Schema({
  historyLog: [{
    id: String,
    date: Date,
    user: String,
    action: String,
    details: String
  }]
}, { strict: false, minimize: false });

const transform = (doc, ret) => {
  ret.id = ret._id ? ret._id.toString() : ret.id;
  delete ret._id;
  delete ret.__v;
  return ret;
};

userSchema.set('toJSON', { transform });
settingsSchema.set('toJSON', { transform });
deviceSchema.set('toJSON', { transform });

const User = mongoose.model('User', userSchema);
const Settings = mongoose.model('Settings', settingsSchema);
const Device = mongoose.model('Device', deviceSchema);

let isConnected = false;

const connectDb = async () => {
  if (isConnected) return;
  if (!MONGODB_URI) return;
  
  try {
    const db = await mongoose.connect(MONGODB_URI);
    isConnected = db.connections[0].readyState === 1;
    await seedData();
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
  }
};

const defaultFields = [
  { id: 'entryDate', label: 'Entry Date', type: 'text' },
  { id: 'equipmentDescription', label: 'Equipment Description', type: 'text', isPrimary: true },
  { id: 'partNumber', label: 'Part Number', type: 'text' },
  { id: 'serialNumber', label: 'Serial Number / IMEI', type: 'text' },
  { id: 'assetTag', label: 'Asset Tag', type: 'text' },
  { id: 'deviceType', label: 'Type (Device/Accessory/PC)', type: 'text' },
  { id: 'releasedTo', label: 'Released to', type: 'text' },
  { id: 'coreId', label: 'Core ID', type: 'text' },
  { id: 'manager', label: 'Manager', type: 'text' },
  { id: 'gatePass', label: 'Gate Pass (Y/N)', type: 'text' },
  { id: 'returned', label: 'Returned', type: 'text' },
  { id: 'currentOwner', label: 'Current Owner', type: 'text' },
  { id: 'comments', label: 'Comments', type: 'text' },
  { id: 'location', label: 'Location', type: 'text' },
  { id: 'status', label: 'Status', type: 'select' }
];

const seedData = async () => {
  try {
    const settingsCount = await Settings.countDocuments();
    if (settingsCount === 0) {
      await Settings.create({
        statusOptions: ['Available', 'In Use', 'Need Repair', 'Taken', 'Borrow', 'Missing'],
        fields: defaultFields
      });
    }

    const adminCount = await User.countDocuments({ role: 'ADMIN' });
    if (adminCount === 0) {
      await User.create({
        email: 'admin@devicetracker.io',
        name: 'System Admin',
        password: 'admin',
        role: 'ADMIN'
      });
    }
  } catch (err) {
    console.error('❌ Seeding Error:', err.message);
  }
};

app.use(async (req, res, next) => {
  await connectDb();
  next();
});

app.get('/api/inventory', async (req, res) => {
  try {
    const devices = await Device.find().lean();
    res.json(devices.map(d => ({ ...d, id: d._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const incomingDevices = req.body;
    const results = [];
    for (const dev of incomingDevices) {
      const { id, _id, ...updateData } = dev;
      const targetId = _id || id;
      if (targetId && mongoose.Types.ObjectId.isValid(targetId)) {
        const updated = await Device.findByIdAndUpdate(targetId, updateData, { upsert: true, new: true });
        results.push(updated);
      } else {
        const created = await Device.create(updateData);
        results.push(created);
      }
    }
    res.json({ success: true, count: results.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/system/reset', async (req, res) => {
  try {
    await Device.deleteMany({});
    await Settings.deleteMany({});
    await User.deleteMany({ email: { $ne: 'admin@devicetracker.io' } });
    await seedData();
    res.json({ success: true, message: 'Database purged and re-seeded' });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne().lean();
    if (!settings) return res.json({ statusOptions: ['Available'], fields: defaultFields });
    settings.id = settings._id.toString();
    res.json(settings);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true, lean: true });
    updated.id = updated._id.toString();
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').lean(); 
    res.json(users.map(u => ({ ...u, id: u._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/register', async (req, res) => {
  try {
    const newUser = req.body;
    const exists = await User.findOne({ email: newUser.email });
    if (exists) return res.status(400).json({ error: 'User already exists' });
    const user = await User.create(newUser);
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (!user) return res.status(401).json({ error: 'Invalid email or password' });
    res.json({ 
      success: true, 
      user: { id: user._id, email: user.email, name: user.name, role: user.role } 
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default app;
