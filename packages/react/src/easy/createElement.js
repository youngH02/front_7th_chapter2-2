import { addEvent } from "./eventManager";

/**
 * VNode를 실제 DOM 요소로 변환합니다.
 * @param {object|string|array} vNode - Virtual DOM 노드 또는 배열
 * @returns {Node} 생성된 DOM 노드
 */
export function createElement(vNode) {
  // 배열인 경우 DocumentFragment 생성
  if (Array.isArray(vNode)) {
    const fragment = document.createDocumentFragment();
    vNode.forEach((child) => {
      fragment.appendChild(createElement(child));
    });
    return fragment;
  }

  // 텍스트 노드인 경우
  if (typeof vNode === "string" || typeof vNode === "number") {
    return document.createTextNode(String(vNode));
  }

  // VNode 객체가 아닌 경우 빈 텍스트 노드 반환
  if (!vNode || typeof vNode !== "object") {
    return document.createTextNode("");
  }

  // HTML 요소 생성
  const $el = document.createElement(vNode.type);

  // 속성 설정
  updateAttributes($el, vNode.props);

  // 자식 요소들을 재귀적으로 생성하고 추가
  if (vNode.children) {
    vNode.children.forEach((child) => {
      $el.appendChild(createElement(child));
    });
  }

  return $el;
}

/**
 * DOM 요소의 속성을 업데이트합니다.
 * @param {HTMLElement} $el - 대상 DOM 요소
 * @param {object} props - 설정할 속성들
 */
function updateAttributes($el, props) {
  if (!props) return;

  Object.entries(props).forEach(([key, value]) => {
    // 이벤트 리스너 처리 (onClick, onInput 등)
    if (key.startsWith("on") && typeof value === "function") {
      const eventType = key.slice(2).toLowerCase(); // onClick -> click
      addEvent($el, eventType, value);
      return;
    }

    // className 처리
    if (key === "className") {
      $el.setAttribute("class", value);
      return;
    }

    // style 객체 처리
    if (key === "style" && typeof value === "object") {
      Object.entries(value).forEach(([styleName, styleValue]) => {
        $el.style[styleName] = styleValue;
      });
      return;
    }

    // boolean 속성은 property로 직접 설정
    if (key === "checked" || key === "disabled" || key === "selected" || key === "readOnly") {
      $el[key] = !!value;
      return;
    }

    // value 속성도 property로 직접 설정
    if (key === "value") {
      $el.value = value;
      return;
    }

    // 일반 속성 처리
    if (value != null && value !== false) {
      $el.setAttribute(key, value);
    }
  });
}
