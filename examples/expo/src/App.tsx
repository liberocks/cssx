import React, { useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { create, props } from '@cssxio/react-native';

const styles = create({
  screen: 'flex-1 items-center justify-center bg-gray-900 p-6',
  card: 'w-full max-w-md gap-4 rounded-xl bg-white p-6',
  badge: 'rounded-full bg-blue-100 px-3 py-2',
  badgeText: 'text-center font-semibold text-blue-700',
  title: 'text-2xl font-semibold text-gray-900',
  button: 'items-center rounded-lg bg-blue-600 p-4',
  buttonText: 'font-semibold text-white',
});

export default function App(): React.JSX.Element {
  const [count, setCount] = useState(0);
  return (
    <SafeAreaView {...props(styles.screen)}>
      <StatusBar style="light" />
      <View {...props(styles.card)}>
        <View {...props(styles.badge)}>
          <Text {...props(styles.badgeText)}>Expo SDK 57</Text>
        </View>
        <Text {...props(styles.title)}>CSSX on Expo</Text>
        <TouchableOpacity {...props(styles.button)} onPress={() => setCount((value) => value + 1)}>
          <Text {...props(styles.buttonText)}>count is {count}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
