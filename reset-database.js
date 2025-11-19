// Script to reset Realm database and create test user
// Run with: node reset-database.js

const Realm = require('realm');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Find Realm database files
function findRealmFiles() {
  const files = [];
  
  // Common locations for Realm files
  const homeDir = os.homedir();
  
  // iOS Simulator location
  const iosSimPath = path.join(homeDir, 'Library/Developer/CoreSimulator/Devices');
  if (fs.existsSync(iosSimPath)) {
    try {
      const devices = fs.readdirSync(iosSimPath);
      devices.forEach(deviceId => {
        const appPath = path.join(iosSimPath, deviceId, 'data/Containers/Data/Application');
        if (fs.existsSync(appPath)) {
          const apps = fs.readdirSync(appPath);
          apps.forEach(appId => {
            const realmPath = path.join(appPath, appId, 'Documents/default.realm');
            if (fs.existsSync(realmPath)) {
              files.push(realmPath);
            }
            // Also check for lock files
            const lockPath = path.join(appPath, appId, 'Documents/default.realm.lock');
            if (fs.existsSync(lockPath)) {
              files.push(lockPath);
            }
            const notePath = path.join(appPath, appId, 'Documents/default.realm.note');
            if (fs.existsSync(notePath)) {
              files.push(notePath);
            }
          });
        }
      });
    } catch (e) {
      // Ignore errors
    }
  }
  
  return files;
}

// Delete Realm files
function deleteRealmFiles() {
  const files = findRealmFiles();
  let deleted = 0;
  
  files.forEach(file => {
    try {
      fs.unlinkSync(file);
      console.log(`✅ Deleted: ${file}`);
      deleted++;
    } catch (e) {
      console.log(`⚠️  Could not delete: ${file} - ${e.message}`);
    }
  });
  
  if (deleted === 0) {
    console.log('ℹ️  No Realm database files found to delete');
    console.log('   (This is normal if the app hasn\'t been run yet)');
  } else {
    console.log(`\n✅ Deleted ${deleted} Realm database file(s)`);
  }
}

// Main execution
console.log('🗑️  Resetting Realm database...\n');
deleteRealmFiles();
console.log('\n✅ Database reset complete!');
console.log('   Next time you run the app, a fresh database will be created.\n');

