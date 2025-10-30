import { BackHandler, Platform } from 'react-native';

// RN 0.81 removed BackHandler.removeEventListener; some libs still call it.
// Provide a no-op shim to avoid crashes. Libraries should use subscription.remove().
if (Platform.OS !== 'web' && !(BackHandler as any).removeEventListener) {
  (BackHandler as any).removeEventListener = () => {};
}


