import { useEffect, useRef, useState, useCallback } from 'react';
import env from '@/utils/env';
import apiFetch from '../../utils/api';

let EditorJS;
if (typeof window !== 'undefined') {
  EditorJS = require('@editorjs/editorjs').default;
}

// AI Tool with cleaned response output
class AITool {
  constructor({ api, config, data }) {
    this.api = api;
    this.config = config;
    this.wrapper = undefined;
    this.showingMenu = false;
    this.hoverTimeout = null;
  }

  static get toolbox() {
    return {
      title: 'AI',
      icon: '✨',
    };
  }

  render() {
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
        this.showAIMenu();
      }
    });

    return this.wrapper;
  }

  // NEW: Clean AI response to remove instruction prefixes
  cleanAIResponse(text) {
    const cleanedText = text
      // Remove lines that start with common AI instruction patterns
      .replace(
        /^.*?(corrected text|summary|translation|rewritten text|expanded text|shortened text|keywords|result).*?:?\s*\n*/gi,
        '',
      )
      // Remove lines that start with "Here is" or "Here are"
      .replace(/^Here (is|are).*?:?\s*\n*/gi, '')
      // Remove any remaining leading colons and whitespace
      .replace(/^:?\s*\n*/g, '')
      .trim();

    return cleanedText || text; // Fallback to original if cleaning removes everything
  }

  showAIMenu() {
    if (this.showingMenu) return;
    this.showingMenu = true;

    const aiCommands = [
      {
        key: 'summarize',
        title: 'Summarize',
        icon: '📝',
        prompt:
          'Provide only a concise summary of the following text. Do not include any introduction or explanation, just return the direct summary text:',
      },
      {
        key: 'proofread',
        title: 'Proofread',
        icon: '✅',
        prompt:
          'Return only the corrected text. Do not include any explanations, introductions, or confirmations. Simply provide the grammatically correct version:',
      },
      {
        key: 'expand',
        title: 'Expand',
        icon: '📈',
        prompt:
          'Return only the expanded version of the text with more detail and context. Do not include any introduction or explanation, just provide the enhanced text directly:',
      },
      {
        key: 'shorten',
        title: 'Shorten',
        icon: '📉',
        prompt:
          'Return only the shortened version of the text. Do not include any introduction or explanation, just provide the concise version directly:',
      },
      {
        key: 'changeStyle',
        title: 'Change Style',
        icon: '🎨',
        submenu: [
          {
            key: 'style_formal',
            title: 'Formal',
            prompt:
              'Return only the text rewritten in formal style. No introduction or explanation, just the direct formal version:',
          },
          {
            key: 'style_informal',
            title: 'Informal',
            prompt:
              'Return only the text rewritten in informal style. No introduction or explanation, just the direct informal version:',
          },
          {
            key: 'style_technical',
            title: 'Technical',
            prompt:
              'Return only the text rewritten in technical style. No introduction or explanation, just the direct technical version:',
          },
          {
            key: 'style_business',
            title: 'Business',
            prompt:
              'Return only the text rewritten in business style. No introduction or explanation, just the direct business version:',
          },
          {
            key: 'style_creative',
            title: 'Creative',
            prompt:
              'Return only the text rewritten in creative style. No introduction or explanation, just the direct creative version:',
          },
          {
            key: 'style_journalistic',
            title: 'Journalistic',
            prompt:
              'Return only the text rewritten in journalistic style. No introduction or explanation, just the direct journalistic version:',
          },
          {
            key: 'style_academic',
            title: 'Academic',
            prompt:
              'Return only the text rewritten in academic style. No introduction or explanation, just the direct academic version:',
          },
          {
            key: 'style_persuasive',
            title: 'Persuasive',
            prompt:
              'Return only the text rewritten in persuasive style. No introduction or explanation, just the direct persuasive version:',
          },
          {
            key: 'style_narrative',
            title: 'Narrative',
            prompt:
              'Return only the text rewritten in narrative style. No introduction or explanation, just the direct narrative version:',
          },
          {
            key: 'style_expository',
            title: 'Expository',
            prompt:
              'Return only the text rewritten in expository style. No introduction or explanation, just the direct expository version:',
          },
          {
            key: 'style_descriptive',
            title: 'Descriptive',
            prompt:
              'Return only the text rewritten in descriptive style. No introduction or explanation, just the direct descriptive version:',
          },
          {
            key: 'style_conversational',
            title: 'Conversational',
            prompt:
              'Return only the text rewritten in conversational style. No introduction or explanation, just the direct conversational version:',
          },
        ],
      },
      {
        key: 'changeTone',
        title: 'Change Tone',
        icon: '🗣️',
        submenu: [
          {
            key: 'tone_professional',
            title: 'Professional',
            prompt:
              'Return only the text with a professional tone. No introduction or explanation, just the direct professional version:',
          },
          {
            key: 'tone_casual',
            title: 'Casual',
            prompt:
              'Return only the text with a casual tone. No introduction or explanation, just the direct casual version:',
          },
          {
            key: 'tone_straightforward',
            title: 'Straightforward',
            prompt:
              'Return only the text with a straightforward tone. No introduction or explanation, just the direct straightforward version:',
          },
          {
            key: 'tone_confident',
            title: 'Confident',
            prompt:
              'Return only the text with a confident tone. No introduction or explanation, just the direct confident version:',
          },
          {
            key: 'tone_friendly',
            title: 'Friendly',
            prompt:
              'Return only the text with a friendly tone. No introduction or explanation, just the direct friendly version:',
          },
        ],
      },
      {
        key: 'translate',
        title: 'Translate',
        icon: '🌍',
        submenu: [
          {
            key: 'translate_spanish',
            title: 'Spanish',
            prompt:
              'Return only the Spanish translation. No introduction or explanation, just the direct translation:',
          },
          {
            key: 'translate_french',
            title: 'French',
            prompt:
              'Return only the French translation. No introduction or explanation, just the direct translation:',
          },
          {
            key: 'translate_german',
            title: 'German',
            prompt:
              'Return only the German translation. No introduction or explanation, just the direct translation:',
          },
          {
            key: 'translate_chinese',
            title: 'Chinese',
            prompt:
              'Return only the Chinese translation. No introduction or explanation, just the direct translation:',
          },
          {
            key: 'translate_japanese',
            title: 'Japanese',
            prompt:
              'Return only the Japanese translation. No introduction or explanation, just the direct translation:',
          },
          {
            key: 'translate_arabic',
            title: 'Arabic',
            prompt:
              'Return only the Arabic translation. No introduction or explanation, just the direct translation:',
          },
        ],
      },
      {
        key: 'extractKeywords',
        title: 'Extract Keywords',
        icon: '🔍',
        prompt:
          'Return only the keywords and key phrases as a simple list. No introduction or explanation, just the direct keyword list:',
      },
      // { key: 'askAI', title: 'Ask AI', icon: '🤖', prompt: 'custom' },
    ];

    // Create menu with smaller size
    const menu = document.createElement('div');
    menu.className = 'ai-menu-dropdown';
    menu.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      width: 240px;
      background: white;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      padding: 0;
      overflow: visible;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;

    // Smaller header
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 10px 12px;
      font-size: 10px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    `;
    header.textContent = 'AI COMMANDS';
    menu.appendChild(header);

    // Menu items with smaller size
    const menuContainer = document.createElement('div');
    menuContainer.style.cssText = 'background: white; overflow: visible;';

    aiCommands.forEach((command, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        position: relative;
        border-bottom: ${index < aiCommands.length - 1 ? '1px solid #f3f4f6' : 'none'};
      `;

      const button = document.createElement('div');
      button.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        cursor: pointer;
        transition: all 0.15s ease;
        background: white;
        position: relative;
      `;

      const leftContent = document.createElement('div');
      leftContent.style.cssText =
        'display: flex; align-items: center; gap: 8px;';
      leftContent.innerHTML = `
        <span style="font-size: 12px; width: 16px; text-align: center;">${command.icon}</span>
        <span style="font-weight: 500; color: #374151; font-size: 12px;">${command.title}</span>
      `;

      button.appendChild(leftContent);

      if (command.submenu) {
        const arrow = document.createElement('span');
        arrow.style.cssText =
          'color: #9ca3af; font-size: 10px; transform: rotate(0deg); transition: transform 0.15s ease;';
        arrow.textContent = '▶';
        button.appendChild(arrow);
      }

      // Better hover handling with proper delays
      let showSubmenuTimeout = null;
      let hideSubmenuTimeout = null;

      button.addEventListener('mouseenter', () => {
        button.style.backgroundColor = '#f8fafc';

        // Clear any pending hide timeout
        if (hideSubmenuTimeout) {
          clearTimeout(hideSubmenuTimeout);
          hideSubmenuTimeout = null;
        }

        if (command.submenu) {
          // Show submenu after short delay
          showSubmenuTimeout = setTimeout(() => {
            this.showSubmenu(item, command.submenu);
          }, 150);
        }
      });

      button.addEventListener('mouseleave', () => {
        button.style.backgroundColor = 'white';

        // Clear show timeout if mouse left quickly
        if (showSubmenuTimeout) {
          clearTimeout(showSubmenuTimeout);
          showSubmenuTimeout = null;
        }

        if (command.submenu) {
          // Hide submenu after delay, unless mouse enters submenu
          hideSubmenuTimeout = setTimeout(() => {
            const submenu = item.querySelector('.ai-submenu');
            if (submenu && !submenu.matches(':hover')) {
              submenu.remove();
            }
          }, 300);
        }
      });

      // Click handler
      if (!command.submenu) {
        button.addEventListener('click', (e) => {
          e.stopPropagation();
          this.executeAICommand(command);
          menu.remove();
          this.showingMenu = false;
        });
      }

      item.appendChild(button);
      menuContainer.appendChild(item);
    });

    menu.appendChild(menuContainer);
    this.wrapper.appendChild(menu);

    // Close menu when clicking outside
    const closeMenu = (e) => {
      if (!menu.contains(e.target) && !this.wrapper.contains(e.target)) {
        menu.remove();
        this.showingMenu = false;
        document.removeEventListener('click', closeMenu);
      }
    };
    setTimeout(() => document.addEventListener('click', closeMenu), 0);
  }

  showSubmenu(parentItem, submenuItems) {
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
      border: 1px solid #d1d5db;
      border-radius: 8px;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
      z-index: 1001;
      padding: 4px 0;
      font-family: inherit;
      opacity: 0;
      transform: translateX(-8px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    `;

    submenuItems.forEach((subItem, index) => {
      const item = document.createElement('div');
      item.style.cssText = `
        padding: 6px 10px;
        cursor: pointer;
        transition: all 0.15s ease;
        font-size: 11px;
        color: #374151;
        font-weight: 400;
        border-bottom: ${index < submenuItems.length - 1 ? '1px solid #f3f4f6' : 'none'};
      `;
      item.textContent = subItem.title;

      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f8fafc';
      });

      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        this.executeAICommand(subItem);
        const mainMenu = this.wrapper.querySelector('.ai-menu-dropdown');
        if (mainMenu) {
          mainMenu.remove();
        }
        this.showingMenu = false;
      });

      submenu.appendChild(item);
    });

    // Add mouse enter/leave handlers to submenu itself
    let hideSubmenuTimeout = null;

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

    parentItem.appendChild(submenu);

    // Animate submenu appearance
    setTimeout(() => {
      submenu.style.opacity = '1';
      submenu.style.transform = 'translateX(0)';
    }, 10);
  }

  // UPDATED: Show AI result in modal with cleaned response
  showResultModal(result, commandTitle) {
    // Remove existing modal if any
    const existingModal = document.querySelector('.ai-result-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Clean the AI response
    const cleanedResult = this.cleanAIResponse(result);

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'ai-result-modal';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      padding: 20px;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      width: 100%;
      max-width: 600px;
      max-height: 80vh;
      overflow: hidden;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    `;

    // Modal header
    const header = document.createElement('div');
    header.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 20px 24px;
      border-bottom: 1px solid #e5e7eb;
      background: #f9fafb;
    `;

    const title = document.createElement('h3');
    title.style.cssText = `
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #374151;
    `;
    title.textContent = `AI Result: ${commandTitle}`;

    const closeButton = document.createElement('button');
    closeButton.style.cssText = `
      background: none;
      border: none;
      font-size: 24px;
      color: #6b7280;
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      transition: all 0.15s ease;
    `;
    closeButton.innerHTML = '×';
    closeButton.addEventListener('mouseenter', () => {
      closeButton.style.backgroundColor = '#f3f4f6';
      closeButton.style.color = '#374151';
    });
    closeButton.addEventListener('mouseleave', () => {
      closeButton.style.backgroundColor = 'transparent';
      closeButton.style.color = '#6b7280';
    });

    header.appendChild(title);
    header.appendChild(closeButton);

    // Modal body
    const body = document.createElement('div');
    body.style.cssText = `
      padding: 24px;
      overflow-y: auto;
      max-height: calc(80vh - 140px);
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      line-height: 1.6;
      color: #374151;
      font-size: 14px;
      white-space: pre-wrap;
    `;
    // UPDATED: Use cleaned result
    content.textContent = cleanedResult;

    body.appendChild(content);

    // Modal footer with action buttons
    const footer = document.createElement('div');
    footer.style.cssText = `
      display: flex;
      gap: 12px;
      padding: 20px 24px;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
      justify-content: flex-end;
    `;

    const insertButton = document.createElement('button');
    insertButton.style.cssText = `
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    insertButton.textContent = 'Insert into Editor';
    insertButton.addEventListener('mouseenter', () => {
      insertButton.style.backgroundColor = '#2563eb';
    });
    insertButton.addEventListener('mouseleave', () => {
      insertButton.style.backgroundColor = '#3b82f6';
    });

    const copyButton = document.createElement('button');
    copyButton.style.cssText = `
      padding: 8px 16px;
      background: white;
      color: #374151;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s ease;
    `;
    copyButton.textContent = 'Copy to Clipboard';
    copyButton.addEventListener('mouseenter', () => {
      copyButton.style.backgroundColor = '#f9fafb';
      copyButton.style.borderColor = '#9ca3af';
    });
    copyButton.addEventListener('mouseleave', () => {
      copyButton.style.backgroundColor = 'white';
      copyButton.style.borderColor = '#d1d5db';
    });

    footer.appendChild(copyButton);
    footer.appendChild(insertButton);

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    // Event handlers
    const closeModal = () => {
      overlay.remove();
    };

    closeButton.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // UPDATED: Use cleaned result for insert
    insertButton.addEventListener('click', () => {
      this.insertContentIntoEditor(cleanedResult);
      closeModal();
    });

    // UPDATED: Use cleaned result for copy
    copyButton.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(cleanedResult);
        copyButton.textContent = 'Copied!';
        copyButton.style.backgroundColor = '#10b981';
        copyButton.style.color = 'white';
        copyButton.style.borderColor = '#10b981';
        setTimeout(() => {
          copyButton.textContent = 'Copy to Clipboard';
          copyButton.style.backgroundColor = 'white';
          copyButton.style.color = '#374151';
          copyButton.style.borderColor = '#d1d5db';
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    });

    // Add to DOM
    document.body.appendChild(overlay);

    // Focus management
    closeButton.focus();
  }

  // UPDATED: Replace content instead of appending
  async insertContentIntoEditor(content) {
    try {
      const blocks = this.convertResponseToBlocks(content);

      // Clear all content and insert new (simplest and most reliable)
      await this.api.blocks.clear();

      // Insert new blocks
      for (let i = 0; i < blocks.length; i++) {
        await this.api.blocks.insert(blocks[i].type, blocks[i].data, {}, i);
      }
    } catch (error) {
      console.error('Error replacing content:', error);

      // Fallback: try alternative approach
      try {
        const blocks = this.convertResponseToBlocks(content);
        const blockCount = this.api.blocks.getBlocksCount();

        // Delete all blocks starting from the end
        for (let i = blockCount - 1; i >= 0; i--) {
          await this.api.blocks.delete(i);
        }

        // Insert new content
        for (let i = 0; i < blocks.length; i++) {
          await this.api.blocks.insert(blocks[i].type, blocks[i].data, {}, i);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  }

  async getCurrentText() {
    try {
      const selection = window.getSelection();
      const selectedText = selection.toString().trim();

      if (selectedText) {
        return selectedText;
      }

      const outputData = await this.api.saver.save();
      const allText = outputData.blocks
        .map((block) => {
          if (block.type === 'paragraph' || block.type === 'header') {
            const text = block.data?.text || '';
            return text.replace(/<[^>]*>/g, '').trim();
          }
          return '';
        })
        .filter((text) => text.length > 0)
        .join(' ')
        .trim();

      return allText;
    } catch (error) {
      console.error('Error getting text:', error);
      return '';
    }
  }

  async processWithAI(text, command) {
    const aiConfig = this.config.aiConfig;
    const aiEndpoint = aiConfig?.apiUrl || (env.aiApi ? `${env.aiApi}/normal_stream` : null);
    if (!aiEndpoint) {
      throw new Error('AI API URL not configured');
    }

    let prompt = command.prompt;

    if (command.key === 'askAI') {
      prompt = command.prompt;
    } else {
      if (command.prompt === 'custom') {
        prompt = window.prompt('Enter your custom prompt:');
        if (!prompt) return text;
        prompt = `${prompt}: ${text}`;
      } else {
        prompt = `${command.prompt}: ${text}`;
      }
    }

    try {
      const response = await apiFetch(aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: prompt }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `AI API error: ${response.status} - ${errorText}`,
        );
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
    }
  }

  convertResponseToBlocks(response) {
    const blocks = [];
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

  async executeAICommand(command) {
    try {
      // Show loading state
      this.wrapper.innerHTML = `
        <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div style="width: 18px; height: 18px; border: 2px solid #3b82f6; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
          <span style="color: #475569; font-weight: 500; font-size: 14px;">AI is processing...</span>
        </div>
      `;

      const currentText = await this.getCurrentText();

      if (
        command.key !== 'askAI' &&
        (!currentText || currentText.trim().length === 0)
      ) {
        alert(
          'No text found to process. Please enter some content in the editor first.',
        );
        this.resetTool();
        return;
      }

      let finalPrompt = command.prompt;

      if (command.key === 'askAI') {
        const customPrompt = window.prompt('Enter your custom prompt:');
        if (!customPrompt) {
          this.resetTool();
          return;
        }
        finalPrompt = customPrompt;
      }

      const textToProcess = currentText || '';
      const processedText = await this.processWithAI(textToProcess, {
        ...command,
        prompt: finalPrompt,
      });

      // Show result in modal (cleaning happens inside showResultModal)
      this.showResultModal(processedText, command.title);

      // Reset the AI tool block
      this.resetTool();
    } catch (error) {
      console.error('AI command execution failed:', error);
      alert(`AI processing failed: ${error.message}`);
      this.resetTool();
    }
  }

  resetTool() {
    this.wrapper.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; gap: 8px; color: #6b7280; font-size: 14px;">
        <span style="font-size: 18px;">✨</span>
        <span>Click for AI commands</span>
      </div>
    `;
    this.showingMenu = false;
  }

  save() {
    return {};
  }

  static get isReadOnlySupported() {
    return true;
  }
}

const EditorWrapper = ({
  initialData,
  onChange,
  readOnly,
  aiConfig,
  holder,
}) => {

  const editorRef = useRef(null);
  const instanceRef = useRef(null);

  useEffect(() => {
    if (!EditorJS || !editorRef.current) return;

    // Clean up previous instance
    if (instanceRef.current && instanceRef.current.destroy) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    // Tool imports
    let Header,
      List,
      Checklist,
      Quote,
      Table,
      Embed,
      Image,
      Marker,
      InlineCode,
      LinkTool,
      Delimiter,
      Paragraph;

    try {
      Paragraph = require('@editorjs/paragraph');
    } catch { }
    try {
      Header = require('@editorjs/header');
    } catch { }
    try {
      List = require('@editorjs/list');
    } catch { }
    try {
      Checklist = require('@editorjs/checklist');
    } catch { }
    try {
      Quote = require('@editorjs/quote');
    } catch { }
    try {
      Table = require('@editorjs/table');
    } catch { }
    try {
      Embed = require('@editorjs/embed');
    } catch { }
    try {
      Image = require('@editorjs/image');
    } catch { }
    try {
      Marker = require('@editorjs/marker');
    } catch { }
    try {
      InlineCode = require('@editorjs/inline-code');
    } catch { }
    try {
      LinkTool = require('@editorjs/link');
    } catch { }
    try {
      Delimiter = require('@editorjs/delimiter');
    } catch { }

    // Tools configuration
    const tools = {};
    if (Header)
      tools.header = {
        class: Header,
        inlineToolbar: ['bold', 'italic', 'link'],
        config: { placeholder: 'Enter title' },
      };
    if (Paragraph)
      tools.paragraph = {
        class: Paragraph,
        inlineToolbar: true,
        config: { placeholder: 'Enter your story' },
      };

    if (List) tools.list = { class: List, inlineToolbar: true };
    if (Checklist) tools.checklist = { class: Checklist, inlineToolbar: true };
    if (Quote) tools.quote = { class: Quote, inlineToolbar: true };
    if (Table) tools.table = { class: Table, inlineToolbar: true };
    if (Embed) tools.embed = { class: Embed, inlineToolbar: false };
    if (Image)
      tools.image = {
        class: Image,
        inlineToolbar: true,
        config: { caption: true },
      };

    /**
     * Custom Caption Tool for the toolbox
     */
    class CaptionTool {
      constructor({ data, api }) {
        this.api = api;
        this.data = data || { text: '' };
      }

      static get toolbox() {
        return {
          title: 'Caption',
          icon: '<svg width="17" height="15" viewBox="0 0 336 276" xmlns="http://www.w3.org/2000/svg"><path d="M291 150V79c0-19-15-34-34-34H79c-19 0-34 15-34 34v150c0 19 15 34 34 34h178c19 0 34-15 34-34v-35h20v35c0 30-24 54-54 54H79c-30 0-54-24-54-54V79c0-30 24-54 54-54h178c30 0 54 24 54 54v71h-20z"/><circle cx="128" cy="129" r="14"/><path d="M183 155c-9 0-15-6-15-15s6-15 15-15 15 6 15 15-6 15-15 15zm0-20c-3 0-5 2-5 5s2 5 5 5 5-2 5-5-2-5-5-5z"/><path d="M229 273H107c-4 0-8-3-8-8s4-8 8-8h122c4 0 8 3 8 8s-4 8-8 8z"/><path d="M287 188l-50-40c-3-3-7-3-10 0l-20 20-20-20c-3-3-7-3-10 0l-40 40c-2 2-2 5 0 7 2 2 5 2 7 0l33-33 20 20c3 3 7 3 10 0l20-20 43 33c1 1 2 1 3 1 2 0 4-1 5-3 1-2 1-5-1-7z"/></svg>'
        };
      }

      render() {
        this.wrapper = document.createElement('div');
        this.wrapper.contentEditable = 'true';
        this.wrapper.classList.add('ce-caption-block');
        this.wrapper.innerHTML = this.data.text || '';
        this.wrapper.dataset.placeholder = 'Write a caption...';

        this.wrapper.style.cssText = `
          font-style: normal;
          font-size: 0.9em;
          color: #666;
          min-height: 1em;
          outline: none;
        `;

        return this.wrapper;
      }

      save(blockContent) {
        return {
          text: blockContent.innerHTML
        };
      }
    }

    tools.caption = {
      class: CaptionTool,
    };

    if (Marker) tools.marker = { class: Marker, shortcut: 'CMD+SHIFT+M' };
    if (InlineCode)
      tools.inlineCode = { class: InlineCode, shortcut: 'CMD+SHIFT+C' };
    if (LinkTool) tools.linkTool = { class: LinkTool, inlineToolbar: true };
    if (Delimiter) tools.delimiter = Delimiter;

    // Add AI Tool with smaller menus and cleaned responses
    if (!readOnly && aiConfig) {
      tools.aiTool = {
        class: AITool,
        config: { aiConfig },
      };
    }

    // Prepare editor data
    let editorData;
    if (
      initialData &&
      initialData.blocks &&
      Array.isArray(initialData.blocks) &&
      initialData.blocks.length > 0
    ) {
      editorData = initialData;
    } else {
      editorData = {
        blocks: [{ type: 'header', data: { text: '', level: 2 } }],
      };
    }

    // Initialize EditorJS
    const editor = new EditorJS({
      holder: holder || editorRef.current,
      data: editorData,
      readOnly: !!readOnly,
      tools,
      autofocus: !readOnly,
      onChange: async () => {
        if (readOnly) return;
        try {
          const savedData = await editor.save();
          if (onChange) onChange(savedData);
        } catch (err) {
          console.error('EditorJS save error:', err);
        }
      },
    });

    instanceRef.current = editor;

    return () => {
      if (instanceRef.current && instanceRef.current.destroy) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [readOnly, onChange, aiConfig, holder, initialData]);

  // useEffect to handle initial data loading
  // useEffect(() => {
  //   if (instanceRef.current && initialData && initialData.blocks) {
  //     instanceRef.current.render(initialData).catch(console.error);
  //   }
  // }, []);

  return (
    <div className="relative h-full">
      {/* Editor Container: Changed classes to fill height */}
      <div
        ref={editorRef}
        className="h-full"
        id={typeof holder === 'string' ? holder : undefined}
      />{' '}
      <style jsx global>{`
        .codex-editor {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .codex-editor__redactor {
          flex-grow: 1;
          overflow-y: auto !important;
          padding-bottom: 100px !important; /* Add padding to prevent content from hiding behind other elements */
        }
        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>{' '}
    </div>
  );
};

export default EditorWrapper;
