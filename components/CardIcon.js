import React from 'react';
import { FontAwesome5 } from '@expo/vector-icons';
import CustomText from './CustomText';

export const CARD_ICONS = {
  A: { name: 'heart',     color: '#e63946' },
  B: { name: 'snowflake', color: '#457b9d' },
  C: { name: 'leaf',      color: '#2a9d8f' },
  D: { name: 'cloud',     color: '#f4a261' },
};

export function getCardIcon(type, size = 24) {
  const icon = CARD_ICONS[type];
  if (!icon) return <CustomText>?</CustomText>;
  return <FontAwesome5 name={icon.name} size={size} color={icon.color} solid />;
}

export function getCardBackIcon(filled, size = 20) {
  return filled
    ? <FontAwesome5 name="lock" size={size} color="#fff" solid />
    : <FontAwesome5 name="question" size={size} color="#999" solid />;
}
