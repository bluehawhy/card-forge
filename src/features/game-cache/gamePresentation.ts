import type { ImageSourcePropType } from 'react-native';
import { getSupabaseGameAssetUrl } from '../../services/supabaseStorage';
import type { CardElement, CardGrade } from './gameCache';

export const elementLabels: Record<CardElement, string> = {
  EARTH: '땅',
  WATER: '물',
  WIND: '바람',
  FIRE: '불',
  LIGHT: '빛',
  DARK: '어둠',
};

export const gradeLabels: Record<CardGrade, string> = {
  NORMAL: '노말',
  MAGIC: '매직',
  RARE: '레어',
  SUPER_RARE: '슈퍼레어',
  UNIQUE: '유니크',
  LEGENDARY: '레전더리',
};

const fallbackCardImage: ImageSourcePropType = require('../../../assets/images/cards/earth_guardian.png');
const cardImages: Record<string, ImageSourcePropType> = {
  earth_guardian: fallbackCardImage,
  deep_sea_wave: require('../../../assets/images/cards/deep_sea_wave.png'),
  gale_spirit: require('../../../assets/images/cards/gale_spirit.png'),
  flame_dragon: require('../../../assets/images/cards/flame_dragon.png'),
  radiant_judgment: require('../../../assets/images/cards/radiant_judgment.png'),
  abyss_lord: require('../../../assets/images/cards/abyss_lord.png'),
  earth_normal: fallbackCardImage,
  water_rare: require('../../../assets/images/cards/frost_witch.png'),
  wind_normal: require('../../../assets/images/cards/wind_archer.png'),
  fire_legendary: require('../../../assets/images/cards/apocalypse_flame_dragon.png'),
  light_unique: require('../../../assets/images/cards/radiant_judgment.png'),
  dark_magic: require('../../../assets/images/cards/shadow_rogue.png'),
};

export function getCardImage(imageKey: string): ImageSourcePropType {
  const supabaseUrl = getSupabaseGameAssetUrl(imageKey);
  if (supabaseUrl) {
    return { uri: supabaseUrl };
  }

  return cardImages[imageKey] ?? fallbackCardImage;
}
