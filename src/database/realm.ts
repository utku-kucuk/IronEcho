// Platform-specific realm import
import { Platform } from 'react-native';

// Import the appropriate realm implementation based on platform
const realmModule = Platform.OS === 'web' 
  ? require('./realm.web')
  : require('./realm.native');

export const realmDB = realmModule.realmDB;
