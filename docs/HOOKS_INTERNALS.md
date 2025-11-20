# React Hooks 내부 동작 원리

이 문서는 React Hooks가 **어떻게 구현되고 동작하는지**를 설명합니다. 코드보다는 **개념과 메커니즘**에 집중합니다.

---

## 📚 목차

1. [Hooks의 기본 원리](#1-hooks의-기본-원리)
2. [useState 내부 동작](#2-usestate-내부-동작)
3. [useEffect 내부 동작](#3-useeffect-내부-동작)
4. [useMemo 내부 동작](#4-usememo-내부-동작)
5. [useCallback 내부 동작](#5-usecallback-내부-동작)
6. [useRef 내부 동작](#6-useref-내부-동작)
7. [Hooks가 동작하는 전체 흐름](#7-hooks가-동작하는-전체-흐름)

---

## 1. Hooks의 기본 원리

### 🎯 핵심 개념: "컴포넌트별 상태 저장소"

Hooks는 **전역 상태 저장소**를 사용하여 각 컴포넌트의 상태를 관리합니다.

```
전역 Context
├─ hooks
│  ├─ state: Map<경로, Hook배열>
│  ├─ cursor: Map<경로, 현재인덱스>
│  └─ componentStack: [렌더링중인컴포넌트경로]
└─ effects
   └─ queue: [실행할effect함수들]
```

### 📍 컴포넌트 경로(Path)란?

각 컴포넌트 인스턴스는 **고유한 경로**를 가집니다:

- `"root"` - 최상위 컴포넌트
- `"root.0"` - 첫 번째 자식
- `"root.0.button-123"` - key가 있는 경우 포함

이 경로를 사용해서 "어떤 컴포넌트의 상태인지" 구분합니다.

### 🔢 커서(Cursor)란?

컴포넌트가 렌더링될 때, Hook이 호출될 때마다 **커서가 증가**합니다:

1. `useState()` 호출 → 커서 0번 사용
2. `useEffect()` 호출 → 커서 1번 사용  
3. `useState()` 호출 → 커서 2번 사용

**중요:** Hook은 항상 **같은 순서**로 호출되어야 합니다!

---

## 2. useState 내부 동작

### 🔄 렌더링 흐름

#### 1단계: Hook 저장소 확인

컴포넌트가 렌더링될 때:

1. 현재 컴포넌트의 **경로**를 확인
2. 현재 **커서 위치**를 확인
3. 해당 위치에 저장된 Hook이 있는지 확인

#### 2단계: 초기화 vs 재사용

**첫 렌더링 (Mount):**
- 저장소에 Hook이 없음
- 초기값으로 상태 생성
- 저장소에 저장

**재렌더링 (Update):**
- 저장소에서 기존 상태를 꺼냄
- 그대로 반환

#### 3단계: setState 함수 생성

setState는 **클로저**를 활용합니다:

- **저장 시점의 커서 위치**를 기억
- 호출되면:
  1. 저장소의 **해당 위치 상태**를 업데이트
  2. **재렌더링 예약** (batching 사용)

### 🎯 핵심 메커니즘

**왜 useState가 상태를 유지할 수 있나?**

```
렌더링 1:
  └─ useState() 호출
      └─ 저장소["root"][0] = { value: 0 }
      └─ setState를 클로저로 만듦 (인덱스 0 기억)

사용자가 setState(1) 호출:
  └─ 저장소["root"][0] = { value: 1 }
  └─ 재렌더링 예약

렌더링 2:
  └─ useState() 호출
      └─ 저장소["root"][0] 확인
      └─ { value: 1 } 발견!
      └─ 1 반환
```

---

## 3. useEffect 내부 동작

### 📊 저장 구조

각 useEffect Hook은 다음을 저장합니다:

```
{
  deps: [이전의존성배열],
  cleanup: 이전cleanup함수
}
```

### 🔄 실행 흐름

#### 1단계: 의존성 비교

렌더링 중에 useEffect가 호출되면:

1. 저장소에서 **이전 의존성 배열** 가져오기
2. 현재 의존성과 **얕은 비교** (shallowEquals)
3. 변경 여부 판단

#### 2단계: Effect 예약

**의존성이 변경된 경우:**

1. 이전 cleanup 함수가 있으면 **먼저 실행**
2. 새 effect 함수를 **큐에 추가**
3. 의존성 배열 업데이트

**의존성이 안 변한 경우:**
- 아무것도 안 함

#### 3단계: Effect 실행 타이밍

**중요:** Effect는 **렌더링 이후**에 실행됩니다!

```
1. 컴포넌트 렌더링 시작
2. useEffect 호출 → 큐에 추가만 함
3. 렌더링 완료 (DOM 업데이트)
4. Effect 큐의 모든 함수 실행 (비동기, queueMicrotask 사용)
```

### 🎯 핵심 메커니즘

**왜 useEffect는 렌더링 후에 실행되나?**

- 렌더링 중에 실행하면 **무한 루프** 가능
- DOM 업데이트가 완료된 후 실행해야 안전
- **queueMicrotask**를 사용해 마이크로태스크 큐에 예약

---

## 4. useMemo 내부 동작

### 📊 저장 구조

```
{
  deps: [이전의존성배열],
  value: 계산된값
}
```

### 🔄 실행 흐름

#### 1단계: 캐시 확인

useMemo가 호출되면:

1. 저장소에서 이전 Hook 데이터 가져오기
2. **이전 의존성**과 **현재 의존성** 비교

#### 2단계: 재계산 여부 결정

**의존성이 변경된 경우:**
1. factory 함수 **실행**
2. 결과값 저장
3. 의존성 배열 업데이트
4. 새 값 반환

**의존성이 안 변한 경우:**
- 저장된 값을 그대로 반환 (재계산 안 함!)

### 🎯 핵심 메커니즘

**메모이제이션의 원리:**

```
렌더링 1:
  └─ useMemo(() => expensiveCalc(a), [a])
      └─ a = 1
      └─ expensiveCalc 실행 (오래 걸림...)
      └─ 저장: { deps: [1], value: 100 }

렌더링 2 (a는 그대로 1):
  └─ useMemo(() => expensiveCalc(a), [a])
      └─ 이전 deps [1]과 현재 [1] 비교
      └─ 같음! → expensiveCalc 실행 안 함
      └─ 저장된 value: 100 반환

렌더링 3 (a가 2로 변경):
  └─ useMemo(() => expensiveCalc(a), [a])
      └─ 이전 deps [1]과 현재 [2] 비교
      └─ 다름! → expensiveCalc 다시 실행
      └─ 저장: { deps: [2], value: 200 }
```

---

## 5. useCallback 내부 동작

### 🎯 핵심: useMemo의 특수 케이스

useCallback은 **useMemo를 래핑**한 것입니다:

```
useCallback(fn, deps) = useMemo(() => fn, deps)
```

### 🔄 실행 흐름

useCallback은 내부적으로 useMemo를 호출하므로 **동작 방식이 동일**합니다.

차이점:
- useMemo: 함수를 **실행**해서 **결과값** 저장
- useCallback: 함수 **자체**를 저장

### 🎯 핵심 메커니즘

**왜 useCallback이 필요한가?**

함수는 매 렌더링마다 **새로 생성**됩니다:

```
렌더링 1:
  └─ const fn = () => console.log('hi')  // 함수 객체 A

렌더링 2:
  └─ const fn = () => console.log('hi')  // 함수 객체 B (새로 생성!)
```

같은 코드지만 **참조가 다름**! (A !== B)

**useCallback 사용 시:**

```
렌더링 1:
  └─ const fn = useCallback(() => console.log('hi'), [])
      └─ 저장: { deps: [], value: 함수A }

렌더링 2:
  └─ const fn = useCallback(() => console.log('hi'), [])
      └─ deps 비교 ([] === [])
      └─ 저장된 함수A 반환 (새로 안 만듦!)
```

**결과:** 자식 컴포넌트에 전달된 props가 안 바뀜 → 리렌더링 방지!

---

## 6. useRef 내부 동작

### 🎯 핵심: useState + 렌더링 스킵

useRef는 내부적으로 **useState를 사용**합니다:

```
useRef(initialValue) ≈ useState({ current: initialValue })[0]
```

### 🔄 실행 흐름

#### 1단계: 초기화

첫 렌더링:
- useState로 `{ current: initialValue }` 객체 생성
- 이 객체의 **참조**만 반환 (setState는 버림)

#### 2단계: 값 변경

`.current`를 변경해도:
- 단순히 **객체의 속성** 변경
- setState를 안 호출하므로 **재렌더링 안 됨**

#### 3단계: 참조 유지

다음 렌더링:
- useState가 **같은 객체 반환**
- 객체 참조가 그대로 유지됨

### 🎯 핵심 메커니즘

**useState vs useRef:**

| | useState | useRef |
|---|---|---|
| 값 변경 | `setState(newValue)` | `ref.current = newValue` |
| 재렌더링 | ✅ 트리거함 | ❌ 트리거 안 함 |
| 참조 유지 | ❌ 새 값 반환 | ✅ 같은 객체 |
| 용도 | UI 상태 | DOM 참조, 변경 추적 안 할 값 |

---

## 7. Hooks가 동작하는 전체 흐름

### 🔄 렌더링 사이클

```
1. 사용자 액션 (버튼 클릭 등)
   └─ setState() 호출

2. 재렌더링 예약
   └─ enqueueRender() → queueMicrotask에 render 등록

3. 마이크로태스크 큐 실행
   └─ render() 함수 실행

4. Reconciliation (재조정)
   ├─ 컴포넌트 함수 호출
   ├─ Hook 호출 (useState, useEffect 등)
   │  ├─ 저장소에서 이전 상태 가져오기
   │  ├─ 커서 증가
   │  └─ Effect는 큐에 추가만
   ├─ VNode 트리 생성
   └─ DOM 업데이트

5. Layout Effects 실행 (없으면 스킵)

6. Effect 실행
   └─ queueMicrotask로 effect 큐의 모든 함수 실행
```

### 🎯 핵심 원칙

#### 1. Hook 호출 순서는 항상 같아야 함

**왜?** 커서 기반이므로!

```
❌ 잘못된 사용:
if (condition) {
  useState(0);  // 조건부로 호출하면 순서가 바뀜!
}

✅ 올바른 사용:
useState(0);
if (condition) {
  // 상태를 사용하되, 호출 순서는 유지
}
```

#### 2. Hook은 컴포넌트 최상위에서만 호출

**왜?** 매 렌더링마다 같은 순서를 보장하기 위해!

#### 3. Effect는 비동기로 실행

**왜?** 렌더링 중 부작용을 방지하기 위해!

### 📊 상태 저장소 구조 예시

```
전역 Context.hooks.state:
{
  "root": [
    { value: 0 },                    // useState (커서 0)
    { deps: [], cleanup: null },     // useEffect (커서 1)
    { deps: [1], value: 100 }        // useMemo (커서 2)
  ],
  "root.0": [
    { current: null },               // useRef (커서 0)
    { deps: [], value: fn }          // useCallback (커서 1)
  ]
}
```

---

## 🎓 정리

### Hook별 핵심 원리

| Hook | 저장 내용 | 재계산 조건 | 부작용 |
|------|----------|-----------|--------|
| **useState** | `{ value }` | setState 호출 시 | 재렌더링 |
| **useEffect** | `{ deps, cleanup }` | deps 변경 시 | Effect 실행 |
| **useMemo** | `{ deps, value }` | deps 변경 시 | 없음 |
| **useCallback** | `{ deps, value }` | deps 변경 시 | 없음 |
| **useRef** | `{ current }` | 없음 | 없음 |

### 전체 동작 핵심

1. **저장소 기반:** 전역 Map에 컴포넌트별 상태 저장
2. **커서 기반:** Hook 호출 순서로 상태 식별
3. **의존성 비교:** 얕은 비교로 재계산 여부 결정
4. **비동기 실행:** Effect는 렌더링 후 마이크로태스크로 실행
5. **클로저 활용:** setState, cleanup 함수가 상태 참조 유지

---

## 🔍 더 깊이 이해하기

### Q1: useState가 클로저를 사용하는 이유?

setState 함수는 **생성 시점의 커서 인덱스**를 기억해야 합니다. 나중에 호출될 때 "어떤 상태를 업데이트할지" 알아야 하기 때문입니다.

### Q2: 왜 Hook 순서가 중요한가?

커서로 상태를 식별하므로, 순서가 바뀌면 **잘못된 상태**를 가져옵니다:

```
첫 렌더링:
  0: useState(0)     → 0
  1: useState("hi")  → "hi"

두 번째 렌더링 (조건부로 첫 Hook 스킵):
  0: useState("hi")  → 0을 가져옴 (잘못됨!)
```

### Q3: useEffect가 비동기인 이유?

렌더링 중에 Effect를 실행하면:
- 또 다른 setState 호출 가능
- 무한 루프 발생 가능
- DOM 업데이트 전에 실행되어 오류 발생

따라서 **렌더링 완료 후** 안전하게 실행합니다.

### Q4: useMemo와 useCallback의 실제 차이?

**useMemo:**
```
useMemo(() => a + b, [a, b])
→ factory 함수 실행 → 결과값 저장
```

**useCallback:**
```
useCallback(() => doSomething(), [])
→ 함수 자체를 저장 (실행 안 함)
```

useMemo는 "무엇을 계산할지"를, useCallback은 "어떤 함수를 기억할지"를 정의합니다.

---

이제 Hook이 **어떻게** 동작하는지 완벽하게 이해하셨을 거예요! 🎉

