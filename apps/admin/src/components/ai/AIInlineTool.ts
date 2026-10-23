import { InlineToolConstructorOptions } from '@editorjs/editorjs';

import env from '../../utils/env';
import apiFetch from '../../utils/api';

// Define stored selection type
export interface StoredSelection {
  text: string;
  blockIndex: number;
  endBlockIndex?: number;
  startOffset: number;
  endOffset: number;
  blockData: any;
}

export type AICommand = {
  key: string;
  title: string;
  icon?: string;
  prompt?: string;
  submenu?: AICommand[]; // 👈 optional submenu
};

type CachedSelection = {
  range: Range;
  rawText: string;
  trimmedText: string;
  timestamp: number;
};

type EditorBlock = { id?: string; type: string; data: any };

// AI Inline Tools for text selection
export class AIInlineTool {
  api: any;
  config: any;
  wrapper: HTMLElement | undefined;

  // Store selection details
  private storedSelection: StoredSelection | null = null;
  private button: HTMLButtonElement | null = null;
  
  private static lastSelection: CachedSelection | null = null;
  private static selectionListenerAttached = false;
  private static pointerListenerAttached = false;
  private static keyboardListenerAttached = false;

  constructor({ api, config }: InlineToolConstructorOptions) {
    this.api = api;
    this.config = config;
    this.wrapper = undefined;
  }

  static get isInline() {
    return true;
  }

  get state() {
    return false;
  }

  render() {
    this.button = document.createElement('button');
    this.button.type = 'button';
    this.button.innerHTML = '✨';
    this.button.className = 'ce-inline-tool';
    this.button.title = 'Ask AI';

    // Prevent focus shift on click, which can clear the highlighted text.
    this.button.addEventListener('mousedown', (e) => {
      e.preventDefault();
    });

    AIInlineTool.setupGlobalSelectionTracking();
    return this.button;
  }

  surround = () => {
    // Don't modify the selection, just trigger AI menu
    this.storeSelectionAndShowMenu();
  };

  checkState() {
    return false;
  }

private static handleSelectionChange = () => {
    const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (range.collapsed) return;

  const rawText = selection.toString();
  if (!rawText || !rawText.trim()) return;

  AIInlineTool.lastSelection = {
    range: range.cloneRange(),
    rawText,
    trimmedText: rawText.trim(),
    timestamp: Date.now(),
  };
}

private static setupGlobalSelectionTracking() {
  if (!AIInlineTool.selectionListenerAttached) {
    document.addEventListener('selectionchange', AIInlineTool.handleSelectionChange);
    AIInlineTool.selectionListenerAttached = true;
  }

  // Capture BEFORE focus/selection is lost on first click
  if (!AIInlineTool.pointerListenerAttached) {
    document.addEventListener('mousedown', AIInlineTool.handleSelectionChange, true);
    document.addEventListener('mouseup', AIInlineTool.handleSelectionChange, true);
    document.addEventListener('touchstart', AIInlineTool.handleSelectionChange, true);
    document.addEventListener('touchend', AIInlineTool.handleSelectionChange, true);
    AIInlineTool.pointerListenerAttached = true;
  }

  if (!AIInlineTool.keyboardListenerAttached) {
    document.addEventListener('keyup', AIInlineTool.handleSelectionChange, true);
    AIInlineTool.keyboardListenerAttached = true;
  }
}

private getCurrentOrCachedSelection(): {
  selection: Selection | null;
  range: Range | null;
  selectedText: string;
} {
  const selection = window.getSelection();

  // Prefer live selection
  if (selection && selection.rangeCount > 0) {
    const liveRange = selection.getRangeAt(0);
    const liveText = selection.toString();

    if (
      !liveRange.collapsed &&
      liveText &&
      liveText.trim() 
    ) {
      return {
        selection,
        range: liveRange,
        selectedText: liveText,
      };
    }
  }

  // Fallback to cached selection if recent
  const cache = AIInlineTool.lastSelection;
  const maxAgeMs = 5000;

  if (cache && Date.now() - cache.timestamp <= maxAgeMs) {
    const restored = window.getSelection();
    if (restored) {
      restored.removeAllRanges();
      restored.addRange(cache.range.cloneRange());
      return {
        selection: restored,
        range: restored.rangeCount > 0 ? restored.getRangeAt(0) : null,
        selectedText: cache.rawText,
      };
    }
  }

  return { selection: null, range: null, selectedText: '' };
}

  // STEP 1: Store selected text and block information
  storeSelectionAndShowMenu = async () => {
    AIInlineTool.handleSelectionChange(); // Ensure we capture the latest selection
    const { selection, range, selectedText } = this.getCurrentOrCachedSelection();

    if (!selection || !range) {
      alert('Could not get text selection.');
      return;
    }

    if (!selectedText.trim()) {
      alert('Please select some text first.');
      return;
    }

    try {
      let startBlockIndex = this.findBlockIndexFromNode(range.startContainer);
      let endBlockIndex = this.findBlockIndexFromNode(range.endContainer);


      // Handle "Select All" or large selections where start/end might be outside blocks
      if (startBlockIndex === -1 || endBlockIndex === -1) {
        // Try to find the editor container
        const editorContainer = document.querySelector('.codex-editor__redactor') || document.querySelector('.codex-editor');

        // Check if the selection is within the editor
        if (editorContainer && (editorContainer.contains(range.startContainer) || editorContainer.contains(range.commonAncestorContainer))) {
          try {
            const blocksCount = this.api.blocks.getBlocksCount();

            if (startBlockIndex === -1) {
              // If start is unknown but inside editor, assume start
              startBlockIndex = 0;
            }

            if (endBlockIndex === -1) {
              // If end is unknown but inside editor, assume end
              endBlockIndex = blocksCount - 1;
            }
          } catch (e) {
            console.error('Error getting blocks count:', e);
          }
        }
      }

      if (startBlockIndex === -1) {
        alert('Could not determine which block contains the selection.');
        return;
      }

      // Use start block for data context
      const currentBlock = this.api.blocks.getBlockByIndex(startBlockIndex);
      if (!currentBlock) {
        console.error('No block found at index', startBlockIndex);
        return;
      }

      const blockData = await currentBlock.save();

      if (!blockData) {
        console.error('Failed to fetch block Data....');
        return;
      }

      // Store selection details for later use
      let textToProcess = selectedText;

      // If multiple blocks are selected, try to get text from blocks directly
      // This is more reliable than selection.toString() which might miss newlines or content
      if (endBlockIndex !== -1 && endBlockIndex > startBlockIndex) {
        try {
          const blockTexts: string[] = [];
          for (let i = startBlockIndex; i <= endBlockIndex; i++) {
            const block = this.api.blocks.getBlockByIndex(i);
            if (block) {
              const data = await block.save();
              let content = '';

              if (data.data?.text) content = data.data.text;
              else if (data.data?.caption) content = data.data.caption;
              else if (data.data?.content) content = data.data.content;
              else if (data.data?.items && Array.isArray(data.data.items)) {
                content = data.data.items
                  .map((item: any) => (typeof item === 'string' ? item : item.content))
                  .join('\n');
              }

              // Strip HTML tags
              content = content.replace(/<[^>]*>/g, '').trim();
              if (content) blockTexts.push(content);
            }
          }

          if (blockTexts.length > 0) {
            textToProcess = blockTexts.join('\n\n');
          }
        } catch (err) {
          console.error('Error constructing text from blocks:', err);
          // Fallback to selectedText
        }
      }

      this.storedSelection = {
        text: textToProcess,
        blockIndex: startBlockIndex,
        endBlockIndex: endBlockIndex !== -1 ? endBlockIndex : startBlockIndex,
        startOffset: range?.startOffset,
        endOffset: range?.endOffset,
        blockData: blockData,
      };


      // Show AI menu
      this.showAIMenu();
    } catch (error) {
      console.error('Error storing selection:', error);
      alert('Error processing selection. Please try again.');
    }
  };

  // Helper method to find block index from node
  findBlockIndexFromNode(node: Node): number {
    let element: Node | null = node;
    while (element && element.nodeType !== Node.ELEMENT_NODE) {
      element = element.parentNode;
    }

    let blockElement: HTMLElement | null = element as HTMLElement;
    while (blockElement && !blockElement.classList.contains('ce-block')) {
      blockElement = blockElement.parentElement;
    }

    if (!blockElement) return -1;

    // Find block index
    const allBlocks = document.querySelectorAll('.ce-block');
    for (let i = 0; i < allBlocks.length; i++) {
      if (allBlocks[i] === blockElement) {
        return i;
      }
    }

    return -1;
  }

  // Helper method to get text offset within a block
  getTextOffset(node: Node, offset: number, blockIndex: number): number {
    try {
      const blockElement = document.querySelectorAll('.ce-block')[blockIndex];
      if (!blockElement) return offset;

      const walker = document.createTreeWalker(
        blockElement,
        NodeFilter.SHOW_TEXT,
        null,
      );

      let totalOffset = 0;
      let currentNode;

      while ((currentNode = walker.nextNode())) {
        if (currentNode === node) {
          return totalOffset + offset;
        }
        totalOffset += currentNode.textContent?.length || 0;
      }

      return totalOffset;
    } catch (error) {
      console.error('Error calculating text offset:', error);
      return offset;
    }
  }

  showAIMenu() {
    if (!this.storedSelection) {
      alert('No text selected. Please select text first.');
      return;
    }

    const aiCommands = [
      {
        key: 'summarize',
        title: 'Summarize',
        icon: '',
        prompt:
          'Provide only a concise summary of the following text. Do not include any introduction or explanation, just return the direct summary text:',
      },
      {
        key: 'tone',
        title: 'Tone',
        icon: '',
        submenu: [
          {
            key: 'tone_neutral',

            title: 'Neutral',
            prompt: 'Rewrite the following text in a neutral tone. Return only the rewritten text without any introduction or explanation',
          },
          {
            key: 'tone_formal',
            title: 'Formal',
            prompt: 'Rewrite the following text in a formal tone. Return only the rewritten text without any introduction or explanation',
          },
          {
            key: 'tone_friendly',
            title: 'Friendly',
            prompt: 'Rewrite the following text in a friendly tone. Return only the rewritten text without any introduction or explanation',
          },
        ],
      },
      {
        key: 'expand',
        title: 'Expand',
        icon: '',
        prompt:
          'Return only the expanded version of the text with more detail and context. Do not include any introduction or explanation, just provide the enhanced text directly:',
      },
    ];

    this.createInlineMenu(aiCommands);
  }

  createInlineMenu(commands: any[]) {
    // Remove existing menu if any
    const existingMenu = document.querySelector('.ai-inline-menu');
    if (existingMenu) existingMenu.remove();

    const menu = document.createElement('div');
    menu.className = 'ai-inline-menu';
    menu.style.cssText = `
      position: fixed;
      background: white;
      z-index: 99999;
      padding: 0;
      min-width: 141px;
      max-height: 300px;
      overflow-y: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      border: 1px solid #e5e7eb;
      border-radius: 6px;
    `;

    // Position menu near selection
    const selection = window.getSelection();
    let rect: DOMRect | null = null;
    let isButtonRect = false;

    // 1. Try the stored button reference
    if (this.button && this.button.isConnected) {
      rect = this.button.getBoundingClientRect();
      isButtonRect = true;
    }

    // 2. Try finding the button in the active toolbar (more robust)
    if (!rect) {
      // First check the visible toolbar specifically
      const activeToolbar = document.querySelector('.ce-inline-toolbar--showed');
      if (activeToolbar) {
        // Try by title or content
        const btn = activeToolbar.querySelector('button[title="Ask AI"]') ||
          Array.from(activeToolbar.querySelectorAll('button')).find(b => b.textContent?.includes('✨'));

        if (btn) {
          rect = btn.getBoundingClientRect();
          isButtonRect = true;
        }
      }

      // Fallback: scan all AI buttons if still not found
      if (!rect) {
        const buttons = document.querySelectorAll('button[title="Ask AI"]');
        for (let i = 0; i < buttons.length; i++) {
          const btn = buttons[i] as HTMLElement;
          const r = btn.getBoundingClientRect();
          // Check if button is visible and likely the one we want (in viewport)
          if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= window.innerHeight) {
            rect = r;
            isButtonRect = true;
            break;
          }
        }
      }
    }

    // 3. Fallback to selection (only if button completely missing)
    if (!rect && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      rect = range.getBoundingClientRect();
      isButtonRect = false;
    }

    if (rect) {
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const menuHeight = 300; // Max height
      const menuWidth = 200;  // Approx width

      if (isButtonRect) {
        // Logic for when we have the button (preferred)
        const spaceBelow = viewportHeight - rect.bottom;

        // If not enough space below (approx 320px), force it ABOVE the button
        if (spaceBelow < 320) {
          menu.style.bottom = `${viewportHeight - rect.top + 10}px`;
          menu.style.top = 'auto';
        } else {
          menu.style.top = `${rect.bottom + 10}px`;
          menu.style.bottom = 'auto';
        }

        // Prevent horizontal overflow
        const leftPos = rect.left;
        if (leftPos + menuWidth > viewportWidth) {
          menu.style.left = 'auto';
          menu.style.right = '10px';
        } else {
          menu.style.left = `${leftPos}px`;
        }

      } else {
        // Fallback: If we only have the selection rect (button not found)
        // Just center it on screen to ensure visibility "where I am"
        menu.style.top = '50%';
        menu.style.left = '50%';
        menu.style.transform = 'translate(-50%, -50%)';
      }
    } else {
      // Fallback to center if no rect found
      menu.style.top = '50%';
      menu.style.left = '50%';
      menu.style.transform = 'translate(-50%, -50%)';
    }

    // Add commands
    commands.forEach((command) => {
      const item = this.createMenuItem(command, menu);
      menu.appendChild(item);
    });

    document.body.appendChild(menu);

    // Close menu on outside click
    const closeMenu = (e: any) => {
      // Don't close if clicking inside menu
      if (menu.contains(e.target)) return;

      // Don't close if clicking the AI button itself
      if (this.button && this.button.contains(e.target)) return;

      menu.remove();
      document.removeEventListener('click', closeMenu);
    };

    // Small delay to prevent immediate closing from the trigger click
    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  createMenuItem(command: any, parentMenu: HTMLElement) {
    const item = document.createElement('div');
    item.style.cssText = `
    position: relative;
  `;

    const button = document.createElement('div');
    button.style.cssText = `
    padding: 8px 12px;
    cursor: pointer;
    transition: all 0.15s ease;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    background: white;
    border: none; !important
  `;

    // final summarize
    const leftContent = document.createElement('div');
    leftContent.style.cssText = 'display: flex; align-items: center; gap: 8px;';
    leftContent.innerHTML = `
    <span style="font-size: 12px; width: 16px; text-align: center;">${command.icon}</span>
    <span style="font-size: 0.875rem; line-height: 1.25rem;">${command.title}</span>
  `;

    button.appendChild(leftContent);

    // Add arrow if submenu exists
    if (command.submenu) {
      const arrow = document.createElement('span');
      arrow.style.cssText = 'color: #9ca3af; font-size: 10px;';
      arrow.textContent = '▶';
      button.appendChild(arrow);
    }

    // Hover effects with submenu support
    let showSubmenuTimeout: any = null;
    let hideSubmenuTimeout: any = null;

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = '#f8fafc';

      if (hideSubmenuTimeout) {
        clearTimeout(hideSubmenuTimeout);
        hideSubmenuTimeout = null;
      }

      if (command.submenu) {
        showSubmenuTimeout = setTimeout(() => {
          this.showSubmenu(item, command.submenu, parentMenu);
        }, 150);
      }
    });

    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'white';

      if (showSubmenuTimeout) {
        clearTimeout(showSubmenuTimeout);
        showSubmenuTimeout = null;
      }

      if (command.submenu) {
        hideSubmenuTimeout = setTimeout(() => {
          const submenu = item.querySelector('.ai-submenu');
          if (submenu && !submenu.matches(':hover')) {
            submenu.remove();
          }
        }, 300);
      }
    });

    // Click handler - only for commands without submenu
    if (!command.submenu) {
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executeAICommand(command);
        parentMenu.remove();
      });
    }

    item.appendChild(button);
    return item;
  }

  showSubmenu(parentItem: HTMLElement, submenuItems: any[], parentMenu: HTMLElement) {
    // Remove existing submenu
    const existingSubmenu = parentItem.querySelector('.ai-submenu');
    if (existingSubmenu) {
      existingSubmenu.remove();
    }

    const submenu = document.createElement('div');
    submenu.className = 'ai-submenu';
    submenu.style.cssText = `
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: 2px;
    width: 160px;
    background: white;
    z-index: 10001;
    padding: 4px 0;
    font-family: inherit;
    opacity: 0;
    transform: translateX(-8px);
    transition: opacity 0.2s ease, transform 0.2s ease;
  `;

    submenuItems.forEach((subItem, index) => {
      const item = document.createElement('div');
      item.textContent = subItem.title;

      item.style.cssText = `
      padding: 6px 10px;
      font-size: 0.875rem; 
      line-height: 1.25rem
      background: white;
      z-index: 10001;
      min-width: 141px;
      max-height: 300px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f8fafc';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executeAICommand(subItem);
        parentMenu.remove();
        submenu.remove();
      });

      submenu.appendChild(item);
    });

    // Mouse handlers for submenu
    let hideSubmenuTimeout: any = null;

    submenu.addEventListener('mouseenter', () => {
      if (hideSubmenuTimeout) {
        clearTimeout(hideSubmenuTimeout);
        hideSubmenuTimeout = null;
      }
    });

    submenu.addEventListener('mouseleave', () => {
      hideSubmenuTimeout = setTimeout(() => {
        submenu.remove();
      }, 200);
    });

    // Append to body instead of parent item for proper positioning
    document.body.appendChild(submenu);

    // Calculate position relative to parent item
    const parentRect = parentItem.getBoundingClientRect();
    submenu.style.left = `${parentRect.right + 2}px`;
    submenu.style.top = `${parentRect.top}px`;
    submenu.style.position = 'fixed';

    // Animate submenu appearance
    setTimeout(() => {
      submenu.style.opacity = '1';
      submenu.style.transform = 'translateX(0)';
    }, 10);
  }

  // NEW: Show loading popper at top-center
  showLoadingPopper() {
    // Remove existing loading popper if any
    const existingPopper = document.querySelector('.ai-loading-popper');
    if (existingPopper) existingPopper.remove();

    const loadingPopper = document.createElement('div');
    loadingPopper.className = 'ai-loading-popper';
    loadingPopper.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(59, 130, 246, 0.95);
    color: white;
    padding: 12px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    gap: 10px;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
    animation: slideDown 0.3s ease-out;
  `;

    // Add CSS animation keyframes
    if (!document.querySelector('#ai-loading-styles')) {
      const style = document.createElement('style');
      style.id = 'ai-loading-styles';
      style.textContent = `
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateX(-50%) translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      .ai-spinner {
        width: 16px;
        height: 16px;
        border: 2px solid rgba(255, 255, 255, 0.3);
        border-top: 2px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
    `;
      document.head.appendChild(style);
    }

    // Create spinner
    const spinner = document.createElement('div');
    spinner.className = 'ai-spinner';

    // Create text
    const text = document.createElement('span');
    text.textContent = 'AI is processing...';

    loadingPopper.appendChild(spinner);
    loadingPopper.appendChild(text);

    document.body.appendChild(loadingPopper);
  }

  // NEW: Hide loading popper
  hideLoadingPopper() {
    const loadingPopper = document.querySelector(
      '.ai-loading-popper',
    ) as HTMLElement;

    if (loadingPopper) {
      // Add fade out animation
      loadingPopper.style.animation = 'slideUp 0.3s ease-out forwards';

      // Add slideUp animation if not exists
      const existingStyle = document.querySelector('#ai-loading-styles');
      if (existingStyle && !existingStyle.textContent?.includes('slideUp')) {
        existingStyle.textContent += `
        @keyframes slideUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-10px); opacity: 0; }
        }
      `;
      }

      // Remove element after animation
      setTimeout(() => {
        loadingPopper.remove();
      }, 300);
    }
  }

  showCustomPromptDialog(callback: any) {
    const overlay = document.createElement('div');
    overlay.className = 'ai-prompt-dialog';
    overlay.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5); display: flex;
    align-items: center; justify-content: center; z-index: 10000; padding: 20px;
  `;

    const dialog = document.createElement('div');
    dialog.style.cssText = `
    background: white;  width: 100%; max-width: 500px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

    dialog.innerHTML = `
    <div style="padding: 20px 24px 16px; border-bottom: 1px solid #e5e7eb;">
      <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #374151;">Custom AI Prompt</h3>
      <p style="margin: 8px 0 0; font-size: 14px; color: #6b7280;">Enter your custom prompt:</p>
    </div>
    <div style="padding: 20px 24px;">
      <textarea placeholder="e.g., Rewrite this text to make it more engaging" style="
        width: 100%; min-height: 100px; padding: 12px; border: 2px solid #e5e7eb;
         font-size: 14px; resize: vertical; outline: none;
        box-sizing: border-box;
      "></textarea>
    </div>
    <div style="display: flex; gap: 12px; padding: 16px 24px 20px; justify-content: flex-end;">
      <button class="cancel-btn" style="padding: 8px 16px; background: white; color: #374151; border: 1px solid #d1d5db;  cursor: pointer;">Cancel</button>
      <button class="submit-btn" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; cursor: pointer;">Process</button>
    </div>
  `;

    const textarea = dialog.querySelector('textarea');
    const cancelBtn = dialog.querySelector('.cancel-btn');
    const submitBtn = dialog.querySelector('.submit-btn');

    cancelBtn?.addEventListener('click', () => {
      overlay.remove();
      callback(null);
    });

    submitBtn?.addEventListener('click', () => {
      const prompt = textarea?.value.trim();
      if (prompt) {
        overlay.remove();
        callback(prompt);
      }
    });

    // Handle Enter key in textarea
    textarea?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        const prompt = textarea.value.trim();
        if (prompt) {
          overlay.remove();
          callback(prompt);
        }
      }
    });

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    textarea?.focus();
  }

  // Modified executeAICommand method
  async executeAICommand(command: any) {
    if (!this.storedSelection) {
      alert('No stored selection found. Please select text again.');
      return;
    }

    try {
      let finalPrompt = command.prompt;

      if (command.key === 'askAI') {
        // Use the custom prompt dialog instead of window.prompt
        return new Promise((resolve) => {
          this.showCustomPromptDialog((customPrompt: string | null) => {
            if (!customPrompt) {
              return resolve(undefined);
            }

            finalPrompt = customPrompt;

            // Continue processing with the custom prompt
            this.processWithAI(this.storedSelection!.text, {
              ...command,
              prompt: finalPrompt,
            })
              .then((processedText) => {
                // Show result modal with replace option
                this.showResultModal(processedText, command.title);
                resolve(undefined);
              })
              .catch((error) => {
                console.error('AI command execution failed:', error);
                alert(`AI processing failed: ${error.message}`);
                resolve(undefined);
              });
          });
        });
      }

      const processedText = await this.processWithAI(
        this.storedSelection.text,
        {
          ...command,
          prompt: finalPrompt,
        },
      );


      // Show result modal with replace option
      this.showResultModal(processedText, command.title);
    } catch (error) {
      console.error('AI command execution failed:', error);
      alert(`AI processing failed: ${(error as Error).message}`);
    }
  }

  async processWithAI(text: string, command: any) {

    // SHOW LOADING POPPER - NEW
    this.showLoadingPopper();

    const aiConfig = this.config.aiConfig;
    const aiEndpoint = aiConfig?.apiUrl || (env.aiApi ? `${env.aiApi}/normal_stream` : null);
    if (!aiEndpoint) {
      throw new Error('AI API URL not configured');
    }

    let finalPrompt: string;
    if (command.key === 'askAI') {
      finalPrompt = command.prompt;
    } else {
      finalPrompt = `${command.prompt} ${text}`;
    }


    try {
      const requestBody = {
        query: text ? `${text}\n\n${finalPrompt}` : finalPrompt,
      };


      const response = await apiFetch(aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error ${response.status}: ${errorText}`);
      }

      if (!response.body) {
        const plainText = (await response.text()).trim();
        return plainText || 'No response received';
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let responseText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        const lines = chunk.split('\n');
        const content = lines.filter((line) => !line.startsWith('SESSION:')).join('\n');
        responseText += content;
      }

      return responseText.trim() || 'No response received';
    } catch (error) {
      console.error('Processing error:', error);
      throw error;
    } finally {
      this.hideLoadingPopper();
    }
  }

  showResultModal(result: string, commandTitle: string) {

    const existingModal = document.querySelector('.ai-result-modal');
    if (existingModal) existingModal.remove();

    const cleanedResult = this.cleanAIResponse(result);

    const overlay = document.createElement('div');
    overlay.className = 'ai-result-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;

    const modal = document.createElement('div');

    // Modal content
    modal.innerHTML = `
      <div style="display: flex; flex-direction: column; background: #ffffff; width: 581px; max-width: 90%; border: 1px solid #000000; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <!-- Header -->
        <div style="display: flex; align-items: center; justify-content: flex-end; padding: 8px 12px; background: #ffffff;">
          <button class="close-btn" style="background: none; border: none; font-size: 20px; color: #000000; cursor: pointer; line-height: 1;">×</button>
        </div>

        <!-- Body -->
        <div style="padding-left: 40px; padding-right: 30px; text-align: left; overflow-y: auto; max-height: 13rem; color: #000000; font-size: 17px; line-height: 1.3;">
          ${cleanedResult}
        </div>
        <!-- Footer -->
        <div style="display: flex; gap: 12px; padding: 22px 39px 30px; background: #ffffff;">
          <button class="replace-btn" style="padding: 6px 14px; background: white; color: #000000; border: 1px solid #000000; border-radius: 0; font-size: 0.875rem; font-weight: 500; cursor: pointer; line-height: 1.25rem;">Replace</button>
          <button class="copy-btn" style="padding: 6px 14px; background: white; color: #000000; border: 1px solid #000000; border-radius: 0; font-size: 0.875rem; font-weight: 500; cursor: pointer; line-height: 1.25rem;">Copy</button>
        </div>
      </div>
    `;

    overlay.appendChild(modal);

    // Event handlers
    const closeModal = () => {
      overlay.remove();
      // Clear stored selection after modal closes
      this.storedSelection = null;
    };

    modal.querySelector('.close-btn')?.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    // STEP 2: Replace only the selected text when user accepts
    modal.querySelector('.replace-btn')?.addEventListener('click', async () => {
      await this.replaceStoredSelection(cleanedResult);
      closeModal();
    });

    modal.querySelector('.copy-btn')?.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cleanedResult);
        const btn = modal.querySelector('.copy-btn') as HTMLElement;
        btn.textContent = 'Copied!';
        btn.style.backgroundColor = '#10b981';
        btn.style.color = 'white';
        setTimeout(() => {
          btn.textContent = 'Copy to Clipboard';
          btn.style.backgroundColor = 'white';
          btn.style.color = '#374151';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    document.body.appendChild(overlay);
  }

  // Helper to convert text to blocks
  convertResponseToBlocks(response: string) {
    const blocks: EditorBlock[] = [];
    let paragraphs = response.split(/\n\s*\n/).filter((p) => p.trim());

    if (paragraphs.length === 0) {
      paragraphs = response.split(/\n/).filter((p) => p.trim());
    }

    if (paragraphs.length === 0) {
      paragraphs = [response];
    }

    paragraphs.forEach((paragraph) => {
      const trimmedParagraph = paragraph.trim();
      if (trimmedParagraph) {
        if (trimmedParagraph.startsWith('#')) {
          const level = (trimmedParagraph.match(/^#+/) || [''])[0].length;
          const text = trimmedParagraph.replace(/^#+\s*/, '');
          blocks.push({
            type: 'header',
            data: {
              text: text,
              level: Math.min(level, 6),
            },
          });
        } else {
          blocks.push({
            type: 'paragraph',
            data: { text: trimmedParagraph },
          });
        }
      }
    });

    return blocks.length > 0
      ? blocks
      : [{ type: 'paragraph', data: { text: response } }];
  }

  // STEP 3: Replace the stored selected text with AI response
  async replaceStoredSelection(newText: string) {
    if (!this.storedSelection) {
      alert('No stored selection to replace.');
      return;
    }


    try {
      const {
        blockIndex,
        endBlockIndex,
        text: originalText,
        blockData,
      } = this.storedSelection;

      // Handle multi-block replacement
      if (endBlockIndex !== undefined && endBlockIndex > blockIndex) {

        // 1. Delete subsequent blocks first
        const countToDelete = endBlockIndex - blockIndex;
        for (let i = 0; i < countToDelete; i++) {
          // Always delete the block at blockIndex + 1
          // As we delete, the next blocks shift up
          await this.api.blocks.delete(blockIndex + 1);
        }

        // 2. Convert new text to blocks
        const newBlocks = this.convertResponseToBlocks(newText);

        // 3. Replace the first block with the first new block
        if (newBlocks.length > 0) {
          const firstNewBlock = newBlocks[0];

          // Delete the old first block
          await this.api.blocks.delete(blockIndex);

          // Insert the new first block
          await this.api.blocks.insert(
            firstNewBlock.type,
            firstNewBlock.data,
            {},
            blockIndex
          );

          // 4. Insert remaining new blocks
          for (let i = 1; i < newBlocks.length; i++) {
            await this.api.blocks.insert(
              newBlocks[i].type,
              newBlocks[i].data,
              {},
              blockIndex + i
            );
          }

          // Set caret to the end of the last inserted block
          setTimeout(() => {
            this.api.caret.setToBlock(blockIndex + newBlocks.length - 1, 'end');
          }, 100);
        }

        return;
      }

      // Get current block
      const currentBlock = this.api.blocks.getBlockByIndex(blockIndex);
      if (!currentBlock) {
        throw new Error('Block not found');
      }


      // Get current block data
      const currentBlockData = await currentBlock.save();
      const currentText = currentBlockData.data.text || '';

      // Replace only the selected text portion
      const updatedText = currentText.replace(originalText, newText);

      // Update the block with new content
      const newBlockData = {
        ...currentBlockData,
        text: updatedText,
      };

      // Delete and re-insert the block with updated content
      await this.api.blocks.delete(blockIndex);
      await this.api.blocks.insert(
        currentBlock.name,
        newBlockData,
        {},
        blockIndex,
      );

      // Set focus back to the block
      setTimeout(() => {
        this.api.caret.setToBlock(blockIndex, 'end');
      }, 100);

    } catch (error) {
      console.error('Error replacing stored selection:', error);
      alert('Failed to replace text. Content copied to clipboard.');
      navigator.clipboard.writeText(newText);
    }
  }

  cleanAIResponse(text: string): string {
    const cleanedText = text
      .replace(
        /^(.*?)(corrected text|summary|translation|rewritten text|expanded text|shortened text|keywords|result)[:\s]*/gi,
        '',
      )
      .replace(/^here is\/are[:\s]*/gi, '')
      .replace(/^[:\s]+/g, '')
      .trim();

    return cleanedText || text;
  }
}
