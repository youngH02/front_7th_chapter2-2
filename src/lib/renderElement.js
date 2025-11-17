import { setupEventListeners } from "./eventManager";
import { createElement } from "./createElement";
import { normalizeVNode } from "./normalizeVNode";
import { updateElement } from "./updateElement";

// 이전 VNode를 저장하기 위한 WeakMap (container를 키로 사용)
const oldVNodeMap = new WeakMap();

/**
 * Virtual DOM을 실제 DOM으로 렌더링합니다.
 * @param {object} vNode - 렌더링할 VNode
 * @param {HTMLElement} container - 렌더링할 컨테이너
 */
export function renderElement(vNode, container) {
  // VNode 정규화
  const normalizedVNode = normalizeVNode(vNode);

  // 이전 VNode 가져오기
  const oldVNode = oldVNodeMap.get(container);

  // 최초 렌더링
  if (!oldVNode) {
    // 컨테이너 비우기
    container.innerHTML = "";
    // 새 DOM 요소 생성 및 추가
    container.appendChild(createElement(normalizedVNode));
  } else {
    // 업데이트 (diffing)
    updateElement(container, normalizedVNode, oldVNode, 0);
  }

  // 현재 VNode 저장
  oldVNodeMap.set(container, normalizedVNode);

  // 이벤트 리스너 설정
  setupEventListeners(container);
}
