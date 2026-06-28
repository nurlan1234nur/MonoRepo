import { StyleSheet, Text, View } from 'react-native';

interface PlaceholderScreenProps {
  title: string;
  description: string;
}

export function PlaceholderScreen({ title, description }: PlaceholderScreenProps) {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#fff8f7',
    flex: 1,
    padding: 24,
    paddingTop: 72,
  },
  title: {
    color: '#3b2f2f',
    fontSize: 30,
    fontWeight: '800',
  },
  description: {
    color: '#7c5f5f',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
});

