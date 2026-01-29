
import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import mongoose from 'mongoose';

const app = express();

const MONGODB_URI = process.env.MONGODB_URI;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['ADMIN', 'TEAM_MEMBER'], default: 'TEAM_MEMBER' },
  isVerified: { type: Boolean, default: true }
});

const fieldSchema = new mongoose.Schema({
  id: String,
  label: String,
  type: { type: String, default: 'text' },
  options: [String],
  isPrimary: { type: Boolean, default: false },
  required: { type: Boolean, default: false }
}, { _id: false });

const settingsSchema = new mongoose.Schema({
  statusOptions: [String],
  modelOptions: [String],
  locationOptions: [String],
  ownerTypeOptions: [String],
  fields: [fieldSchema],
  isRegistrationEnabled: { type: Boolean, default: true }
});

const deviceSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  historyLog: [{
    id: String,
    date: Date,
    user: String,
    action: String,
    details: String
  }]
}, { 
  strict: false, 
  minimize: false,
  _id: false 
});

const transform = (doc, ret) => {
  ret.id = ret._id ? ret._id.toString() : ret.id;
  delete ret._id;
  delete ret.__v;
  return ret;
};

userSchema.set('toJSON', { transform });
settingsSchema.set('toJSON', { transform });
deviceSchema.set('toJSON', { transform });

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Settings = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
const Device = mongoose.models.Device || mongoose.model('Device', deviceSchema);

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

const seedData = async () => {
  try {
    const seedAdmins = [
      { email: 'ss5551@zebra.com', name: 'Zebra Admin', password: 'Sarani12345', role: 'ADMIN', isVerified: true },
      { email: 'admin@devicetracker.io', name: 'System Admin', password: 'admin', role: 'ADMIN', isVerified: true }
    ];

    for (const admin of seedAdmins) {
      const exists = await User.findOne({ email: admin.email });
      if (!exists) {
        await User.create(admin);
      }
    }
  } catch (err) {}
};

app.use(async (req, res, next) => {
  await connectDb();
  next();
});

app.post('/api/auth/signup', async (req, res) => {
  try {
    const settings = await Settings.findOne();
    if (settings && !settings.isRegistrationEnabled) {
      return res.status(403).json({ error: 'Public registration is disabled.' });
    }
    const { email, name, password, role } = req.body;
    if (!email || !name || !password) return res.status(400).json({ error: 'Missing credentials.' });
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ error: 'Identity registered.' });
    const user = await User.create({ email: email.toLowerCase(), name, password, role: role || 'TEAM_MEMBER', isVerified: true });
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role, isVerified: true } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase(), password });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    res.json({ success: true, user: { id: user._id, email: user.email, name: user.name, role: user.role, isVerified: user.isVerified } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/inventory', async (req, res) => {
  try {
    const devices = await Device.find().lean();
    res.json(devices.map(d => ({ ...d, id: d._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/inventory', async (req, res) => {
  try { 
    console.log('Received inventory data:', req.body);
    const devices = req.body;
    const deviceList = Array.isArray(devices) ? devices : [devices];
    for (const d of deviceList) {
      const { id, _id, historyLog, ...rest } = d;
      const targetId = String(_id || id);
      if (!targetId || targetId === 'undefined') continue;
      await Device.findOneAndUpdate(
        { _id: targetId }, 
        { ...rest, historyLog, _id: targetId }, 
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.findOne().lean();
    res.json(settings || {});
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/settings', async (req, res) => {
  try {
    const updated = await Settings.findOneAndUpdate({}, req.body, { new: true, upsert: true, lean: true });
    res.json(updated);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '-password').lean();
    res.json(users.map(u => ({ ...u, id: u._id.toString() })));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `API Route Not Found: ${req.method} ${req.originalUrl}` });
});

export default app;
