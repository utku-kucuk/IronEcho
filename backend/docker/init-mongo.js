// MongoDB initialization script
db = db.getSiblingDB('ironecho');

// Create user for the application
db.createUser({
  user: 'ironecho_user',
  pwd: 'ironecho_password',
  roles: [
    {
      role: 'readWrite',
      db: 'ironecho'
    }
  ]
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.workouts.createIndex({ userId: 1, date: -1 });
db.workouts.createIndex({ userId: 1, 'exercises.name': 1, date: -1 });
db.workouts.createIndex({ userId: 1, lastModified: -1 });
db.measurements.createIndex({ userId: 1, date: -1 });
db.measurements.createIndex({ userId: 1, lastModified: -1 });

print('IronEcho database initialized successfully');
