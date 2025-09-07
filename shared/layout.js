import { Dimensions } from 'react-native';
const screenWidth = Dimensions.get('window').width;
export const wrapperWidth = Math.min(screenWidth, 400);
export const CARD_WIDTH = wrapperWidth / 8.5;
export const CARD_HEIGHT = CARD_WIDTH * 1.33;