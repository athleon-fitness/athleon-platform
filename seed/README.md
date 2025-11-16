# Athleon Seed Data

## 🌱 Seed Scripts (6 files)

### **User Setup**
- **`create-organizer-users.js`** - Creates organizer test users
  - Users: `organizer1@test.com`, `organizer2@test.com`
  - Password: `Organizer123!`

### **Core Data**
- **`seed-current-data.js`** - **MAIN SEED SCRIPT**
  - Creates demo organization, event, WODs, exercises
  - Uses global categories (requires seed-categories.js first)
  - Uses current CDK table names
  - Run after CDK deployment

- **`seed-categories.js`** - Creates global categories
  - 8 professional categories (Men/Women × 4 levels)
  - Intermediate, Advanced, Professional, Elite
  - Global categories available to all events

### **Template Data**
- **`seed-baseline-wods.js`** - Creates comprehensive baseline WODs
  - 8 category-specific WODs (Men/Women × 4 levels)
  - Intermediate, Advanced, Elite, Professional levels
  - Accessible via `/public/wods` endpoint

- **`seed-exercises.js`** - Creates exercise library (21 exercises)
  - Strength: Muscle Ups, Pull Ups, Bar Dips, etc.
  - Endurance: Push Ups, Squats, Burpees, etc.
  - Skill: Handstand, Front Lever, L-Sit, etc.
  - Used for advanced scoring systems

### **Security**
- **`seed-authorization.js`** - Creates RBAC system
  - 5 roles: Super Admin, Org Owner/Admin/Member, Athlete
  - 17 permissions across all resources
  - Role assignments for system users

## 📋 Usage Order

### **Complete Setup (after CDK deploy)**
```bash
# Run all seed scripts in correct order
cd seed
AWS_PROFILE=labvel-dev node seed-categories.js      # 1. Global categories first
AWS_PROFILE=labvel-dev node seed-current-data.js    # 2. Core data (uses global categories)
AWS_PROFILE=labvel-dev node seed-baseline-wods.js   # 3. Template WODs
AWS_PROFILE=labvel-dev node seed-exercises.js       # 4. Exercise library
AWS_PROFILE=labvel-dev node seed-authorization.js   # 5. RBAC system
```

### **Quick Setup Script**
```bash
# Run the master seed script
./seed-all.sh
```

## 🎯 What Gets Created

### **Organizations & Events**
- 1 Demo organization: "Demo Athleon CC"
- 1 Published event: "Demo Competition 2025"
- Uses 8 global categories (Men/Women × 4 levels)
- 2 Event-specific WODs: Fran, Grace

### **Template Library**
- 8 Baseline WODs (category-specific)
- 21 Professional exercises
- Complete RBAC system

### **Total Database Records**
- Organizations: 1
- Events: 1  
- Categories: 8 (global, created by seed-categories.js)
- WODs: 10 (2 event + 8 template)
- Exercises: 24 (21 + 3 basic)
- Roles: 5
- Permissions: 17

## 🔗 Dependencies

All scripts require:
- AWS CLI configured with `labvel-dev` profile
- CDK stack deployed
- Node.js with AWS SDK v3

## 🚨 Important Notes

- Run scripts in order (dependencies exist)
- Scripts are idempotent (safe to re-run)
- Uses current CDK table names
- Creates demo data for testing
