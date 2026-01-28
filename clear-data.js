// Script to clear all app data (Realm + AsyncStorage)
const Realm = require('realm');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const path = require('path');
const fs = require('fs');

async function clearAllData() {
  try {
    console.log('🗑️  Clearing app data...');
    
    // Clear Realm database
    const realmPath = path.join(__dirname, 'default.realm');
    if (fs.existsSync(realmPath)) {
      fs.unlinkSync(realmPath);
      console.log('✅ Realm database deleted');
    }
    
    // Clear Realm lock files
    const lockPath = path.join(__dirname, 'default.realm.lock');
    if (fs.existsSync(lockPath)) {
      fs.unlinkSync(lockPath);
      console.log('✅ Realm lock file deleted');
    }
    
    // Clear Realm management files
    const managementPath = path.join(__dirname, 'default.realm.management');
    if (fs.existsSync(managementPath)) {
      fs.rmSync(managementPath, { recursive: true, force: true });
      console.log('✅ Realm management files deleted');
    }
    
    // Note: AsyncStorage is device-specific and can't be cleared from Node.js
    // User needs to clear app data from device settings or reinstall app
    console.log('⚠️  Note: AsyncStorage data is stored on device.');
    console.log('   To clear it: Settings > Apps > IronEcho > Clear Data');
    console.log('   Or uninstall and reinstall the app.');
    
    console.log('✅ Data clearing complete!');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

clearAllData();

