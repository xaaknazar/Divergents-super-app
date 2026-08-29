import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/** Keeps an unexpected render error from leaving the user on a blank screen. */
export class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (__DEV__) console.error('Uncaught app error', error, info.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>Что-то пошло не так</Text>
          <Text style={styles.body}>
            Экран не удалось открыть. Попробуйте загрузить его ещё раз.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Повторить загрузку"
            onPress={this.retry}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Повторить</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F2F2F7',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#111318',
    fontFamily: 'GothamRnd-Bold',
    fontSize: 22,
    lineHeight: 28,
  },
  body: {
    marginTop: 8,
    color: '#555B66',
    fontFamily: 'GothamRnd-Book',
    fontSize: 17,
    lineHeight: 24,
  },
  button: {
    minHeight: 50,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#234088',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonPressed: { opacity: 0.78 },
  buttonText: {
    color: '#FFFFFF',
    fontFamily: 'GothamRnd-Medium',
    fontSize: 17,
    lineHeight: 22,
  },
});
