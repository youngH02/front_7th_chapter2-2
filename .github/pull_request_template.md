## 과제 체크포인트

### 배포 링크

https://youngh02.github.io/front_7th_chapter2-2/

### 기본과제

#### Phase 1: VNode와 기초 유틸리티
- [x] `core/elements.ts`: `createElement`, `normalizeNode`, `createChildPath`
- [x] `utils/validators.ts`: `isEmptyValue`
- [x] `utils/equals.ts`: `shallowEquals`, `deepEquals`

#### Phase 2: 컨텍스트와 루트 초기화
- [x] `core/types.ts`: VNode/Instance/Context 타입 선언
- [x] `core/context.ts`: 루트/훅 컨텍스트와 경로 스택 관리
- [x] `core/setup.ts`: 컨테이너 초기화, 컨텍스트 리셋, 루트 렌더 트리거

#### Phase 3: DOM 인터페이스 구축
- [x] `core/dom.ts`: 속성/스타일/이벤트 적용 규칙, DOM 노드 탐색/삽입/제거

#### Phase 4: 렌더 스케줄링
- [x] `utils/enqueue.ts`: `enqueue`, `withEnqueue`로 마이크로태스크 큐 구성
- [x] `core/render.ts`: `render`, `enqueueRender`로 루트 렌더 사이클 구현

#### Phase 5: Reconciliation

- [x] `core/reconciler.ts`: 마운트/업데이트/언마운트, 자식 비교, key/anchor 처리
- [x] `core/dom.ts`: Reconciliation에서 사용할 DOM 재배치 보조 함수 확인

#### Phase 6: 기본 Hook 시스템
- [x] `core/hooks.ts`: 훅 상태 저장, `useState`, `useEffect`, cleanup/queue 관리
- [x] `core/context.ts`: 훅 커서 증가, 방문 경로 기록, 미사용 훅 정리

**기본 과제 완료 기준**: `basic.equals.test.tsx`, `basic.mini-react.test.tsx` 전부 통과

### 심화과제

#### Phase 7: 확장 Hook & HOC
- [x] `hooks/useRef.ts`: ref 객체 유지
- [x] `hooks/useMemo.ts`, `hooks/useCallback.ts`: shallow 비교 기반 메모이제이션
- [x] `hooks/useDeepMemo.ts`, `hooks/useAutoCallback.ts`: deep 비교/자동 콜백 헬퍼
- [x] `hocs/memo.ts`, `hocs/deepMemo.ts`: props 비교 기반 컴포넌트 메모이제이션

## 과제 셀프회고

과제 시작 시 막막함을 느껴 easy 난이도의 Virtual DOM 구현부터 시작했는데, 이 접근이 전체 구조를 이해하는 데 도움이 되었습니다. 처음 시작이 되니 그래도..방향을 잡기 수월했습니다. 초반 Phase들(VNode, Context, DOM 조작)은 어느 정도 이해하며 구현할 수 있었지만, Hooks 부분으로 갈수록 커서 기반 상태 관리와 클로저 활용이 복잡하게 느껴졌습니다. 특히 hooks들의 실행 타이밍과 의존성 배열 비교 로직은 여전히 어려워 추가로 살펴볼 예정입니다. 그래도 React의 내부 동작 원리를 직접 구현하며 아주 조금 React를 알게된 것 같습니다...

### 아하! 모먼트 (A-ha! Moment)

**1. React가 불변성을 강조하는 이유**

- **shallowEquals**: 1단계 속성의 참조만 비교 (빠름)
- **deepEquals**: 모든 깊이 재귀적으로 비교 (느림)
- **불변성을 지키면**: 상태 변경 시 새 객체 생성 → 참조가 바뀜 → shallow 비교로 변경 감지 가능
- **불변성을 안 지키면**: 기존 객체 수정 → 참조가 같음 → shallow 비교로 변경 감지 불가 → deep 비교 필요 (느림)


```typescript
// 불변성 지킴 
const oldState = { user: { name: "React", age: 10 } };
const newState = { ...oldState, user: { ...oldState.user, age: 11 } };
shallowEquals(oldState, newState); // false (user 참조가 바뀜 → 변경 감지!)

// 불변성 안 지킴 ❌
const oldState2 = { user: { name: "React", age: 10 } };
oldState2.user.age = 11; // 기존 객체 수정
shallowEquals(oldState2, oldState2); // true (참조 같음 → 변경 감지 불가!)
```

**2. Hook은 호출 순서로 관리된다**

Hook은 변수명이 아니라 **배열 인덱스**로 상태를 식별합니다. 따라서:
- 조건부 호출 시 인덱스가 꼬여서 잘못된 상태 반환
- **클로저**로 setState가 생성 시점의 인덱스를 기억
- "Hook은 최상위에서만 호출" 규칙의 근본적 이유를 이해함

```typescript
// 잘못된 사용: 조건부 Hook 호출
function Counter() {
  const [count, setCount] = useState(0); // 인덱스 0
  
  if (count > 0) {
    const [name, setName] = useState(""); // 인덱스 1 (조건부!)
  }
  
  const [age, setAge] = useState(20); // 인덱스 1 또는 2?
}

// 첫 렌더링 (count = 0)
// useState(0) → 인덱스 0에 저장
// if 문 스킵
// useState(20) → 인덱스 1에 저장

// 두 번째 렌더링 (count = 1)
// useState(0) → 인덱스 0 읽음 ✅
// useState("") → 인덱스 1 읽음 ❌ (20이 나옴!)
// useState(20) → 인덱스 2 읽음 ❌ (undefined!)

// 올바른 사용: 항상 같은 순서로 호출
function Counter() {
  const [count, setCount] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState(20);
  
  // 조건부로 사용하되, 호출 순서는 유지
  if (count > 0) {
    // name 사용
  }
}
```

**3. Attribute vs Property의 차이**

- **Attribute**: HTML 문서에 쓰인 초기값 (`setAttribute`)
- **Property**: JavaScript 객체의 현재 값 (`dom.value = ...`)
- `value`, `checked` 등은 **property로 설정해야 실제 값이 변경됨**
- 이를 놓쳐서 URL 복원 시 input에 값이 안 나타나는 문제가 있었고, property로 수정하여 해결

```typescript
// 잘못된 방법: setAttribute 사용
const input = document.createElement('input');
input.setAttribute('value', '젤리');
console.log(input.value); // "" (빈 문자열! 실제 값은 안 바뀜)

// 올바른 방법: property 직접 설정
const input2 = document.createElement('input');
input2.value = '젤리';
console.log(input2.value); // "젤리" (실제 값 변경됨!)

<input value={searchQuery} /> // value는 property로 처리해야 함
```

**4. queueMicrotask로 렌더링 배치 처리**

- 동기 코드 실행 → Microtask (렌더링) → Macrotask 순서
- 여러 setState 호출을 한 번의 렌더링으로 배치 처리
- React의 Automatic Batching 동작 원리를 이해함

```typescript
// 여러 setState 호출
setCount(1);
setName("React");
setAge(10);

// queueMicrotask로 배치 처리
// → 동기 코드 모두 실행 완료 후
// → 한 번의 렌더링으로 모든 상태 업데이트 반영

// 실행 순서:
// 1. setState 호출들 (동기)
// 2. 렌더링 (microtask) ← 한 번만 실행!
// 3. setTimeout 등 (macrotask)
```

### 기술적 성장

**핵심 개념 학습**

1. **Reconciliation**: 타입 비교 → DOM 재사용 여부 결정 → 속성만 업데이트 → DOM 조작 최소화
2. **커서 기반 Hook 관리**: `Map<컴포넌트경로, Hook배열>`로 각 컴포넌트의 상태를 독립적으로 관리
3. **클로저 활용**: setState가 생성 시점의 인덱스를 기억하여 나중에 호출해도 정확한 상태 업데이트
4. **Property vs Attribute**: input의 `value`는 property로 설정해야 실제 값 변경

**만족스러운 구현**

1. **context.ts getter 패턴**: 스택이 비어있을 때 명확한 에러 제공 ("훅은 컴포넌트 내부에서만 호출")
2. **withEnqueue 클로저**: `scheduled` 플래그를 클로저로 캡슐화하여 배치 렌더링 구현
3. **커서와 상태 분리**: cursor(순서 추적)와 state(값 저장)를 분리하여 매 렌더링마다 cursor만 초기화

### 학습 효과 분석

**React Rules의 근본적 이유를 이해함**

| 규칙 | 이전 | 이후 (구현 후) |
|------|------|--------------|
| Hook 최상위 호출 | ESLint가 시키니까 | 커서 기반이라 순서 바뀌면 상태 꼬임 |
| key 사용 | 경고 안 뜨게 | 경로 생성 시 리스트 재정렬에도 상태 유지 |
| 의존성 배열 정확히 | 습관적으로 | shallowEquals 비교라 누락 시 effect 미실행 |
| 불변성 유지 | 권장사항 | shallow 비교가 빠르므로 참조만 바꾸면 됨 |

### 과제 피드백

**과제에서 좋았던 부분**

1. 단계별 구성: Reade.md에 순서가 정리되어 있어 따라가기 좋았습니다. VNode 정규화 → Context 관리 → DOM 조작 → 렌더 스케줄링 → Reconciliation → Hooks 순서로 자연스럽게 학습할 수 있었습니다.
2. 테스트 주도 학습: 각 Phase마다 테스트가 제공되어, 구현이 올바른지 즉시 확인할 수 있었습니다.
3. 주석과 가이드: 각 함수에 "여기를 구현하세요"와 함께 단계별 힌트가 있어서, 막막하지 않고 차근차근 진행할 수 있었습니다.

**과제에서 모호하거나 애매했던 부분**

1. **createChildPath의 inferredIndex**: siblings를 필터링해서 같은 타입의 인덱스를 계산하는 로직이 처음에는 이해하기 어려웠습니다. 왜 이렇게 복잡하게 계산하는지 예시가 더 있었으면 좋았을 것 같습니다.
2. **Fragment 처리**: Fragment가 DOM에 추가되면 사라진다는 특성 때문에, insertInstance와 removeInstance에서 어떻게 처리해야 할지 고민이 많았습니다. Fragment의 생명주기에 대한 설명이 더 있었으면 좋았을 것 같습니다.
3. **Effect 실행 타이밍**: useEffect가 렌더링 후 비동기로 실행된다는 것은 알았지만, 정확히 언제 cleanup이 실행되고 언제 새 effect가 실행되는지 순서가 헷갈렸습니다. 타임라인 다이어그램이 있었다면 더 좋았을 것 같습니다.

## 리뷰 받고 싶은 내용

### 1. DOM Property 처리 범위

현재 `value`, `checked`, `disabled`, `readOnly`, `selected`를 property로 처리하고 있습니다. 추가로 property로 처리해야 하는 속성이 있을까요? (예: `indeterminate`, `scrollTop`, `selectedIndex` 등)

### 2. reconcile 함수 리팩토링

약 150줄의 `reconcile` 함수를 타입별로 분리(`reconcileTextNode`, `reconcileFragment` 등)하는 것이 좋을지, 아니면 현재처럼 한 함수에서 처리하는 것이 전체 흐름 파악에 더 나은지 궁금합니다.

### 3. createChildPath의 inferredIndex 계산 로직

```typescript
const inferredIndex =
  key != null || !siblings ? index : siblings.slice(0, index).filter((sibling) => sibling?.type === nodeType).length;
```

같은 타입의 컴포넌트들 사이에서만 인덱스를 계산하는 이유가 무엇인가요? 전체 siblings 배열의 index를 사용하는 것과 비교했을 때 어떤 장단점이 있나요?

### 4. Fragment의 DOM 처리 방식

Fragment가 DOM에 추가되면 사라진다는 특성 때문에 `insertInstance`와 `removeInstance`에서 어떻게 처리해야 할지 고민이 많았습니다. Fragment의 생명주기를 더 명확하게 처리할 방법이 있을까요?

### 5. useEffect cleanup 실행 타이밍

현재 구현에서는 의존성이 변경되면 이전 cleanup을 동기적으로 실행한 후 새 effect를 큐에 추가합니다. 이 순서가 실제 React의 동작과 일치하는지, 특히 cleanup이 동기적으로 실행되는 것이 맞는지 궁금합니다.

1. 이전 cleanup 함수 실행
2. 새 effect 함수를 큐에 추가
3. 렌더링 완료 후 큐의 effect 실행

### 6. 전역 context vs 인스턴스 context

현재 전역 `context` 객체를 사용 중인데, 실무에서 여러 React 루트를 지원하려면 각 루트마다 별도 context 인스턴스를 생성해야 할까요?
