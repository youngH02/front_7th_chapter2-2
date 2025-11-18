# ⚡ enqueue와 Event Loop 이해하기

## 🎯 핵심 개념

**문제:** 상태가 여러 번 변경될 때마다 렌더링하면 느려요! 💀

**해결:** 상태 변경은 즉시, 렌더링은 나중에 1번만! ⚡

---

## 📚 주요 구성 요소

### 1️⃣ **enqueue** - "나중에 해줘" 예약

```typescript
export const enqueue = (callback: () => void) => {
  queueMicrotask(callback); // JavaScript 내장 API
};
```

**역할:**

- 함수를 **지금 실행하지 않고** Microtask Queue에 추가
- Call Stack이 비면 자동으로 실행됨

**예시:**

```typescript
console.log("1");
enqueue(() => console.log("2")); // 나중에!
console.log("3");

// 출력: 1, 3, 2
```

---

### 2️⃣ **withEnqueue** - 중복 방지

```typescript
export const withEnqueue = (fn: AnyFunction) => {
  let scheduled = false; // 플래그 (클로저!)

  return () => {
    if (scheduled) return; // 이미 예약됨 → 무시
    scheduled = true;
    enqueue(() => {
      scheduled = false;
      fn();
    });
  };
};
```

**역할:**

- 여러 번 호출해도 **1번만 예약**
- `scheduled` 플래그로 중복 방지

**예시:**

```typescript
const enqueueRender = withEnqueue(render);

enqueueRender(); // 예약! ✅
enqueueRender(); // 무시! (이미 예약됨)
enqueueRender(); // 무시! (이미 예약됨)

// 결과: render() 1번만 실행!
```

---

### 3️⃣ **실제 사용 (render)**

```typescript
// render.ts
export const render = (): void => {
  // 렌더링 로직...
};

// 중복 방지 버전
export const enqueueRender = withEnqueue(render);
```

**동작:**

```typescript
button.onclick = () => {
  setState(1); // count = 1, enqueueRender() 호출
  setState(2); // count = 2, enqueueRender() 호출 (무시)
  setState(3); // count = 3, enqueueRender() 호출 (무시)
};

// 클릭 끝난 후
// → render() 1번 실행
// → count는 3 (최신 값!)
```

---

## 🔄 JavaScript Event Loop

### **구조**

```
┌─────────────────┐
│  Call Stack     │ ← 지금 실행 중
│  (실행 중)       │
└─────────────────┘
        ↓ (비면 확인)
┌─────────────────┐
│ Microtask Queue │ ← queueMicrotask로 추가된 것
│  (대기 중)       │    (더 빠름!)
└─────────────────┘
        ↓
┌─────────────────┐
│  Task Queue     │ ← setTimeout 등
│  (대기 중)       │    (더 느림)
└─────────────────┘
```

### **규칙**

1. **Call Stack** 실행
2. Call Stack이 **비면**
3. **Microtask Queue** 확인 → 있으면 실행
4. Task Queue 확인 → 있으면 실행
5. 반복!

---

## 🎬 전체 흐름 시뮬레이션

```typescript
// 사용자가 버튼 클릭
button.onclick = () => {
  console.log("시작"); // [Call Stack] 즉시 실행

  setState(1); // [Call Stack] count = 1
  // → enqueueRender()
  //   → scheduled = false → true
  //   → queueMicrotask(() => render())  [Microtask Queue에 추가!]

  setState(2); // [Call Stack] count = 2
  // → enqueueRender()
  //   → scheduled = true → return (무시)

  setState(3); // [Call Stack] count = 3
  // → enqueueRender()
  //   → scheduled = true → return (무시)

  console.log("끝"); // [Call Stack] 즉시 실행

  // === onclick 종료, Call Stack 비어짐! ===

  // Event Loop: "Microtask Queue 확인!"

  // [Microtask Queue 실행]
  // → render() 실행!
  // → count는 3 (최신 값!)
  // → 화면 업데이트
  // → scheduled = false (리셋)
};
```

**콘솔 출력:**

```
시작
끝
(render 실행 - count: 3)
```

---

## 📊 비교

### ❌ **enqueue 없이 (동기 실행)**

```typescript
setState(1); // count = 1, render() 즉시 실행 💀
setState(2); // count = 2, render() 즉시 실행 💀
setState(3); // count = 3, render() 즉시 실행 💀

// 문제: render 3번! (느림!)
```

### ✅ **enqueue + withEnqueue**

```typescript
setState(1); // count = 1, render 예약
setState(2); // count = 2, 예약 무시
setState(3); // count = 3, 예약 무시

// 나중에 render 1번! (빠름!)
```

---

## 🎯 핵심 정리

### **3가지만 기억하세요!**

1. **enqueue** = "나중에 해줘" (queueMicrotask)
2. **withEnqueue** = "1번만 예약" (scheduled 플래그)
3. **Event Loop** = Call Stack 비면 → Microtask Queue 실행

### **왜 사용하나요?**

```typescript
// 렌더링 3번 (느림) → 렌더링 1번 (빠름!)
```

### **어떻게 가능한가요?**

```typescript
// JavaScript의 Event Loop + queueMicrotask!
```

---

## 💡 추가 참고

### **비슷한 개념**

```typescript
// 옛날 방식 (같은 동작)
Promise.resolve().then(() => render());

// 최신 방식 (더 명확)
queueMicrotask(() => render());
```

### **다른 예시: setTimeout**

```typescript
console.log("1");
setTimeout(() => console.log("2"), 0); // Task Queue
queueMicrotask(() => console.log("3")); // Microtask Queue
console.log("4");

// 출력: 1, 4, 3, 2
// (Microtask가 Task보다 먼저!)
```

---

## 🚀 실전 적용

### **React/Mini-React에서**

```typescript
// 상태 변경
const [count, setCount] = useState(0);

// 버튼 클릭
onClick={() => {
  setCount(1);  // enqueueRender() 예약
  setCount(2);  // 무시
  setCount(3);  // 무시
}}

// → render 1번! count: 3!
```

### **성능 향상**

- ❌ 렌더링 3번 (150ms)
- ✅ 렌더링 1번 (50ms)
- 🎉 **3배 빠름!**

---

끝! 🎉
