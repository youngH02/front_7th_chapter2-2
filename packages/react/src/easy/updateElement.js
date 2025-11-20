import { addEvent, removeEvent } from "./eventManager";
import { createElement } from "./createElement.js";

/**
 * DOM 요소의 속성을 업데이트합니다.
 * @param {HTMLElement} target - 대상 DOM 요소
 * @param {object} originNewProps - 새로운 속성들
 * @param {object} originOldProps - 이전 속성들
 */
function updateAttributes(target, originNewProps, originOldProps) {
  const newProps = originNewProps || {};
  const oldProps = originOldProps || {};

  // 이전 속성 제거
  Object.keys(oldProps).forEach((key) => {
    if (key.startsWith("on")) {
      const eventType = key.slice(2).toLowerCase();
      removeEvent(target, eventType, oldProps[key]);
    } else if (!(key in newProps)) {
      // boolean 속성은 property를 false로 설정
      if (key === "checked" || key === "disabled" || key === "selected" || key === "readOnly") {
        target[key] = false;
      } else if (key === "value") {
        target.value = "";
      } else if (key === "className") {
        target.removeAttribute("class");
      } else {
        target.removeAttribute(key);
      }
    }
  });

  // 새로운 속성 추가 또는 업데이트
  Object.entries(newProps).forEach(([key, value]) => {
    const oldValue = oldProps[key];

    // 이벤트 리스너 처리 (항상 재등록)
    if (key.startsWith("on") && typeof value === "function") {
      const eventType = key.slice(2).toLowerCase();
      if (oldValue && oldValue !== value) {
        removeEvent(target, eventType, oldValue);
      }
      addEvent(target, eventType, value);
      return;
    }

    // 값이 변경되지 않았으면 스킵
    if (oldValue === value) return;

    // className 처리
    if (key === "className") {
      target.setAttribute("class", value);
      return;
    }

    // style 객체 처리
    if (key === "style" && typeof value === "object") {
      Object.entries(value).forEach(([styleName, styleValue]) => {
        target.style[styleName] = styleValue;
      });
      return;
    }

    // boolean 속성은 property로 직접 설정
    if (key === "checked" || key === "disabled" || key === "selected" || key === "readOnly") {
      target[key] = !!value;
      return;
    }

    // value 속성도 property로 직접 설정
    if (key === "value") {
      target.value = value;
      return;
    }

    // 일반 속성 처리
    if (value != null && value !== false) {
      target.setAttribute(key, value);
    } else {
      target.removeAttribute(key);
    }
  });
}

/**
 * Virtual DOM diffing 알고리즘을 사용하여 실제 DOM을 업데이트합니다.
 * @param {HTMLElement} parentElement - 부모 DOM 요소
 * @param {object|string} newNode - 새로운 VNode
 * @param {object|string} oldNode - 이전 VNode
 * @param {number} index - 자식 노드의 인덱스
 */
export function updateElement(parentElement, newNode, oldNode, index = 0) {
  // 이전 노드만 있는 경우 (삭제)
  if (!newNode && oldNode) {
    const childNode = parentElement.childNodes[index];
    if (childNode) {
      parentElement.removeChild(childNode);
    }
    return;
  }

  // 새 노드만 있는 경우 (추가)
  if (newNode && !oldNode) {
    parentElement.appendChild(createElement(newNode));
    return;
  }

  // 노드 타입이 변경된 경우 (교체)
  const hasChanged =
    typeof newNode !== typeof oldNode ||
    (typeof newNode === "string" && newNode !== oldNode) ||
    (typeof newNode === "object" && newNode.type !== oldNode.type);

  if (hasChanged) {
    const childNode = parentElement.childNodes[index];
    if (childNode) {
      parentElement.replaceChild(createElement(newNode), childNode);
    } else {
      parentElement.appendChild(createElement(newNode));
    }
    return;
  }

  // 텍스트 노드인 경우
  if (typeof newNode === "string") {
    const childNode = parentElement.childNodes[index];
    if (childNode && newNode !== oldNode) {
      childNode.textContent = newNode;
    }
    return;
  }

  // 같은 타입의 요소인 경우 속성만 업데이트
  const target = parentElement.childNodes[index];
  if (!target) return;

  updateAttributes(target, newNode.props, oldNode.props);

  // 자식 노드들을 재귀적으로 업데이트
  const newChildren = newNode.children || [];
  const oldChildren = oldNode.children || [];
  const maxLength = Math.max(newChildren.length, oldChildren.length);

  for (let i = 0; i < maxLength; i++) {
    updateElement(target, newChildren[i], oldChildren[i], i);
  }

  // 새로운 자식이 더 적으면, 남은 기존 자식들을 삭제
  while (target.childNodes.length > newChildren.length) {
    const lastChild = target.childNodes[target.childNodes.length - 1];
    if (lastChild) {
      target.removeChild(lastChild);
    }
  }
}
