const SUPABASE_PROJECT_URL = 'https://nmbdwukrvwfaxpasbppj.supabase.co';
const GAME_ASSET_BUCKET = 'game-assets';

const PUBLIC_GAME_ASSET_BASE_URL =
  `${SUPABASE_PROJECT_URL}/storage/v1/object/public/${GAME_ASSET_BUCKET}`;

const allowedAssetRoots = new Set(['cards', 'characters']);

/**
 * Supabase Storage 객체 키를 공개 이미지 URL로 변환합니다.
 *
 * 예: cards/flame_knight.png
 *   -> https://...supabase.co/storage/v1/object/public/game-assets/cards/flame_knight.png
 */
export function getSupabaseGameAssetUrl(objectKey: string): string | null {
  const normalizedKey = objectKey.trim();

  if (
    !normalizedKey ||
    normalizedKey.startsWith('/') ||
    normalizedKey.includes('\\')
  ) {
    return null;
  }

  const segments = normalizedKey.split('/');
  if (
    segments.length < 2 ||
    !allowedAssetRoots.has(segments[0]) ||
    segments.some(
      (segment) => !segment || segment === '.' || segment === '..',
    )
  ) {
    return null;
  }

  const encodedKey = segments.map(encodeURIComponent).join('/');
  return `${PUBLIC_GAME_ASSET_BASE_URL}/${encodedKey}`;
}
