export interface StoredSelection {
  text: string;
  blockIndex: number;
  endBlockIndex?: number;
  startOffset: number;
  endOffset: number;
  blockData: any;
}

export interface AICommand {
  key: string;
  title: string;
  icon?: string;
  prompt?: string;
  submenu?: AICommand[];
}

export interface EditorBlock {
  id?: string;
  type: string;
  data: any;
}
