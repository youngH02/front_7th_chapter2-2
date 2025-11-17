# Virtual DOM Q&A

---

## 1. Virtual DOM과 JSX 변환

### Q1: JSX는 무엇이고, JavaScript와 어떻게 다른가요?

**A**: JSX는 JavaScript의 **확장 문법**이며, JavaScript 자체는 아닙니다.

**핵심 이해**:

- JSX는 HTML처럼 생긴 **편의 문법** (Syntactic Sugar)
- 브라우저는 JSX를 **전혀 이해할 수 없음**
- 반드시 **빌드 도구로 변환** 필요 (Babel, ESBuild, Vite 등)

**예시**:

```javascript
// JSX (브라우저가 이해 못함 ❌)
const element = <div className="box">Hello</div>;

// JavaScript (브라우저가 이해함 ✅)
const element = createVNode("div", { className: "box" }, "Hello");
```

---

### Q2: JSX는 누가 변환하나요?

**A**: **빌드 도구(Vite + ESBuild)**가 변환합니다.

**변환 프로세스**:

1. **개발자**: JSX로 코드 작성
2. **Vite 서버**: .jsx 파일 요청 감지
3. **ESBuild**: JSX를 함수 호출로 변환
4. **브라우저**: 변환된 JavaScript 실행

**설정 위치**: `vite.config.js`

```javascript
esbuild: {
  jsx: "transform",           // JSX 변환 활성화
  jsxFactory: "createVNode",  // 사용할 함수명
}
```

**주석의 역할**: `/** @jsx createVNode */`

- ESBuild에게 "이 파일은 createVNode를 사용해!"라고 알려주는 힌트
- 실제 변환은 vite.config.js 설정이 담당

---

### Q3: 브라우저에 JSX가 전달되나요?

**A**: 아니요! **절대 전달되지 않습니다.**

**개발 환경**:

```
JSX 코드 작성
  ↓
Vite 서버가 실시간 변환
  ↓
JavaScript로 변환된 코드를 브라우저로 전송
  ↓
브라우저는 JSX를 한 번도 보지 못함
```

**배포 환경** (`npm run build`):

```
JSX 코드
  ↓
빌드 시점에 완전히 변환
  ↓
dist/ 폴더에 순수 JavaScript만 생성
  ↓
JSX 흔적 완전히 제거
```

**확인 방법**:

- 브라우저 개발자 도구 → Sources 탭 → 전송된 파일 확인
- `npm run build` 후 `dist/` 폴더 파일 확인
- JSX 구문은 어디에도 없음!

---

### Q4: Virtual DOM은 어떻게 실제 DOM이 되나요?

**A**: `createElement` 함수가 VNode를 실제 DOM으로 변환합니다.

**변환 과정**:

1. **VNode 생성** (JavaScript 객체)

   ```javascript
   { type: "div", props: { className: "box" }, children: ["Hello"] }
   ```

2. **createElement 실행**
   - `document.createElement("div")` 호출
   - `div.className = "box"` 속성 설정
   - `div.appendChild(textNode)` 자식 추가

3. **실제 DOM 생성**

   ```html
   <div class="box">Hello</div>
   ```

4. **DOM에 추가**
   ```javascript
   container.appendChild(div);
   ```

**핵심**: VNode는 "설계도"이고, createElement는 "시공사"입니다.

---

### Q5: 함수 호출은 누가 하나요?

**A**: 우리가 설계한 시스템이 **명시적으로 호출**합니다.

**전체 호출 체인**:

```
1. Store 변경 (productStore.dispatch)
   ↓
2. Store.notify() - 구독자에게 알림
   ↓
3. render() - 구독했으므로 자동 호출
   ↓
4. renderElement() - render 내부에서 명시적 호출
   ↓
5. normalizeVNode() - renderElement 내부에서 호출
   ↓
6. createElement() - renderElement 내부에서 호출
   ↓
7. document.createElement() - 실제 DOM 생성
```

**핵심**: 자동으로 호출되는 게 아니라, Observer 패턴으로 연결한 것입니다.

---

### Q6: Virtual DOM과 실제 DOM의 차이는?

**A**: Virtual DOM은 JavaScript 객체, 실제 DOM은 브라우저 API 객체입니다.

**비교**:

| 특징      | Virtual DOM      | 실제 DOM                   |
| --------- | ---------------- | -------------------------- |
| 타입      | JavaScript 객체  | HTMLElement 객체           |
| 생성      | `createVNode()`  | `document.createElement()` |
| 비용      | 매우 저렴        | 비쌈 (리플로우/리페인트)   |
| 속도      | 빠름 (메모리)    | 느림 (브라우저 렌더링)     |
| 비교      | 쉬움 (객체 비교) | 어려움 (DOM API)           |
| 화면 반영 | 안 됨            | 됨                         |

**전략**: Virtual DOM으로 변경사항 계산 → 최소한만 실제 DOM 반영

---

## 2. 이벤트 루프와 배치 처리

### Q1: withBatch는 왜 필요한가요?

**A**: 같은 시점에 여러 Store가 변경되면 render가 여러 번 호출되는데, 이를 1번으로 줄이기 위해서입니다.

**문제 상황**:

```javascript
// 3개 Store가 render를 구독
productStore.subscribe(render);
cartStore.subscribe(render);
uiStore.subscribe(render);

// 동시에 변경
productStore.dispatch({ ... });  // render() 호출
cartStore.dispatch({ ... });     // render() 호출
uiStore.dispatch({ ... });       // render() 호출

// 문제: render가 3번 실행되어 DOM 조작 3번 발생
```

**해결**:

```javascript
// withBatch로 render를 감쌈
const render = withBatch(() => {
  renderElement(...);
});

// 동시에 변경해도
productStore.dispatch({ ... });  // render 예약
cartStore.dispatch({ ... });     // 무시 (이미 예약됨)
uiStore.dispatch({ ... });       // 무시 (이미 예약됨)

// 결과: render 1번만 실행 ✅
```

---

### Q2: scheduled 플래그는 어떻게 작동하나요?

**A**: 클로저를 이용해 "이미 예약되었는지" 추적합니다.

**구현 핵심**:

```javascript
export const withBatch = (fn) => {
  let scheduled = false; // 클로저 변수 (공유됨)

  return (...args) => {
    // 1차 방어: 이미 예약되었으면 무시
    if (scheduled) return;

    // 예약 표시
    scheduled = true;

    // Microtask에 등록
    queueMicrotask(() => {
      scheduled = false; // 리셋
      fn(...args); // 실제 실행
    });
  };
};
```

**동작 타임라인**:

```
t=0.000ms: render() 첫 호출
           scheduled = false → true
           queueMicrotask 등록

t=0.001ms: render() 두 번째 호출
           scheduled = true → return (무시)

t=0.002ms: render() 세 번째 호출
           scheduled = true → return (무시)

t=0.003ms: 동기 코드 종료

t=1ms:     Microtask 실행
           scheduled = false (리셋)
           실제 render() 실행 ✅
```

---

### Q3: queueMicrotask는 무엇이고 왜 사용하나요?

**A**: 동기 코드가 끝난 직후 실행되는 작업을 예약하는 API입니다.

**JavaScript 이벤트 루프 구조**:

```
1. Call Stack (동기 코드 실행)
   ↓
2. Microtask Queue ← queueMicrotask, Promise.then
   ↓
3. Render (화면 그리기)
   ↓
4. Macrotask Queue ← setTimeout, setInterval
```

**왜 queueMicrotask를 쓰나요?**

**이유 1: 즉시 실행**

- 동기 코드 끝나자마자 실행 (약 1ms 후)
- setTimeout(fn, 0)은 최소 4ms 지연

**이유 2: 배치 범위**

- 같은 동기 실행 컨텍스트의 모든 변경사항 모음
- setTimeout은 이미 scheduled가 false로 리셋되어 배치 안 됨

**비교 예시**:

```javascript
// queueMicrotask 사용 ✅
console.log("1. 시작");
queueMicrotask(() => console.log("3. Microtask"));
console.log("2. 끝");
// 출력: 1 → 2 → 3

// setTimeout 사용 ❌
console.log("1. 시작");
setTimeout(() => console.log("3. Timeout"), 0);
console.log("2. 끝");
// 출력: 1 → 2 → 3 (더 느림, 최소 4ms)
```

---

### Q4: 모든 Store 변경이 render 전에 완료되나요?

**A**: 네! **동기 코드에서 실행된 변경사항은 모두 완료**됩니다.

**핵심 이해**:

- Store의 `dispatch`는 **동기 함수**
- 상태 변경은 **즉시 완료**
- render는 **Microtask에서 실행** (나중에)

**실행 순서**:

```javascript
// === 동기 코드 (0ms) ===
productStore.dispatch({ products: [...] });
// → Store 상태 즉시 변경 ✅
console.log(productStore.getState());  // 최신 상태!

cartStore.dispatch({ items: [...] });
// → Store 상태 즉시 변경 ✅
console.log(cartStore.getState());     // 최신 상태!

uiStore.dispatch({ toast: "완료" });
// → Store 상태 즉시 변경 ✅
console.log(uiStore.getState());       // 최신 상태!

// === Microtask (1ms) ===
render()
  → 모든 Store의 최신 상태로 렌더링! 🎉
```

**장점**:

- ✅ 일관성: 모든 변경사항이 반영된 화면
- ✅ 성능: 1번만 렌더링
- ✅ 사용자 경험: 깜빡임 없음

---

### Q5: 비동기 작업 후에는 어떻게 되나요?

**A**: **새로운 이벤트 루프**에서 다시 렌더링됩니다.

**정상 동작**:

```javascript
export const loadProducts = async () => {
  // 1. 로딩 시작 (t=0ms, 동기 코드)
  productStore.dispatch({ loading: true });
  // → render() 예약

  // Microtask: render() 실행 (t=1ms)
  // 화면: 로딩 스피너 표시 ✅

  // 2. API 호출 (비동기, 500ms 소요)
  const products = await getProducts();
  // ← 여기서 이벤트 루프 끊김!

  // 3. 데이터 로드 (t=501ms, 새로운 이벤트 루프!)
  productStore.dispatch({ products, loading: false });
  // → render() 다시 예약 (scheduled는 이미 false로 리셋됨)

  // Microtask: render() 실행 (t=502ms)
  // 화면: 상품 목록 표시 ✅
};

// 결과: render 2번 실행 (정상!)
// - 로딩 스피너
// - 상품 목록
```

**왜 2번 렌더링되나요?**

- 비동기 작업(await, setTimeout 등) 후는 **다른 이벤트 루프**
- scheduled 플래그는 이미 false로 리셋됨
- 새로운 렌더링이 필요함 (사용자에게 단계별 피드백)

**이것은 버그가 아니라 의도된 동작입니다!**

---

### Q6: 배치 처리가 안 되는 경우는?

**A**: 다른 이벤트 루프에서 실행되는 경우입니다.

**배치 처리 O (같은 이벤트 루프)**:

- ✅ 동기 코드에서 연속 호출
- ✅ 같은 이벤트 핸들러 내부
- ✅ 같은 함수 스코프

**배치 처리 X (다른 이벤트 루프)**:

- ❌ `setTimeout` / `setInterval` 콜백
- ❌ `async/await` 이후
- ❌ API 응답 콜백
- ❌ 사용자의 별도 클릭/입력 이벤트

**예시**:

```javascript
// ✅ 배치 처리됨
button.addEventListener("click", () => {
  store1.dispatch(); // 같은 이벤트 루프
  store2.dispatch(); // 같은 이벤트 루프
  // → render() 1번
});

// ❌ 배치 처리 안 됨
store1.dispatch(); // 첫 번째 이벤트 루프
setTimeout(() => {
  store2.dispatch(); // 두 번째 이벤트 루프 (새로운 턴!)
}, 100);
// → render() 2번
```

---

### Q7: React의 Batching과 차이점은?

**A**: 기본 원리는 같지만, React는 더 정교합니다.

**공통점**:

- 같은 이벤트 루프에서 여러 상태 변경 → 1번 렌더링
- Microtask 활용
- 비동기 이후는 별도 렌더링

**차이점**:

| 특징              | 우리 구현        | React 18+            |
| ----------------- | ---------------- | -------------------- |
| 기본 배치         | 같은 이벤트 루프 | Automatic Batching   |
| setTimeout 내부   | 배치 안 됨       | 배치 됨              |
| Promise.then 내부 | 배치 안 됨       | 배치 됨              |
| 구현 방식         | queueMicrotask   | 자체 스케줄러        |
| 우선순위          | 없음             | Concurrent Mode 지원 |

**React 18의 Automatic Batching**:

- 어디서든 상태 변경을 자동으로 배치
- Concurrent Mode로 더 정교한 스케줄링
- 우선순위 기반 렌더링

**우리 구현**:

- 교육용 단순화 버전
- 핵심 원리는 동일
- React의 기본 동작 이해에 충분

---

## 보충 개념

### Virtual DOM의 2단계 방어 시스템

**1차 방어: withBatch**

- 같은 이벤트 루프에서 중복 호출 방지
- queueMicrotask로 배치 처리

**2차 방어: Diffing**

- 설령 render가 여러 번 호출되어도
- Virtual DOM 비교로 변경된 부분만 업데이트
- 불필요한 DOM 조작 방지

**시너지**:

```javascript
// 1차 방어 실패 (비동기로 여러 번 호출)
render()  // t=0ms
render()  // t=100ms

// 2차 방어 작동
renderElement(newVNode, container)
  → updateElement (Diffing)
  → 변경 없으면 DOM 조작 안 함!
```

---

### 성능 측정

**배치 처리 효과**:

```javascript
// withBatch 없이
for (let i = 0; i < 100; i++) {
  store.dispatch(); // render 100번
}
// → DOM 조작 100번, 매우 느림 😱

// withBatch 사용
for (let i = 0; i < 100; i++) {
  store.dispatch(); // render 예약 1번
}
// → DOM 조작 1번, 빠름! 🎉
```

**Diffing 효과**:

```javascript
// Virtual DOM 없이
store.dispatch();  // 전체 DOM 재생성

// Virtual DOM 사용
store.dispatch();
  → Diffing으로 변경된 부분만 업데이트
  → 10개 중 1개만 변경 → 10배 빠름
```

---

### 디버깅 팁

**1. render 호출 횟수 확인**:

```javascript
let renderCount = 0;
const render = withBatch(() => {
  console.log(`render 호출 #${++renderCount}`);
  renderElement(...);
});
```

**2. Store 변경 추적**:

```javascript
const originalDispatch = store.dispatch;
store.dispatch = (action) => {
  console.log("Store 변경:", action);
  originalDispatch(action);
};
```

**3. scheduled 상태 확인**:

```javascript
// withBatch에 디버깅 추가
if (scheduled) {
  console.log("render 무시됨 (이미 예약됨)");
  return;
}
console.log("render 예약됨");
```

---

## 정리

### Virtual DOM 핵심 3가지

1. **변환**: JSX → VNode (빌드 타임)
2. **비교**: Diffing으로 변경 감지 (런타임)
3. **최적화**: Batching으로 중복 제거 (런타임)

### 이벤트 루프 핵심 3가지

1. **동기 코드**: Store 변경은 즉시 완료
2. **Microtask**: render는 나중에 실행
3. **배치 범위**: 같은 이벤트 루프만 해당

### 실무 적용

- React, Vue 등 모던 프레임워크의 기본 원리
- 성능 최적화의 핵심 패턴
- 상태 관리 라이브러리 설계 기반

**프레임워크를 이해하는 가장 좋은 방법은 직접 만들어보는 것입니다!** 🎉

---

## 3. 브라우저 API와 DocumentFragment

### Q1: JavaScript와 브라우저 API는 다른 건가요?

**A:** 네! **JavaScript 언어**와 **브라우저가 제공하는 API**는 별개입니다.

**구조도:**

```
JavaScript 언어 (ECMAScript)
  ├─ 기본 문법 (if, for, function, class 등)
  ├─ 내장 객체 (Array, Object, String, Number 등)
  └─ 내장 API (Math, JSON, Promise 등)

브라우저 환경 (Web API)
  ├─ DOM API
  │   ├─ document.createElement()        ← Virtual DOM에서 사용
  │   ├─ document.createDocumentFragment() ← 배열 처리에 사용
  │   ├─ document.getElementById()
  │   ├─ element.appendChild()
  │   └─ element.addEventListener()
  ├─ BOM (Browser Object Model)
  │   ├─ window
  │   ├─ location
  │   ├─ history
  │   └─ navigator
  └─ 기타 Web API
      ├─ fetch()
      ├─ localStorage
      ├─ setTimeout()
      └─ requestAnimationFrame()
```

**핵심 차이:**

- **JavaScript 언어**: 어디서든 동작 (브라우저, Node.js, Deno 등)
- **브라우저 API**: 브라우저에서만 사용 가능

**확인 방법:**

```javascript
// 브라우저
console.log(typeof document); // "object" ✅

// Node.js
console.log(typeof document); // "undefined" ❌
```

---

### Q2: DocumentFragment는 무엇이고 왜 사용하나요?

**A:** **DocumentFragment는 일회용 임시 컨테이너**입니다.

**정의:**

- 여러 DOM 요소를 담을 수 있는 가벼운 컨테이너
- 실제 DOM 트리에 속하지 않음 (메모리에만 존재)
- DOM에 추가하면 자동으로 사라지고 자식들만 이동

**생명주기:**

```javascript
// 1. 생성
const fragment = document.createDocumentFragment();
console.log(fragment.childNodes.length); // 0

// 2. 요소 추가 (메모리에서만)
fragment.appendChild(div1);
fragment.appendChild(div2);
console.log(fragment.childNodes.length); // 2

// 3. DOM에 추가
container.appendChild(fragment);
// → Fragment는 사라지고 자식들만 container로 이동!

// 4. Fragment는 비어있음
console.log(fragment.childNodes.length); // 0
console.log(container.childNodes.length); // 2
```

---

### Q3: 일반 div와 DocumentFragment의 차이는?

**A:** Fragment는 **wrapper 없이** 여러 요소를 추가할 수 있습니다.

**비교:**

```javascript
// ❌ 일반 div 사용
const wrapper = document.createElement("div");
wrapper.appendChild(div1);
wrapper.appendChild(div2);
container.appendChild(wrapper);

// 결과
<div id="container">
  <div>
    {" "}
    ← 불필요한 wrapper!
    <div>항목 1</div>
    <div>항목 2</div>
  </div>
</div>;

// ✅ DocumentFragment 사용
const fragment = document.createDocumentFragment();
fragment.appendChild(div1);
fragment.appendChild(div2);
container.appendChild(fragment);

// 결과
<div id="container">
  <div>항목 1</div> ← 깔끔!
  <div>항목 2</div>
</div>;
```

---

### Q4: DocumentFragment의 성능 이점은?

**A:** 여러 DOM 조작을 **한 번에 처리**하여 Reflow를 최소화합니다.

**성능 비교:**

```javascript
// ❌ 비효율적: 1000번의 Reflow
for (let i = 0; i < 1000; i++) {
  container.appendChild(document.createElement("div"));
  // 매번 화면 다시 그림! 😱
}

// ✅ 효율적: 1번의 Reflow
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  fragment.appendChild(document.createElement("div"));
  // 메모리에서만 작업
}
container.appendChild(fragment); // 한 번에 추가! 🎉
```

**측정 결과 (1000개 요소 추가 시):**

- 개별 추가: ~100ms
- Fragment 사용: ~10ms
- **10배 빠름!**

---

### Q5: Virtual DOM 구현에서 어떻게 사용하나요?

**A:** **배열 형태의 VNode**를 처리할 때 사용합니다.

**사용 시나리오:**

```jsx
// React Fragment 패턴
<>
  <div>첫 번째</div>
  <div>두 번째</div>
  <div>세 번째</div>
</>;

// 배열 형태로 변환
createElement([
  { type: "div", children: ["첫 번째"] },
  { type: "div", children: ["두 번째"] },
  { type: "div", children: ["세 번째"] },
]);

// → DocumentFragment 생성
// → wrapper div 없이 3개 요소 추가
```

**createElement 구현:**

- 배열 감지 시 DocumentFragment 생성
- 각 VNode를 재귀적으로 처리
- Fragment에 모든 요소 추가 후 반환
- 실제 DOM에 추가되면 Fragment는 사라지고 요소들만 남음

---

### Q6: DocumentFragment의 특징 정리

**주요 특징:**

| 특징         | 설명                                |
| ------------ | ----------------------------------- |
| nodeType     | 11 (DOCUMENT_FRAGMENT_NODE)         |
| parentNode   | 항상 null (DOM 트리에 속하지 않음)  |
| 추가 후 상태 | 비어있음 (자식들이 이동됨)          |
| wrapper      | 추가되지 않음 (자식들만 추가)       |
| 성능         | 여러 요소 일괄 처리로 Reflow 최소화 |
| 재사용       | 불가 (일회용)                       |
| 사용 목적    | 여러 요소를 효율적으로 추가         |

**비유:**

- **택배 상자**: 물건을 담아서 배송, 도착하면 상자는 버리고 물건만 꺼냄
- **임시 작업장**: 작업 완료 후 결과물만 남기고 작업장은 철거
- **버스**: 승객을 태워서 목적지에 내려주고 버스는 돌아감

---

## 추가 학습 자료

- **React 공식 문서**: https://react.dev
- **Virtual DOM 이해하기**: https://react.dev/learn/preserving-and-resetting-state
- **Reconciliation**: https://react.dev/learn/reconciliation
- **JSX 변환**: https://babeljs.io/docs/babel-plugin-transform-react-jsx
- **이벤트 루프**: https://developer.mozilla.org/ko/docs/Web/JavaScript/Event_loop
- **DocumentFragment**: https://developer.mozilla.org/ko/docs/Web/API/DocumentFragment
