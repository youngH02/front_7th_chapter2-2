# Virtual DOM 구현 가이드

React처럼 동작하는 Virtual DOM 시스템의 핵심 개념과 구현 원리를 정리한 문서입니다.

## 📚 목차

1. [Virtual DOM이란?](#virtual-dom이란)
2. [핵심 모듈](#핵심-모듈)
3. [전체 동작 흐름](#전체-동작-흐름)
4. [성능 최적화 전략](#성능-최적화-전략)

---

## Virtual DOM이란?

### 개념

Virtual DOM은 실제 DOM의 경량화된 JavaScript 객체 표현입니다. 상태가 변경되면 새로운 Virtual DOM을 생성하고, 이전 Virtual DOM과 비교(Diffing)하여 변경된 부분만 실제 DOM에 반영합니다.

- **VNode (Virtual Node)**: DOM 요소를 나타내는 JavaScript 객체
- **Diffing**: 이전 VNode와 새 VNode를 비교하는 알고리즘
- **Reconciliation**: 변경된 부분만 실제 DOM에 반영하는 과정

### 왜 사용하나?

**문제점**: 실제 DOM 조작은 비용이 높습니다.

- 매번 DOM을 조작하면 리플로우/리페인트 발생
- 여러 곳에서 동시에 DOM 변경 시 비효율적

**해결책**: Virtual DOM으로 변경사항을 모아서 한 번에 처리

- 변경된 부분만 찾아서 업데이트
- 여러 변경사항을 배치 처리

### 주요 장점

1. **성능**: 최소한의 DOM 조작
2. **선언적 UI**: 상태 기반으로 UI 자동 업데이트
3. **추상화**: 플랫폼 독립적 (DOM, Native 등)

---

## 전체 아키텍처

```
┌─────────────────────────────────────────────────┐
│                   Application                    │
│  (Components, State, User Interactions)         │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│              JSX → VNode 변환                    │
│         (createVNode - Babel/ESBuild)           │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│              VNode 정규화                        │
│      (normalizeVNode - 컴포넌트 실행)           │
└─────────────────┬───────────────────────────────┘
                  │
                  ↓
┌─────────────────────────────────────────────────┐
│               렌더링 판단                        │
│         (renderElement - 최초 vs 업데이트)      │
└─────┬───────────────────────────────────┬───────┘
      │                                   │
      ↓ (최초)                            ↓ (업데이트)
┌─────────────────┐              ┌──────────────────┐
│  createElement  │              │  updateElement   │
│  (DOM 생성)     │              │  (Diffing)       │
└─────────────────┘              └──────────────────┘
      │                                   │
      └────────────────┬──────────────────┘
                       ↓
              ┌─────────────────┐
              │   실제 DOM 반영  │
              └─────────────────┘
```

---

## 핵심 모듈

### 1. createVNode - VNode 생성

JSX를 JavaScript 객체(VNode)로 변환하는 함수입니다.

**동작**:

- Babel/ESBuild가 컴파일 타임에 JSX를 이 함수 호출로 변환
- HTML 태그명(문자열) 또는 컴포넌트(함수)를 type으로 저장
- props와 children을 객체로 구조화

**예시**:

```javascript
// JSX
<div className="box">Hello</div>

// 변환 결과
{ type: "div", props: { className: "box" }, children: ["Hello"] }
```

---

### 2. normalizeVNode - VNode 정규화

다양한 타입의 VNode를 일관된 형태로 변환합니다.

**처리 내용**:

- `null`, `undefined`, `boolean` → 빈 문자열
- 문자열/숫자 → 그대로 (텍스트 노드)
- 배열 → 평탄화
- **함수형 컴포넌트 → 실행하여 실제 VNode로 변환**

**핵심**: 컴포넌트 함수를 호출하여 최종 HTML VNode로 만듭니다.

---

### 3. createElement - VNode → 실제 DOM

정규화된 VNode를 실제 DOM 요소로 생성합니다.

**처리 내용**:

- **배열 VNode**: `DocumentFragment` 생성 (wrapper 없이 여러 요소 추가)
- 텍스트 노드: `document.createTextNode()` 생성
- HTML 요소: `document.createElement()` 생성
- 속성 설정: `className`, `style`, 이벤트 리스너 등
- 자식 요소: 재귀적으로 생성하여 추가

**특징**: 최초 렌더링 시에만 사용됩니다.

**DocumentFragment 활용**:

- React Fragment(`<>...</>`) 패턴 지원
- 브라우저 DOM API의 일회용 임시 컨테이너
- DOM에 추가되면 자동으로 사라지고 자식들만 남음
- 여러 요소를 일괄 추가하여 Reflow 최소화 (10배 빠름)

---

### 4. updateElement - Diffing 알고리즘

이전 VNode와 새 VNode를 비교하여 변경된 부분만 실제 DOM에 반영합니다.

**Diffing 전략**:

1. **노드 삭제**: 새 VNode 없음 → DOM에서 제거
2. **노드 추가**: 이전 VNode 없음 → 새 DOM 생성
3. **노드 교체**: 타입 변경 (div → span) → DOM 교체
4. **텍스트 변경**: textContent만 수정
5. **속성 업데이트**: 같은 타입이면 속성만 변경
6. **자식 재귀**: 모든 자식에 대해 재귀적으로 diffing
7. **남은 자식 삭제**: 자식이 줄어들면 뒤에서부터 제거

**핵심**: 최소한의 DOM 조작으로 효율성 확보

---

### 5. renderElement - 렌더링 메인 로직

전체 렌더링 프로세스를 관리합니다.

**처리 흐름**:

1. VNode 정규화
2. 이전 VNode 확인 (WeakMap에 저장됨)
3. 최초 렌더링 → `createElement` 사용
4. 재렌더링 → `updateElement` 사용 (Diffing)
5. 현재 VNode 저장 (다음 비교용)
6. 이벤트 리스너 설정

**특징**: WeakMap으로 이전 VNode를 관리하여 메모리 누수 방지

---

## 전체 동작 흐름

### 1. 애플리케이션 시작

```
main.js 실행
  ↓
initRender() - Store 구독 설정
  ↓
router.start() - 라우팅 시작
  ↓
render() 최초 호출
```

### 2. JSX 변환 (빌드 타임)

```
개발자 작성 (JSX)
  ↓
Vite/ESBuild 컴파일
  ↓
createVNode() 함수 호출로 변환
  ↓
브라우저는 순수 JavaScript만 실행
```

**중요**: JSX는 브라우저로 전달되지 않습니다. 빌드 시점에 완전히 제거됩니다.

### 3. 렌더링 프로세스

```
Store/Router 변경
  ↓
notify() - 구독자에게 알림
  ↓
render() 호출 (withBatch로 중복 방지)
  ↓
renderElement() 실행
  ↓
normalizeVNode() - 컴포넌트 함수 실행
  ↓
최초 렌더링: createElement()
재렌더링: updateElement() (Diffing)
  ↓
실제 DOM 반영
```

### 4. 상태 업데이트 흐름

```
사용자 액션 / API 응답
  ↓
Store.dispatch() - 상태 즉시 변경
  ↓
Store.notify() - 구독자에게 알림
  ↓
withBatch - 중복 호출 방지
  ↓
queueMicrotask - 동기 코드 끝난 후 실행
  ↓
render() - 모든 Store 최신 상태 반영
  ↓
Virtual DOM Diffing
  ↓
변경된 부분만 DOM 업데이트
```

---

## 성능 최적화 전략

### 1. 배치 처리 (withBatch)

**목적**: 같은 이벤트 루프에서 여러 번 render 호출 시 1번만 실행

**구현 원리**:

- `scheduled` 플래그로 실행 여부 추적
- `queueMicrotask`로 동기 코드 완료 후 실행
- 중복 호출은 즉시 무시

**효과**:

- 여러 Store가 동시에 변경되어도 1번만 렌더링
- React의 Automatic Batching과 동일한 방식

**적용 범위**:

- ✅ 같은 동기 실행 컨텍스트
- ✅ 같은 이벤트 핸들러 내부
- ❌ 비동기 콜백 (setTimeout, API 응답 등)

### 2. Virtual DOM Diffing

**목적**: 변경된 부분만 DOM 업데이트

**최적화 포인트**:

- 타입이 다르면 즉시 교체 (불필요한 비교 생략)
- 텍스트 노드는 textContent만 변경
- 속성은 변경된 것만 업데이트
- 자식이 줄어들면 뒤에서부터 제거

**효과**: 불필요한 DOM 조작 최소화

### 3. WeakMap 사용

**목적**: 이전 VNode 저장 및 메모리 관리

**장점**:

- 컨테이너를 키로 사용
- 컨테이너가 제거되면 VNode도 자동 GC
- 메모리 누수 방지

### 4. 이벤트 위임

**목적**: 이벤트 리스너 효율적 관리

**구현**:

- 각 요소에 개별 리스너 등록하지 않음
- 상위 요소에서 이벤트 캡처 후 위임
- 동적 요소 추가/제거 시에도 동작

---

## 핵심 개념 정리

### Virtual DOM의 장점

1. **성능**: 변경 감지 및 최소 업데이트
2. **추상화**: 플랫폼 독립적 (웹, 모바일 등)
3. **선언적**: 상태만 관리하면 UI 자동 업데이트
4. **배치 처리**: 여러 변경사항을 모아서 처리

### 제약사항

1. **메모리**: VNode 객체 생성 비용
2. **초기 렌더링**: 첫 렌더링은 직접 DOM 조작과 유사
3. **복잡도**: 간단한 UI는 오히려 오버헤드

### React와의 차이점

**유사점**:

- Virtual DOM 개념
- Diffing 알고리즘
- Batching 메커니즘
- 함수형 컴포넌트

**차이점**:

- React는 Fiber 아키텍처 (더 정교한 스케줄링)
- React는 key 기반 diffing 지원
- React는 Concurrent Mode, Suspense 등 고급 기능
- 우리 구현은 교육용 단순화 버전

---

## 학습 포인트

### 이 구현을 통해 배울 수 있는 것

1. **프레임워크 내부 동작**: React가 어떻게 작동하는지 이해
2. **성능 최적화**: Batching, Diffing의 중요성
3. **이벤트 루프**: JavaScript 비동기 처리 메커니즘
4. **설계 패턴**: Observer, Factory, Reconciliation

### 실무 적용

- Virtual DOM 개념은 React, Vue, Preact 등에서 공통적으로 사용
- Diffing 알고리즘은 데이터 동기화, 버전 관리 등에도 활용
- Batching 패턴은 성능 최적화의 핵심 기법

---

## 참고 자료

- **React 공식 문서**: https://react.dev
- **Virtual DOM 개념**: https://react.dev/learn/preserving-and-resetting-state
- **Reconciliation**: https://react.dev/learn/reconciliation
- **JSX Transform**: https://babeljs.io/docs/babel-plugin-transform-react-jsx
- **JavaScript 이벤트 루프**: https://developer.mozilla.org/ko/docs/Web/JavaScript/Event_loop
- **DocumentFragment API**: https://developer.mozilla.org/ko/docs/Web/API/DocumentFragment
