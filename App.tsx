import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';
import { DatabaseProvider } from '@nozbe/watermelondb/DatabaseProvider';
import { AuthProvider } from './src/store/authStore';
import { SyncProvider } from './src/store/syncStore';
import { database } from './src/db/database';
import RootNavigator from './src/navigation/RootNavigator';

enableScreens();

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#1a5c2a" />
      <DatabaseProvider database={database}>
        <SyncProvider>
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
        </SyncProvider>
      </DatabaseProvider>
    </SafeAreaProvider>
  );
}

export default App;
