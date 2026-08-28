//page 참조를 위한 임시 파일
// 필요시 삭제 가능

export const cardService = {
  async getUserCards() {
    return [
      { id: '1', name: '불꽃 드래곤', element: 'FIRE', enhanceLevel: 3 },
      { id: '2', name: '서리 골렘', element: 'WATER', enhanceLevel: 0 },
      { id: '3', name: '대지의 정령', element: 'EARTH', enhanceLevel: 1 },
    ];
  },
  async getCardDetail(id: string) {
    return {
      id,
      name: '불꽃 드래곤',
      element: 'FIRE',
      enhanceLevel: 3,
      description: '강력한 화염을 내뿜는 전설의 드래곤 카드입니다.',
    };
  },
};