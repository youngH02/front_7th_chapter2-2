/**
 * Virtual DOM 노드를 생성합니다.
 * @param {string|Function} type - HTML 태그명 또는 컴포넌트 함수
 * @param {object} props - 속성 객체
 * @param {...any} children - 자식 노드들
 * @returns {object} VNode 객체
 */
export function createVNode(type, props, ...children) {
  return {
    type,
    props: props || {},
    children: children.flat(Infinity), // 중첩 배열을 평탄화
  };
}
