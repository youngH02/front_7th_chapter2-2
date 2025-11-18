import { context } from "./context";
import { Fragment, NodeTypes, TEXT_ELEMENT } from "./constants";
import { Instance, VNode } from "./types";
import {
  // getFirstDom,
  // getFirstDomFromChildren,
  insertInstance,
  removeInstance,
  setDomProps,
  updateDomProps,
} from "./dom";
import { createChildPath } from "./elements";
import { isEmptyValue } from "../utils";

/**
 * 이전 인스턴스와 새로운 VNode를 비교하여 DOM을 업데이트하는 재조정 과정을 수행합니다.
 *
 * @param parentDom - 부모 DOM 요소
 * @param instance - 이전 렌더링의 인스턴스
 * @param node - 새로운 VNode
 * @param path - 현재 노드의 고유 경로
 * @returns 업데이트되거나 새로 생성된 인스턴스
 */
export const reconcile = (
  parentDom: HTMLElement,
  instance: Instance | null,
  node: VNode | null,
  path: string,
): Instance | null => {
  // 여기를 구현하세요.
  // 1. 새 노드가 null이면 기존 인스턴스를 제거합니다. (unmount)
  // 2. 기존 인스턴스가 없으면 새 노드를 마운트합니다. (mount)
  // 3. 타입이나 키가 다르면 기존 인스턴스를 제거하고 새로 마운트합니다.
  // 4. 타입과 키가 같으면 인스턴스를 업데이트합니다. (update)
  //    - DOM 요소: updateDomProps로 속성 업데이트 후 자식 재조정
  //    - 컴포넌트: 컴포넌트 함수 재실행 후 자식 재조정

  // 1. 노드 없음
  if (isEmptyValue(node) || !node) {
    removeInstance(parentDom, instance);
    return null;
  }

  // 2. 인스턴스 없음
  if (isEmptyValue(instance) || !instance) {
    // TEXT_ELEMENT
    if (node.type === TEXT_ELEMENT) {
      const textNode = document.createTextNode(node.props.nodeValue || "");
      const newInstance: Instance = {
        kind: NodeTypes.TEXT, // ✅
        dom: textNode,
        node: node,
        children: [],
        key: node.key,
        path: path,
      };
      insertInstance(parentDom, newInstance);
      return newInstance;
    }

    // Fragment
    if (node.type === Fragment) {
      const newInstance: Instance = {
        kind: NodeTypes.FRAGMENT, // ✅
        dom: null,
        node: node,
        children: [],
        key: node.key,
        path: path,
      };

      const children = node.props.children || [];
      newInstance.children = children
        .map((child, index) => {
          const childPath = createChildPath(path, child?.key ?? null, index, child?.type, children);
          return reconcile(parentDom, null, child, childPath);
        })
        .filter((child): child is Instance => child !== null);

      return newInstance;
    }

    // DOM 요소
    if (typeof node.type === "string") {
      const dom = document.createElement(node.type);
      setDomProps(dom, node.props);

      const newInstance: Instance = {
        kind: NodeTypes.HOST, // ✅ ELEMENT → HOST
        dom: dom,
        node: node,
        children: [],
        key: node.key,
        path: path,
      };

      const children = node.props.children || [];
      newInstance.children = children
        .map((child, index) => {
          const childPath = createChildPath(path, child?.key ?? null, index, child?.type, children);
          return reconcile(dom, null, child, childPath);
        })
        .filter((child): child is Instance => child !== null);

      insertInstance(parentDom, newInstance);
      return newInstance;
    }

    // 컴포넌트
    if (typeof node.type === "function") {
      context.hooks.componentStack.push(path);
      const childVNode = node.type(node.props);
      context.hooks.componentStack.pop();
      context.hooks.visited.add(path);

      const childInstance = reconcile(parentDom, null, childVNode, path);

      const newInstance: Instance = {
        kind: NodeTypes.COMPONENT, // ✅
        dom: null,
        node: node,
        children: childInstance ? [childInstance] : [],
        key: node.key,
        path: path,
      };

      return newInstance;
    }

    return null;
  }

  // 여기서부터 instance와 node 둘 다 확정!

  // 3. 타입 다름
  if (instance.node.type !== node.type || instance.node.key !== node.key) {
    removeInstance(parentDom, instance);
    return reconcile(parentDom, null, node, path);
  }

  // 4. 같음 - 여기서 명시적 체크!

  // TEXT_ELEMENT
  if (node.type === TEXT_ELEMENT && instance.dom) {
    (instance.dom as Text).nodeValue = node.props.nodeValue || "";
    instance.node = node;
    return instance;
  }

  // Fragment
  if (node.type === Fragment) {
    const oldChildren = instance.children;
    const newChildren = node.props.children || [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    instance.children = [];
    for (let i = 0; i < maxLength; i++) {
      const child = newChildren[i];
      const childPath = createChildPath(path, child?.key ?? null, i, child?.type, newChildren);
      const childInstance = reconcile(parentDom, oldChildren[i] || null, child || null, childPath);
      if (childInstance) {
        instance.children.push(childInstance);
      }
    }

    instance.node = node;
    return instance;
  }

  // DOM 요소
  if (typeof node.type === "string" && instance.dom) {
    updateDomProps(instance.dom as HTMLElement, instance.node.props, node.props);

    const oldChildren = instance.children;
    const newChildren = node.props.children || [];
    const maxLength = Math.max(oldChildren.length, newChildren.length);

    instance.children = [];
    for (let i = 0; i < maxLength; i++) {
      const child = newChildren[i];
      const childPath = createChildPath(path, child?.key ?? null, i, child?.type, newChildren);
      const childInstance = reconcile(instance.dom as HTMLElement, oldChildren[i] || null, child || null, childPath);
      if (childInstance) {
        instance.children.push(childInstance);
      }
    }

    instance.node = node;
    return instance;
  }

  // 컴포넌트
  if (typeof node.type === "function") {
    context.hooks.componentStack.push(path);
    const childVNode = node.type(node.props);
    context.hooks.componentStack.pop();
    context.hooks.visited.add(path);

    const childInstance = reconcile(parentDom, instance.children[0] || null, childVNode, path);

    instance.children = childInstance ? [childInstance] : [];
    instance.node = node;
    return instance;
  }

  return instance;
};
