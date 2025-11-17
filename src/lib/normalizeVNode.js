/**
 * VNode를 정규화합니다.
 * - null, undefined, boolean은 빈 문자열로 변환
 * - 문자열과 숫자는 텍스트 노드로 변환
 * - 배열은 재귀적으로 정규화
 * @param {any} vNode - 정규화할 VNode
 * @returns {object|string} 정규화된 VNode
 */
export function normalizeVNode(vNode) {
  // null, undefined, boolean은 빈 문자열로 처리
  if (
    vNode == null ||
    typeof vNode === "boolean" ||
    typeof vNode === "undefined"
  ) {
    return "";
  }

  // 문자열이나 숫자는 그대로 반환 (텍스트 노드)
  if (typeof vNode === "string" || typeof vNode === "number") {
    return String(vNode);
  }

  // 배열인 경우 재귀적으로 정규화
  if (Array.isArray(vNode)) {
    return vNode.map(normalizeVNode).flat();
  }

  // 함수형 컴포넌트인 경우 실행하여 결과를 정규화
  if (typeof vNode.type === "function") {
    const component = vNode.type;
    const props = {
      ...vNode.props,
      children: vNode.children.length > 0 ? vNode.children : undefined,
    };
    return normalizeVNode(component(props));
  }

  // 일반 VNode의 children을 정규화
  return {
    ...vNode,
    children: vNode.children
      .map(normalizeVNode)
      .flat()
      .filter((child) => child !== ""), // 빈 문자열 제거
  };
}
