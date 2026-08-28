//page 참조를 위한 임시 파일
// 필요시 삭제 가능

export const packService = {
  async openPack(packType: string) {
    return [
      { id: '101', name: '바람 정령', element: 'WIND', enhanceLevel: 0 },
      { id: '102', name: '번개 마수', element: 'LIGHTNING', enhanceLevel: 0 },
    ];
  },
};