import type { DrawElement } from '../types/element';

export const elementsState = createElementsState();

function createElementsState() {
  let elements = $state<DrawElement[]>([]);
  let selectedIds = $state<Set<string>>(new Set());

  return {
    get elements() { return elements; },
    get selectedIds() { return selectedIds; },

    get selectedElements() {
      return elements.filter(el => selectedIds.has(el.id));
    },

    add(element: DrawElement) {
      elements = [...elements, element];
    },

    update(id: string, changes: Partial<DrawElement>) {
      elements = elements.map(el =>
        el.id === id ? { ...el, ...changes } : el
      );
    },

    delete(ids: string[]) {
      const idsSet = new Set(ids);
      elements = elements.filter(el => !idsSet.has(el.id));
      selectedIds = new Set([...selectedIds].filter(id => !idsSet.has(id)));
    },

    select(id: string, additive = false) {
      if (additive) {
        selectedIds = new Set([...selectedIds, id]);
      } else {
        selectedIds = new Set([id]);
      }
    },

    selectMultiple(ids: string[]) {
      selectedIds = new Set(ids);
    },

    deselect(id: string) {
      const next = new Set(selectedIds);
      next.delete(id);
      selectedIds = next;
    },

    clearSelection() {
      selectedIds = new Set();
    },

    getElementById(id: string) {
      return elements.find(el => el.id === id);
    },

    clear() {
      elements = [];
      selectedIds = new Set();
    },
  };
}
