/* eslint-disable @typescript-eslint/no-explicit-any */
import { isEmptyValue } from "../utils";
import { VNode } from "./types";
import { Fragment, TEXT_ELEMENT } from "./constants";

const isVNode = (value: unknown): value is VNode => {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in (value as Record<string, unknown>) &&
    "props" in (value as Record<string, unknown>)
  );
};

const flattenChildren = (children: unknown[]): unknown[] => {
  const result: unknown[] = [];
  for (const child of children) {
    if (Array.isArray(child)) {
      result.push(...flattenChildren(child));
    } else {
      result.push(child);
    }
  }
  return result;
};

const normalizeChildren = (children: unknown[]): VNode[] => {
  return flattenChildren(children)
    .map((child) => normalizeNode(child as VNode))
    .filter((child): child is VNode => child != null);
};

/**
 * 주어진 노드를 VNode 형식으로 정규화합니다.
 * null, undefined, boolean, 배열, 원시 타입 등을 처리하여 일관된 VNode 구조를 보장합니다.
 */
export const normalizeNode = (node: VNode): VNode | null => {
  if (isEmptyValue(node)) {
    return null;
  }

  if (typeof node === "string" || typeof node === "number") {
    return createTextElement(node);
  }

  if (Array.isArray(node)) {
    const children = normalizeChildren(node);
    return children.length
      ? {
          type: Fragment,
          key: null,
          props: { children },
        }
      : null;
  }

  if (!isVNode(node)) {
    return null;
  }

  const hasChildrenProp = node.props && Object.prototype.hasOwnProperty.call(node.props, "children");
  const childProp = hasChildrenProp ? node.props.children : undefined;
  const childrenArray = childProp === undefined ? [] : Array.isArray(childProp) ? childProp : [childProp];
  const children = normalizeChildren(childrenArray);

  if (node.type === Fragment) {
    return children.length
      ? {
          type: Fragment,
          key: node.key ?? null,
          props: { ...node.props, children },
        }
      : null;
  }

  return {
    ...node,
    key: node.key ?? null,
    props: {
      ...node.props,
      children,
    },
  };
};

/**
 * 텍스트 노드를 위한 VNode를 생성합니다.
 */
const createTextElement = (node: VNode): VNode => {
  return {
    type: TEXT_ELEMENT,
    key: null,
    props: { nodeValue: String(node), children: [] },
  };
};

/**
 * JSX로부터 전달된 인자를 VNode 객체로 변환합니다.
 * 이 함수는 JSX 변환기에 의해 호출됩니다. (예: Babel, TypeScript)
 */
export const createElement = (
  type: string | symbol | React.ComponentType<any>,
  originProps?: Record<string, any> | null,
  ...rawChildren: any[]
) => {
  const props = originProps ?? {};
  const { key, children: propsChildren, ...rest } = props;
  const childCandidates = rawChildren.length > 0 ? rawChildren : propsChildren !== undefined ? [propsChildren] : [];
  const normalizedChildren = normalizeChildren(childCandidates);

  return {
    type,
    key: key != null ? key : null,
    props: {
      ...rest,
      ...(normalizedChildren.length > 0 ? { children: normalizedChildren } : {}),
    },
  };
};

/**
 * 부모 경로와 자식의 key/index를 기반으로 고유한 경로를 생성합니다.
 * 이는 훅의 상태를 유지하고 Reconciliation에서 컴포넌트를 식별하는 데 사용됩니다.
 */
export const createChildPath = (
  parentPath: string,
  key: string | null,
  index: number,
  nodeType?: string | symbol | React.ComponentType,
  siblings?: VNode[],
): string => {
  const inferredIndex =
    key != null || !siblings ? index : siblings.slice(0, index).filter((sibling) => sibling?.type === nodeType).length;
  const childId = key != null ? `key:${key}` : `idx:${inferredIndex}`;
  const typeStr =
    typeof nodeType === "string"
      ? nodeType
      : typeof nodeType === "function"
        ? nodeType.name || "Component"
        : String(nodeType);

  return `${parentPath}/${typeStr}/${childId}`;
};
