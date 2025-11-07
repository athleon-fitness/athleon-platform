# Athleon Scripts

## 🚀 Active Scripts (6 files)

### **User Management**
- **`create-super-admin-user.js`** - Creates super admin user in Cognito
  - Email: `admin@athleon.fitness`
  - Password: `SuperAdmin123!`

- **`create-test-athletes.js`** - Creates 5 athlete test accounts
  - Users: `athlete1@test.com` - `athlete5@test.com`
  - Password: `Athlete123!`

### **Deployment**
- **`build-frontend.sh`** - Dynamic frontend build and deployment
  - Gets CDK outputs automatically
  - Builds with correct API URLs
  - Deploys to S3 and invalidates CloudFront

- **`deploy.sh`** - General deployment script

### **Documentation**
- **`cloudwatch-queries.md`** - CloudWatch monitoring queries

## 🌱 Seed Data

**Seed scripts moved to dedicated `/seed` directory**
- See `/seed/README.md` for complete seeding instructions
- Run `/seed/seed-all.sh` for complete setup

## 📋 Complete Setup Order

### **1. Deploy Infrastructure**
```bash
cdk deploy --profile labvel-dev --require-approval never
```

### **2. Create Users**
```bash
cd scripts
AWS_PROFILE=labvel-dev node create-super-admin-user.js
AWS_PROFILE=labvel-dev node create-test-athletes.js
```

### **3. Seed Data**
```bash
cd ../seed
./seed-all.sh
```

### **4. Deploy Frontend**
```bash
cd ../scripts
./build-frontend.sh
```

## 🎯 Login Credentials

- **Super Admin**: `admin@athleon.fitness` / `SuperAdmin123!`
- **Organizers**: `organizer1@test.com` / `Organizer123!`
- **Athletes**: `athlete1@test.com` / `Athlete123!`
- **Frontend**: https://dbtrhlzryzh8h.cloudfront.net
