/* eslint-disable @typescript-eslint/no-explicit-any */
import { NodeTypes } from "./constants";
import { Instance } from "./types";

/**
 * DOM 요소에 속성(props)을 설정합니다.
 * 이벤트 핸들러, 스타일, className 등 다양한 속성을 처리해야 합니다.
 */
export const setDomProps = (dom: HTMLElement, props: Record<string, any>): void => {
  for (const key in props) {
    if (key === "children") continue;
    if (key.startsWith("on") && typeof props[key] === "function") {
      dom.addEventListener(key.slice(2).toLowerCase(), props[key]);
    } else if (key === "className") {
      dom.className = props[key] ?? "";
    } else if (key === "style" && typeof props[key] === "object" && props[key] !== null) {
      diffStyle(dom, {}, props[key]);
      continue;
    } else if (["checked", "disabled", "readOnly"].includes(key)) {
      (dom as any)[key] = !!props[key];
    } else {
      dom.setAttribute(key, props[key]);
    }
  }
};

type StyleMap = Record<string, string | number>;

const diffStyle = (dom: HTMLElement, prev?: StyleMap, next?: StyleMap) => {
  if (prev === next) return;
  prev = prev || {};
  next = next || {};
  // 제거
  for (const key in prev) {
    if (!(key in next)) {
      dom.style[key as any] = "";
    }
  }
  // 추가/업데이트
  applyStyle(dom, next);
};

const applyStyle = (dom: HTMLElement, style: StyleMap = {}) => {
  for (const key in style) {
    dom.style[key as any] = style[key] == null ? "" : String(style[key]);
  }
};

/**
 * 이전 속성과 새로운 속성을 비교하여 DOM 요소의 속성을 업데이트합니다.
 * 변경된 속성만 효율적으로 DOM에 반영해야 합니다.
 */
export const updateDomProps = (
  dom: HTMLElement,
  prevProps: Record<string, any> = {},
  nextProps: Record<string, any> = {},
): void => {
  const prevStyle = prevProps.style && typeof prevProps.style === "object" ? (prevProps.style as StyleMap) : undefined;
  const nextStyle = nextProps.style && typeof nextProps.style === "object" ? (nextProps.style as StyleMap) : undefined;
  // 제거/변경
  for (const key in prevProps) {
    if (key === "children") continue;
    const prevValue = prevProps[key];
    const nextValue = nextProps[key];

    if (key === "style") {
      if (prevStyle && !nextStyle) {
        diffStyle(dom, prevStyle, {});
      }
      continue;
    }

    if (key.startsWith("on") && typeof prevValue === "function") {
      if (prevValue !== nextValue) {
        dom.removeEventListener(key.slice(2).toLowerCase(), prevValue);
      }
      continue;
    }

    if (!(key in nextProps)) {
      if (key === "className") {
        dom.className = "";
      } else if (["checked", "disabled", "readOnly"].includes(key)) {
        (dom as any)[key] = false;
        dom.removeAttribute(key);
      } else {
        dom.removeAttribute(key);
      }
    }
  }

  if (nextStyle) {
    diffStyle(dom, prevStyle ?? {}, nextStyle);
  }

  // 추가/업데이트
  for (const key in nextProps) {
    if (key === "children" || key === "style") continue;
    const value = nextProps[key];

    if (key.startsWith("on") && typeof value === "function") {
      const prevValue = prevProps[key];
      if (prevValue !== value) {
        if (typeof prevValue === "function") {
          dom.removeEventListener(key.slice(2).toLowerCase(), prevValue);
        }
        dom.addEventListener(key.slice(2).toLowerCase(), value);
      }
      continue;
    }

    if (key === "className") {
      dom.className = value ?? "";
      continue;
    }

    if (["checked", "disabled", "readOnly"].includes(key)) {
      const boolValue = !!value;
      (dom as any)[key] = boolValue;
      if (boolValue) {
        dom.setAttribute(key, "");
      } else {
        dom.removeAttribute(key);
      }
      continue;
    }

    if (value == null) {
      dom.removeAttribute(key);
    } else {
      dom.setAttribute(key, String(value));
    }
  }
};

/**
 * 주어진 인스턴스에서 실제 DOM 노드(들)를 재귀적으로 찾아 배열로 반환합니다.
 * Fragment나 컴포넌트 인스턴스는 여러 개의 DOM 노드를 가질 수 있습니다.
 */
export const getDomNodes = (instance: Instance | null): (HTMLElement | Text)[] => {
  if (!instance) return [];
  if (instance.kind === NodeTypes.FRAGMENT && instance.children) {
    return instance.children.flatMap(getDomNodes);
  }
  if (instance.kind === NodeTypes.TEXT && instance.dom) {
    return [instance.dom];
  }
  if (instance.kind === NodeTypes.HOST && instance.dom) {
    return [instance.dom];
  }
  if (instance.children) {
    return instance.children.flatMap(getDomNodes);
  }
  return [];
};

/**
 * 주어진 인스턴스에서 첫 번째 실제 DOM 노드를 찾습니다.
 */
export const getFirstDom = (instance: Instance | null): HTMLElement | Text | null => {
  const nodes = getDomNodes(instance);
  return nodes.length > 0 ? nodes[0] : null;
};

/**
 * 자식 인스턴스들로부터 첫 번째 실제 DOM 노드를 찾습니다.
 */
export const getFirstDomFromChildren = (children: (Instance | null)[]): HTMLElement | Text | null => {
  for (const child of children) {
    const dom = getFirstDom(child);
    if (dom) return dom;
  }
  return null;
};

/**
 * 인스턴스를 부모 DOM에 삽입합니다.
 * anchor 노드가 주어지면 그 앞에 삽입하여 순서를 보장합니다.
 */
export const insertInstance = (
  parentDom: HTMLElement,
  instance: Instance | null,
  anchor: HTMLElement | Text | null = null,
): void => {
  const nodes = getDomNodes(instance);
  for (const node of nodes) {
    if (anchor) {
      parentDom.insertBefore(node, anchor);
    } else {
      parentDom.appendChild(node);
    }
  }
};

/**
 * 부모 DOM에서 인스턴스에 해당하는 모든 DOM 노드를 제거합니다.
 */
export const removeInstance = (parentDom: HTMLElement, instance: Instance | null): void => {
  const nodes = getDomNodes(instance);
  for (const node of nodes) {
    if (parentDom.contains(node)) {
      parentDom.removeChild(node);
    }
  }
};
