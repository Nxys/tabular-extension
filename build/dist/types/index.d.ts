export interface SelectionRect {
    left: number;
    top: number;
    right: number;
    bottom: number;
}
export interface TextElement {
    text: string;
    rect: DOMRect;
    element: Element;
    lineIndex: number;
    columnIndex: number;
}
export interface VisualLine {
    lineIndex: number;
    topY: number;
    bottomY: number;
    elements: TextElement[];
}
export interface ISelectionBox {
    startSelection(startX: number, startY: number): void;
    updateSelection(currentX: number, currentY: number): void;
    finishSelection(): SelectionRect;
    clearSelection(): void;
    setOnSelectionComplete(callback: (rect: SelectionRect) => void): void;
    isCurrentlySelecting(): boolean;
    isSelectionCompleted(): boolean;
    hasActiveSelection(): boolean;
    destroy(): void;
}
export interface IVisualTextExtractor {
    extractText(selectionRect: SelectionRect): string;
    getTextElements(rect: SelectionRect): TextElement[];
    sortByVisualOrder(elements: TextElement[]): TextElement[];
}
export interface IResultPanel {
    showResult(text: string): void;
    hide(): void;
    copyToClipboard(text: string): Promise<boolean>;
}
export interface IMainController {
    initialize(): void;
    destroy(): void;
}
//# sourceMappingURL=index.d.ts.map