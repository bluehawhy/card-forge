# Apps in Toss · Granite Router 참고 자료

이 문서는 card-forge 개발 시 우선 확인할 공식 문서와 프로젝트 적용 기준을 정리한다.

## 공식 문서

1. [앱인토스 연동 시작하기](https://developers-apps-in-toss.toss.im/documentation/integration/getting-started)
2. [Granite Router 가이드](https://github.com/toss/granite/tree/main/docs/guides/granite-router)

> 공식 문서는 변경될 수 있으므로 실제 구현 전 링크의 최신 내용을 다시 확인한다.

## 앱인토스 연동 기준

앱인토스는 크게 두 영역으로 구성된다.

| 영역 | 역할 | card-forge 적용 |
| --- | --- | --- |
| 클라이언트 SDK | 토스 앱 안에서 미니앱을 실행하고 네이티브 기능과 연결 | React Native + Granite 화면, 라우팅, 사용자 식별 SDK |
| 서버 API | 로그인 검증, 결제 등 신뢰가 필요한 서버 간 처리 | 회원 검증, 카드·재화·강화·판매 결과 저장 |

- 이 프로젝트는 React Native SDK와 공통 런타임인 Granite를 사용한다.
- 앱은 `AppsInToss.registerApp(...)`으로 등록한다.
- 화면 진입 시 플랫폼, 네트워크 상태, URL 스킴 등의 초기값은 `InitialProps`로 전달된다.
- 서버 권한이 필요한 결과를 클라이언트에서 확정하지 않는다.
- 서버 API가 필요한 기능은 파트너 서버와 앱인토스 서버 사이에서 처리한다.
- 일반 iframe은 지원되지 않는다. 공식 문서가 허용한 예외 용도 외에는 사용하지 않는다.

## Granite Router 기준

Granite Router는 `pages/` 폴더를 기준으로 경로와 타입을 생성하는 파일 기반 라우터다.

### 페이지와 경로

| 파일 | 경로 |
| --- | --- |
| `pages/index.tsx` | `/` |
| `pages/cards.tsx` | `/cards` |
| `pages/card-detail.tsx` | `/card-detail` |
| `pages/forge.tsx` | `/forge` |
| `pages/packs.tsx` | `/packs` |
| `pages/collection.tsx` | `/collection` |

각 페이지는 `createRoute`로 경로, 파라미터 검증, 화면 컴포넌트를 선언한다.

```tsx
import { createRoute } from '@granite-js/react-native';

export const Route = createRoute('/cards', {
  validateParams: (params) => params,
  component: CardsPage,
});

function CardsPage() {
  return null;
}
```

### 화면 이동

`useNavigation()`으로 네비게이션 객체를 얻고 등록된 경로로 이동한다.

```tsx
import { useNavigation } from '@granite-js/react-native';

const navigation = useNavigation();

navigation.navigate('/cards');

if (navigation.canGoBack()) {
  navigation.goBack();
}
```

- 이전 화면으로 돌아가기 전에 `canGoBack()`을 확인한다.
- 화면 기록을 초기화해야 할 때만 `CommonActions.reset`을 사용한다.
- 직접 문자열 URL을 조합하기보다 생성된 라우트 타입을 따른다.

### 화면 파라미터

화면에서 필요한 값은 `validateParams`로 검증하고 `Route.useParams()`로 읽는다.

```tsx
export const Route = createRoute('/card-detail', {
  validateParams: (params) => {
    if (typeof params.cardId !== 'string') {
      throw new Error('cardId is required');
    }

    return { cardId: params.cardId };
  },
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardId } = Route.useParams();
  return null;
}
```

- 외부 URL 스킴과 다른 화면에서 전달된 값은 신뢰하지 않고 검증한다.
- 필수값 누락과 타입 오류를 `validateParams`에서 차단한다.
- 복잡한 검증이 필요하면 Zod 또는 Valibot 같은 스키마 도구를 검토한다.
- 같은 이름의 쿼리 파라미터가 여러 번 전달되면 배열이 될 수 있음을 고려한다.

### 레이아웃

- `pages/_layout.tsx`: 모든 페이지에 적용
- `pages/<section>/_layout.tsx`: 해당 폴더 아래 페이지에 적용
- 레이아웃은 상위에서 하위 순서로 중첩된다.
- 공통 헤더, 하단 메뉴, 배경, 안전 영역 처리는 전역 레이아웃에 둔다.
- 특정 기능에서만 필요한 UI는 해당 섹션 레이아웃에 둔다.

### 자동 생성 파일

`src/router.gen.ts`는 Router 플러그인이 생성하는 타입 파일이다.

- 직접 수정하지 않는다.
- 페이지 추가·삭제 후 개발 명령으로 다시 생성한다.
- 경로나 파라미터 타입 오류는 TypeScript 검사에서 확인한다.

## card-forge 구현 체크리스트

- [ ] 새 화면은 `pages/`에 추가하고 `createRoute` 경로를 선언한다.
- [ ] 화면 이동은 `useNavigation`을 사용한다.
- [ ] 전달값은 `validateParams`로 검증한다.
- [ ] 공통 UI는 적절한 `_layout.tsx`에 둔다.
- [ ] `src/router.gen.ts`를 직접 편집하지 않는다.
- [ ] 사용자 식별값과 게임 결과는 서버에서 검증한다.
- [ ] 토스 로그인·결제 등 서버 API 연동 시 공식 보안 규격을 다시 확인한다.
- [ ] 일반 iframe을 사용하지 않는다.

## 세부 Granite Router 문서

- [Router 플러그인](https://github.com/toss/granite/blob/main/docs/guides/granite-router/plugin-router.md)
- [화면 이동](https://github.com/toss/granite/blob/main/docs/guides/granite-router/routing.md)
- [화면 파라미터](https://github.com/toss/granite/blob/main/docs/guides/granite-router/params.md)
- [레이아웃](https://github.com/toss/granite/blob/main/docs/guides/granite-router/layouts.md)
