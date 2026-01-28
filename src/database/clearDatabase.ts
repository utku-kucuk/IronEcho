// Utility function to clear all data from Realm database
import { realmDB } from './realm.native';

export async function clearAllDatabaseData(): Promise<void> {
  try {
    if (!realmDB.isRealmInitialized()) {
      await realmDB.initialize();
    }
    
    const realm = (realmDB as any).getRealm();
    
    realm.write(() => {
      // Delete all objects from each schema
      realm.deleteAll();
    });
    
    console.log('✅ All database data cleared');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    throw error;
  }
}

