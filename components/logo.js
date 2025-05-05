// components/Logo.js
import * as React from 'react';
import Svg, { Text } from 'react-native-svg';

export default function Logo() {
  return (
    <Svg viewBox="0 0 200 200" height={100} width={100}>
      <Text x="7.5" y="110" fontSize="100" fontFamily="Cal Sans">A</Text>
      <Text x="70" y="110" fontSize="100" fontFamily="Cal Sans">L!</Text>
      <Text x="1" y="180" fontSize="100" fontFamily="Cal Sans">R</Text>
      <Text x="50" y="180" fontSize="100" fontFamily="Cal Sans">M</Text>
    </Svg>
  );
}
