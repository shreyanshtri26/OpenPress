import { AICommand } from './AIInlineTool';
import env from '../../utils/env';
import apiFetch from '../../utils/api';

type EditorBlock = { id?: string; type: string; data: any };

// AI Tool class for EditorJS integration
export class AITool {
  api: any;
  config: any;
  data: any;
  wrapper: HTMLElement | undefined;
  showingMenu: boolean;
  hoverTimeout: any;
  blockIndex: number;

  constructor({ api, config, data }: { api: any; config?: any; data?: any }) {
    this.api = api;
    this.config = config || {};
    this.data = data || {};
    this.wrapper = undefined;
    this.showingMenu = false;
    this.hoverTimeout = null;
    this.blockIndex = -1;
  }

  private storedBlockIndex: number = -1;
  // Flag to track if index is already stored
  private blockIndexStored: boolean = false;

  // NEW: Method to store the current block index
  storeCurrentBlockIndex() {
    // Only store if we haven't already stored the index for this tool instance
    if (!this.blockIndexStored) {
      try {
        this.storedBlockIndex = this.api.blocks.getCurrentBlockIndex();
        this.blockIndexStored = true; // Mark as stored
      } catch (error) {
        this.storedBlockIndex = -1;
      }
    } else {
    }
  }

  static get toolbox() {
    return {
      title: 'AI',
      icon: '✨',
    };
  }

  render() {
    // Store the current block index when the tool is rendered
    this.storeCurrentBlockIndex();

    this.wrapper = document.createElement('div');
    this.wrapper.style.cssText = `
      position: relative;
      border: 2px dashed #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      background: #fafafa;
    `;

    this.wrapper.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #6b7280; font-size: 14px;">
        <span style="font-size: 18px;">✨</span>
        <span>Click for AI commands</span>
      </div>
    `;

    this.wrapper.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.showingMenu) {
        // Store block index again when clicked (in case it changed)
        this.storeCurrentBlockIndex();
        this.showAIMenu();
      }
    });

    return this.wrapper;
  }

  // Enhanced cleanAIResponse method
  cleanAIResponse(text: string) {
    const cleanedText = text
      .replace(
        /^.*?(corrected text|summary|translation|rewritten text|expanded text|shortened text|keywords|result).*?:?\s*\n*/gi,
        '',
      )
      .replace(/^Here (is|are).*?:?\s*\n*/gi, '')
      .replace(/^:?\s*\n*/g, '')
      .trim();
    return cleanedText || text;
  }

  // NEW: Method to reset block index storage
  resetBlockIndexStorage() {
    this.storedBlockIndex = -1;
    this.blockIndexStored = false;
  }

  // Method to replace the stored block with AI response
  async replaceStoredBlock(content: string) {
    try {
      const blocks = this.convertResponseToBlocks(content);

      let targetIndex = this.storedBlockIndex;
      let currentAIToolIndex = -1;
      try {
        currentAIToolIndex = this.api.blocks.getCurrentBlockIndex();
      } catch {
        currentAIToolIndex = -1;
      }

      if (currentAIToolIndex !== -1) {
        targetIndex = currentAIToolIndex;
        await this.api.blocks.delete(currentAIToolIndex);
      } else if (targetIndex !== -1) {
        await this.api.blocks.delete(targetIndex);
      } else {
        targetIndex = this.api.blocks.getBlocksCount ? this.api.blocks.getBlocksCount() : 0;
      }

      for (let i = 0; i < blocks.length; i++) {
        await this.api.blocks.insert(
          blocks[i].type,
          blocks[i].data,
          {},
          targetIndex + i,
        );
      }

      // Focus on the first inserted block
      if (blocks.length > 0) {
        setTimeout(() => {
          this.api.caret?.setToBlock?.(targetIndex);
        }, 100);
      }

      // Reset the stored index after successful insertion
      this.resetBlockIndexStorage();
    } catch (error) {
      console.error('Error in replaceStoredBlock:', error);
      throw error;
    }
  }

  showAIMenu() {
    if (this.showingMenu) return;
    this.showingMenu = true;

    const aiCommands: AICommand[] = [
      {
        key: 'summarize',
        title: 'Summarize',
        icon: '',
        prompt:
          'Provide a concise summary of the entire story content provided. Return only the summary text, without any introductory phrases.',
      },
      {
        key: 'keywords',
        title: 'Keywords',
        icon: '',
        prompt:
          'Extract relevant keywords from the entire story content. Return them as a comma-separated list. Provide only the keywords, with no extra text.',
      },
      {
        key: 'translate',
        title: 'Translate',
        icon: '',
        submenu: [
          {
            key: 'translate_spanish',
            title: 'Spanish',
            prompt:
              'Translate the entire story content into Spanish. Return only the translated text, without any extra explanations.',
          },
          {
            key: 'translate_french',
            title: 'French',
            prompt:
              'Translate the entire story content into French. Return only the translated text, without any extra explanations.',
          },
          {
            key: 'translate_german',
            title: 'German',
            prompt:
              'Translate the entire story content into German. Return only the translated text, without any extra explanations.',
          },
        ],
      },
      {
        key: 'custom',
        title: 'Custom',
        icon: '',
        prompt: 'custom',
      },
    ];

    this.createBlockMenu(aiCommands);
  }

  createBlockMenu(commands: AICommand[]) {
    const menu = document.createElement('div');
    menu.className = 'ai-block-menu';
    menu.style.cssText = `
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 10;
      width: 200px;
      padding: 8px;
      margin-top: 8px;
    `;

    commands.forEach((command) => {
      const item = this.createMenuItem(command, menu);
      menu.appendChild(item);
    });

    this.wrapper?.appendChild(menu);

    const closeMenu = (e: MouseEvent) => {
      if (!menu.contains(e.target as Node)) {
        menu.remove();
        this.showingMenu = false;
        document.removeEventListener('click', closeMenu);
      }
    };

    setTimeout(() => {
      document.addEventListener('click', closeMenu);
    }, 100);
  }

  createMenuItem(command: AICommand, parentMenu: HTMLElement): HTMLElement {
    const item = document.createElement('div');
    item.className = 'ai-menu-item';
    item.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 12px;
      cursor: pointer;
      border-radius: 4px;
      font-size: 14px;
      transition: background-color 0.15s;
    `;

    item.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 16px;">${command.icon}</span>
        <span>${command.title}</span>
      </div>
      ${command.submenu ? '<span>▶</span>' : ''}
    `;

    let submenuTimeout: any;
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = '#f3f4f6';
      if (command.submenu) {
        submenuTimeout = setTimeout(() => {
          this.showSubmenu(command.submenu!, item);
        }, 200);
      }
    });

    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'transparent';
      clearTimeout(submenuTimeout);
      const existingSubmenu = item.querySelector('.ai-submenu');
      if (existingSubmenu) {
        setTimeout(() => {
          if (!item.matches(':hover')) {
            existingSubmenu.remove();
          }
        }, 300);
      }
    });

    if (!command.submenu) {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executeAICommand(command);
        parentMenu.remove();
        this.showingMenu = false;
      });
    }

    return item;
  }

  showSubmenu(submenuItems: AICommand[], parentItem: HTMLElement) {
    const existingSubmenu = parentItem.querySelector('.ai-submenu');
    if (existingSubmenu) existingSubmenu.remove();

    const submenu = document.createElement('div');
    submenu.className = 'ai-submenu';
    submenu.style.cssText = `
      position: absolute;
      left: 100%;
      top: 0;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      z-index: 20;
      width: 160px;
      padding: 8px;
      margin-left: 8px;
    `;

    submenuItems.forEach((subItem) => {
      const menuItem = this.createMenuItem(subItem, submenu);
      submenu.appendChild(menuItem);
    });

    parentItem.appendChild(submenu);
  }

  async executeAICommand(command: AICommand) {
    try {
      const outputData = typeof this.api.saver?.save === 'function'
        ? await this.api.saver.save()
        : (typeof this.api.save === 'function' ? await this.api.save() : { blocks: [] });

      const storyContent = (outputData?.blocks || [])
        .map((block: any) => {
          if (block.type === 'aiTool') return '';
          if (typeof block.data?.text === 'string') {
            return block.data.text.replace(/<[^>]*>/g, '').trim();
          }
          if (Array.isArray(block.data?.items)) {
            return block.data.items
              .map((item: any) => {
                const text = typeof item === 'string' ? item : (item?.content || '');
                return text.replace(/<[^>]*>/g, '').trim();
              })
              .filter(Boolean)
              .join('\n');
          }
          return '';
        })
        .filter((text: string) => Boolean(text && text.trim().length > 0))
        .join('\n\n');

      let finalPrompt: string | null;
      if (command.key === 'custom') {
        finalPrompt = await this.showCustomPromptDialog();
        if (!finalPrompt) return;
      } else {
        finalPrompt = command.prompt ?? null;
      }

      if (!finalPrompt) return;

      if (!storyContent && command.key !== 'custom') {
        alert('No text found to process. Please enter some content in the editor first.');
        return;
      }

      const result = await this.processWithAI(storyContent, finalPrompt);
      this.showResultModal(result, command.title);
    } catch (error) {
      console.error('AI command failed:', error);
      alert(`AI processing failed: ${(error as Error).message}`);
    }
  }

  async showCustomPromptDialog(): Promise<string | null> {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        background: white; padding: 24px; border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 100;
        width: 400px;
      `;
      dialog.innerHTML = `
        <h3 style="margin-top: 0; font-size: 18px;">Custom AI Prompt</h3>
        <textarea style="width: 100%; height: 80px; margin: 12px 0; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;"></textarea>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="cancel" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer;">Cancel</button>
          <button class="submit" style="padding: 8px 12px; border: none; border-radius: 4px; background: #3b82f6; color: white; cursor: pointer;">Submit</button>
        </div>
      `;
      document.body.appendChild(dialog);

      const textarea = dialog.querySelector('textarea')!;
      const cancelBtn = dialog.querySelector('.cancel')!;
      const submitBtn = dialog.querySelector('.submit')!;

      const closeDialog = (prompt: string | null) => {
        dialog.remove();
        resolve(prompt);
      };

      cancelBtn.addEventListener('click', () => closeDialog(null));
      submitBtn.addEventListener('click', () => closeDialog(textarea.value));
    });
  }

  async processWithAI(text: string, prompt: string): Promise<string> {
    this.showLoadingPopper();
    const aiConfig = this.config.aiConfig;
    const aiEndpoint = aiConfig?.apiUrl || (env.aiApi ? `${env.aiApi}/normal_stream` : null);
    if (!aiEndpoint) {
      this.hideLoadingPopper();
      throw new Error('AI API URL not configured');
    }

    try {
      const response = await apiFetch(aiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text ? `${text}\n\n${prompt}` : prompt,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API error (${response.status}): ${errorText || response.statusText}`);
      }

      if (!response.body) {
        const plainText = (await response.text()).trim();
        return plainText || 'No response from AI.';
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;

        const lines = chunk.split('\n');
        const content = lines.filter((line) => !line.startsWith('SESSION:')).join('\n');
        fullResponse += content;
      }

      return fullResponse.trim() || 'No response from AI.';
    } finally {
      this.hideLoadingPopper();
    }
  }

  showResultModal(result: string, commandTitle: string) {
    const cleanedResult = this.cleanAIResponse(result);
    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: white; padding: 24px; border-radius: 8px;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 100;
      width: 600px; max-height: 80vh; display: flex; flex-direction: column;
    `;
    modal.innerHTML = `
      <h3 style="margin-top: 0; font-size: 18px;">${commandTitle} Result</h3>
      <div class="result-content" style="flex-grow: 1; overflow-y: auto; border: 1px solid #e5e7eb; padding: 12px; border-radius: 4px; margin-bottom: 16px;">
        ${cleanedResult.replace(/\n/g, '<br>')}
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px;">
        <button class="close" style="padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer;">Close</button>
        <button class="replace" style="padding: 8px 12px; border: none; border-radius: 4px; background: #3b82f6; color: white; cursor: pointer;">Replace Content</button>
      </div>
    `;
    document.body.appendChild(modal);

    const closeBtn = modal.querySelector('.close')!;
    const replaceBtn = modal.querySelector('.replace')!;

    closeBtn.addEventListener('click', () => modal.remove());
    replaceBtn.addEventListener('click', async () => {
      await this.replaceStoredBlock(cleanedResult);
      modal.remove();
    });
  }

  showLoadingPopper() {
    this.hideLoadingPopper(); // Ensure no duplicates
    const popper = document.createElement('div');
    popper.className = 'ai-loading-popper';
    popper.style.cssText = `
      position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
      background: #3b82f6; color: white; padding: 12px 20px;
      border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      z-index: 101; display: flex; align-items: center; gap: 8px;
    `;
    popper.innerHTML = `
      <div class="spinner" style="width: 16px; height: 16px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 1s linear infinite;"></div>
      <span>AI is processing...</span>
    `;
    document.body.appendChild(popper);

    const style = document.createElement('style');
    if (!document.querySelector('#ai-spinner-style')) {
      style.id = 'ai-spinner-style';
      style.innerHTML = `@keyframes spin { to { transform: rotate(360deg); } }`;
      document.head.appendChild(style);
    }
  }

  hideLoadingPopper() {
    const popper = document.querySelector('.ai-loading-popper');
    if (popper) popper.remove();
  }

  save() {
    return this.data;
  }

  convertResponseToBlocks(response: string): EditorBlock[] {
    const blocks: EditorBlock[] = [];
    const paragraphs = response.split(/\n\s*\n/).filter((p) => p.trim());

    paragraphs.forEach((p) => {
      if (p.startsWith('#')) {
        const level = p.match(/^#+/)?.[0].length || 1;
        blocks.push({
          type: 'header',
          data: { text: p.replace(/^#+\s*/, ''), level: Math.min(level, 6) },
        });
      } else {
        blocks.push({ type: 'paragraph', data: { text: p } });
      }
    });

    return blocks.length > 0 ? blocks : [{ type: 'paragraph', data: { text: response } }];
  }

  static get isReadOnlySupported() {
    return true;
  }
}
