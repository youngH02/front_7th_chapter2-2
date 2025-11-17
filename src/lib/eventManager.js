/**
 * 각 요소에 등록된 이벤트 핸들러를 저장
 * WeakMap을 사용하여 요소가 제거되면 자동으로 GC
 */
const eventHandlers = new WeakMap();

/**
 * 루트 컨테이너에 등록된 이벤트 타입들을 추적
 */
const rootEventTypes = new WeakMap();

/**
 * 요소에 이벤트 핸들러를 등록합니다. (이벤트 위임 방식)
 * @param {HTMLElement} element - 대상 요소
 * @param {string} eventType - 이벤트 타입 (click, input 등)
 * @param {Function} handler - 이벤트 핸들러 함수
 */
export function addEvent(element, eventType, handler) {
  if (!element || !eventType || typeof handler !== "function") {
    return;
  }

  // 요소의 이벤트 맵 가져오기 또는 생성
  let elementEvents = eventHandlers.get(element);
  if (!elementEvents) {
    elementEvents = new Map();
    eventHandlers.set(element, elementEvents);
  }

  // 이벤트 타입별 핸들러 배열 가져오기 또는 생성
  let handlers = elementEvents.get(eventType);
  if (!handlers) {
    handlers = [];
    elementEvents.set(eventType, handlers);
  }

  // 중복 등록 방지 (WeakMap에만 저장, 직접 addEventListener 호출 안 함)
  if (!handlers.includes(handler)) {
    handlers.push(handler);
  }
}

/**
 * 요소에서 이벤트 핸들러를 제거합니다.
 * @param {HTMLElement} element - 대상 요소
 * @param {string} eventType - 이벤트 타입
 * @param {Function} handler - 제거할 핸들러 함수
 */
export function removeEvent(element, eventType, handler) {
  if (!element || !eventType || typeof handler !== "function") {
    return;
  }

  const elementEvents = eventHandlers.get(element);
  if (!elementEvents) return;

  const handlers = elementEvents.get(eventType);
  if (!handlers) return;

  // 핸들러 배열에서 제거 (WeakMap에서만 제거, removeEventListener 호출 안 함)
  const index = handlers.indexOf(handler);
  if (index > -1) {
    handlers.splice(index, 1);
  }

  // 빈 배열이면 정리
  if (handlers.length === 0) {
    elementEvents.delete(eventType);
  }

  // 빈 맵이면 정리
  if (elementEvents.size === 0) {
    eventHandlers.delete(element);
  }
}

/**
 * 루트 요소에 이벤트 위임 리스너를 설정합니다.
 * @param {HTMLElement} root - 루트 컨테이너
 */
export function setupEventListeners(root) {
  if (!root) return;

  // 이미 설정된 루트면 스킵
  if (rootEventTypes.has(root)) return;

  // 이 루트에 등록된 이벤트 타입들을 추적
  const registeredTypes = new Set();
  rootEventTypes.set(root, registeredTypes);

  // 일반적인 이벤트 타입들
  const eventTypes = [
    "click",
    "dblclick",
    "input",
    "change",
    "submit",
    "keydown",
    "keyup",
    "keypress",
    "mousedown",
    "mouseup",
    "mousemove",
    "mouseenter",
    "mouseleave",
    "mouseover",
    "mouseout",
    "focus",
    "blur",
    "focusin",
    "focusout",
    "scroll",
  ];

  // 각 이벤트 타입에 대해 위임 리스너 등록
  eventTypes.forEach((eventType) => {
    root.addEventListener(eventType, (event) => {
      // 이벤트 버블링을 따라 핸들러 실행
      let currentElement = event.target;

      // target부터 root까지 거슬러 올라가며 핸들러 찾기
      while (currentElement && currentElement !== root.parentElement) {
        const elementEvents = eventHandlers.get(currentElement);

        if (elementEvents) {
          const handlers = elementEvents.get(eventType);

          if (handlers && handlers.length > 0) {
            // 해당 요소의 모든 핸들러 실행
            handlers.forEach((handler) => {
              handler(event);
            });
          }
        }

        // stopPropagation이 호출되었으면 버블링 중단
        if (event.cancelBubble) {
          break;
        }

        // 부모로 이동
        currentElement = currentElement.parentElement;
      }
    });

    registeredTypes.add(eventType);
  });
}
