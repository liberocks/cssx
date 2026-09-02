import React, { useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, View } from 'react-native';
import { create, props } from '@cssxio/react-native';

const styles = create({
  screen: 'flex-1 items-center justify-center bg-blue-600 p-6',
  card: 'w-full max-w-md gap-4 rounded-xl bg-white p-6',
  title: 'text-2xl font-semibold text-blue-900',
  body: 'text-base text-gray-600',
  button: 'items-center rounded-lg bg-blue-700 p-4',
  buttonText: 'font-semibold text-white',
});

export default function App(): React.JSX.Element {
  const [count, setCount] = useState(0);
  return (
    <SafeAreaView {...props(styles.screen)}>
      <View {...props(styles.card)}>
        <Text {...props(styles.title)}>Vanilla React Native</Text>
        <Text {...props(styles.body)}>CSSX emits native style objects without a DOM or stylesheet.</Text>
        <TouchableOpacity {...props(styles.button)} onPress={() => setCount((value) => value + 1)}>
          <Text {...props(styles.buttonText)}>count is {count}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
