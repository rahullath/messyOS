# MeshOS v3 Setup Guide

## 🚨 Quick Fix for Current Error

Your app is crashing because the database tables don't exist yet. I've fixed the code to handle this gracefully, but you need to set up the database.

## ✅ Step 1: Fix the Immediate Error

The app should now run without crashing. Try running:

```bash
npm run dev
```

You should see the dashboard load with "0/0 habits" and "Ready to start!" - this is normal since no data exists yet.

## 🗄️ Step 2: Set Up Database Tables

1. **Go to your Supabase Dashboard**
   - Visit [supabase.com](https://supabase.com)
   - Open your project

2. **Open SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run the Database Setup**
   - Copy the entire contents of `database-setup.sql`
   - Paste it into the SQL editor
   - Click "Run" to create all tables

## 🔐 Step 3: Set Up Authentication (Optional for now)

For now, the app works in dev mode without authentication. To set up proper auth:

1. **Enable Email Auth in Supabase**
   - Go to Authentication > Settings
   - Enable "Email" provider

2. **Create a Test Account**
   - Go to Authentication > Users
   - Click "Add User" 
   - Create an account with your email

## 📊 Step 4: Add Sample Data (Optional)

Once you have the tables set up, you can add some test habits:

1. **Get Your User ID**
   - Go to Authentication > Users in Supabase
   - Copy your user ID

2. **Add Sample Habits**
   - Go back to SQL Editor
   - Uncomment the sample data section in `database-setup.sql`
   - Replace `'your-user-id'` with your actual user ID
   - Run the query

## 🎯 Step 5: Import Your Loop Habits Data

Once the basic setup is working:

1. **Export from Loop Habits**
   - Open Loop Habits app
   - Go to Settings > Export
   - Export as CSV (you'll get 3 files: habits.csv, checkmarks.csv, scores.csv)

2. **Import to MeshOS**
   - Go to `/import` page in your app
   - Upload the 3 CSV files
   - Click "Import"

## 🚀 Next Steps

After the basic setup:

1. **Test the Dashboard** - Should show your habits and stats
2. **Test Habit Logging** - Click "Log Habit" to mark habits complete
3. **Explore Other Pages** - Check out /habits, /tasks, /health, /finance

## 🔧 Troubleshooting

### App Still Crashing?
- Make sure you saved the updated `src/pages/index.astro` file
- Restart the dev server: `Ctrl+C` then `npm run dev`

### Database Errors?
- Check your `.env` file has correct Supabase credentials
- Make sure you ran the `database-setup.sql` script completely

### Authentication Issues?
- For now, just use dev mode (auth is bypassed)
- We'll fix proper auth later

## 📋 What's Working Now

✅ **Dashboard** - Shows overview with error handling  
✅ **Basic Navigation** - All pages load without crashing  
✅ **Database Schema** - Ready for your data  
✅ **Dev Mode** - Works without authentication  

## 🎯 What's Next

After you confirm the app is running:

1. **Import your Loop Habits data**
2. **Add health data import** (Huawei Health)
3. **Set up finance tracking** (bank statements)
4. **Build AI insights** with your real data
5. **Add automation features**

---

**Priority**: Get the database set up first, then we can build the comprehensive life tracking system you want! 🚀
