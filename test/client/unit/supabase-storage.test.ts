import { getSupabaseGameAssetUrl } from '../../../src/services/supabaseStorage';

describe('Supabase Storage 이미지 URL', () => {
  it('카드 객체 키를 game-assets 공개 URL로 변환한다', () => {
    expect(getSupabaseGameAssetUrl('cards/flame_knight.png')).toBe(
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/game-assets/cards/flame_knight.png',
    );
  });

  it('하위 폴더와 파일명의 특수 문자를 안전하게 인코딩한다', () => {
    expect(getSupabaseGameAssetUrl('cards/fire/flame knight.png')).toBe(
      'https://nmbdwukrvwfaxpasbppj.supabase.co/storage/v1/object/public/game-assets/cards/fire/flame%20knight.png',
    );
  });

  it('기존 로컬 이미지 키는 Supabase URL로 바꾸지 않는다', () => {
    expect(getSupabaseGameAssetUrl('earth_guardian')).toBeNull();
  });

  it.each([
    '',
    '/cards/flame_knight.png',
    'cards/../secret.png',
    'cards\\flame_knight.png',
    'https://example.com/card.png',
  ])('안전하지 않은 객체 키를 거절한다: %s', (objectKey) => {
    expect(getSupabaseGameAssetUrl(objectKey)).toBeNull();
  });
});
