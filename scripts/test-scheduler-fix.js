const https = require('https');

const eventId = 'evt-1762664019818';
const apiUrl = 'https://api.dev.athleon.fitness';

// Test data that mimics what the frontend would send
const testScheduleConfig = {
  competitionMode: "HEATS",
  maxDayHours: 10,
  lunchBreakHours: 1,
  athletesPerHeat: 8,
  setupTime: 10,
  wods: [
    { wodId: "template-grace", name: "Grace" },
    { wodId: "template-fran", name: "Fran" }
  ],
  categories: [
    { categoryId: "men-advanced", name: "Men's Advanced" },
    { categoryId: "men-intermediate", name: "Men's Intermediate" },
    { categoryId: "women-intermediate", name: "Women's Intermediate" }
  ],
  athletes: [
    { userId: "athlete1@test.com", firstName: "John", categoryId: "men-intermediate" },
    { userId: "athlete2@test.com", firstName: "Jane", categoryId: "women-intermediate" }
  ],
  days: [
    {
      dayId: "day-1763266126486",
      date: "2025-11-17",
      name: "Competition Day 1",
      description: "Main competition day"
    }
  ]
};

const postData = JSON.stringify(testScheduleConfig);

const options = {
  hostname: 'api.dev.athleon.fitness',
  port: 443,
  path: `/scheduler/${eventId}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

console.log('🧪 Testing scheduler with event days...');
console.log('📊 Config:', {
  eventId,
  daysCount: testScheduleConfig.days.length,
  wodsCount: testScheduleConfig.wods.length,
  categoriesCount: testScheduleConfig.categories.length,
  athletesCount: testScheduleConfig.athletes.length
});

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    console.log('📈 Response Status:', res.statusCode);
    console.log('📋 Response:', data);
    
    if (res.statusCode === 200) {
      console.log('✅ Scheduler test PASSED - Schedule generated successfully!');
    } else if (res.statusCode === 401) {
      console.log('🔐 Expected: Unauthorized (no auth token provided)');
    } else {
      console.log('❌ Scheduler test FAILED');
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Request error:', e.message);
});

req.write(postData);
req.end();
