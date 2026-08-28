import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createRoute } from '@granite-js/react-native';

export const Route = createRoute('/about', {
  validateParams: (params) => params,
  component: AboutPage,
});

function AboutPage() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>About</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});