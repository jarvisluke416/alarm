import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, Button, Alert, Vibration, BackHandler, AppState } from 'react-native';
import { Audio } from 'expo-av';
import { StatusBar } from 'expo-status-bar';
import { Accelerometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SecureStore from 'expo-secure-store';

export default function App() {
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [passwordSet, setPasswordSet] = useState(false);
  const [alarmTriggered, setAlarmTriggered] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [alarmSound, setAlarmSound] = useState(null);

  const [countdown, setCountdown] = useState(10);
  const [isCountdownActive, setIsCountdownActive] = useState(false);
  const [monitorMotion, setMonitorMotion] = useState(false);
  const [alarmReady, setAlarmReady] = useState(false);

  // Load alarm sound
  useEffect(() => {
    const loadSound = async () => {
      const { sound } = await Audio.Sound.createAsync(
        require('./assets/zapsplat_emergency_alarm_high_pitched_car_alarm_dry_72495.mp3'),
        { shouldPlay: false, isLooping: true }
      );
      setAlarmSound(sound);
    };

    loadSound();

    return () => {
      if (alarmSound) {
        alarmSound.unloadAsync();
      }
    };
  }, []);

  // Lock orientation when monitoring or alarm active
  useEffect(() => {
    if (alarmReady || alarmTriggered) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  }, [alarmReady, alarmTriggered]);

  // Block Android back button when monitoring
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (alarmReady || alarmTriggered) return true;
      return false;
    });

    return () => backHandler.remove();
  }, [alarmReady, alarmTriggered]);

  // Re-trigger alarm if app is backgrounded
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if ((alarmReady || monitorMotion) && nextState !== 'active') {
        triggerAlarm();
      }
    });

    return () => subscription.remove();
  }, [alarmReady, monitorMotion]);

  // Motion detection logic
  useEffect(() => {
    let subscription;

    if (monitorMotion) {
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const threshold = 0.15; // More sensitive
        if (
          Math.abs(x) > threshold ||
          Math.abs(y) > threshold ||
          Math.abs(z - 1) > threshold
        ) {
          // console.log(`Motion Detected x:${x} y:${y} z:${z}`);
          triggerAlarm();
        }
      });
      Accelerometer.setUpdateInterval(500);
    }

    return () => {
      if (subscription) subscription.remove();
    };
  }, [monitorMotion, triggerAlarm]);

  // Refactored to avoid stale state
  const triggerAlarm = useCallback(async () => {
    if (!alarmTriggered) {
      setAlarmTriggered(true);
      setMonitorMotion(false);
      if (alarmSound) {
        await alarmSound.setVolumeAsync(1);
        await alarmSound.playAsync();
      }
      Vibration.vibrate([500, 500, 500], true);
    }
  }, [alarmTriggered, alarmSound]);

  const stopAlarm = async () => {
    const stored = await SecureStore.getItemAsync('userPassword');
    if (!stored) {
      Alert.alert('Error', 'Password not set.');
      return;
    }

    if (enteredPassword === stored) {
      if (alarmSound) await alarmSound.stopAsync();
      Vibration.cancel();
      setAlarmTriggered(false);
      setAlarmReady(false);
      setEnteredPassword('');
      setCountdown(10);
      setMonitorMotion(false);
      Alert.alert('Alarm Stopped', 'Correct password entered.');
    } else {
      Alert.alert('Wrong Password', 'Try again.');
    }
  };

  const handleSetPassword = async () => {
    if (password1.length < 4) {
      Alert.alert('Error', 'Password must be at least 4 characters.');
      return;
    }
    if (password1 !== password2) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    await SecureStore.setItemAsync('userPassword', password1);
    setPasswordSet(true);
    Alert.alert('Success', 'Password saved.');
  };

  const activateAlarm = () => {
    setIsCountdownActive(true);
    setCountdown(10);
    setAlarmReady(false);
  
    let timer = 10;
    const interval = setInterval(() => {
      if (timer <= 0) {
        clearInterval(interval);
        setIsCountdownActive(false);
  
        // ✅ Show red screen immediately
        setAlarmReady(true);
  
        // 🕒 Start motion detection after 2 seconds
        setTimeout(() => {
          setMonitorMotion(true);
        }, 2000);
      } else {
        timer--;
        setCountdown(timer);
      }
    }, 1000);
  };
  

  // 🔴 Fullscreen red screen when activated
  if (alarmReady && !alarmTriggered) {
    return (
      <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
        <StatusBar hidden />
        <Text style={{ fontSize: 24, color: 'white' }}>🚨 Alarm Activated 🚨</Text>
        <Text style={{ color: 'white', marginTop: 10 }}>Phone is now being monitored for motion.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <StatusBar hidden={alarmReady || alarmTriggered} />

      {!passwordSet ? (
        <>
          <Text>Set Password</Text>
          <TextInput
            placeholder="Enter password"
            value={password1}
            onChangeText={setPassword1}
            secureTextEntry
            style={{ borderWidth: 1, marginVertical: 5, padding: 10, width: 200 }}
          />
          <TextInput
            placeholder="Confirm password"
            value={password2}
            onChangeText={setPassword2}
            secureTextEntry
            style={{ borderWidth: 1, marginBottom: 10, padding: 10, width: 200 }}
          />
          <Button title="Save Password" onPress={handleSetPassword} />
        </>
      ) : alarmTriggered ? (
        <>
          <Text style={{ fontSize: 18, marginBottom: 10 }}>🔒 Alarm Triggered!</Text>
          <TextInput
            placeholder="Enter password to stop"
            value={enteredPassword}
            onChangeText={setEnteredPassword}
            secureTextEntry
            style={{ borderWidth: 1, marginVertical: 10, padding: 10, width: 200 }}
          />
          <Button title="Stop Alarm" onPress={stopAlarm} />
        </>
      ) : (
        <>
          <Text style={{ marginBottom: 10, textAlign: 'center' }}>
            Press the button below to activate the alarm. After 10 seconds, the alarm will trigger if the phone is moved.
          </Text>
          <Button title="Press to Activate Alarm" onPress={activateAlarm} />
          {isCountdownActive && <Text style={{ marginTop: 10 }}>{countdown} seconds remaining</Text>}
        </>
      )}
    </View>
  );
}
