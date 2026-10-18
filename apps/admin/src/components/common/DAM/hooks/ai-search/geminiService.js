// src/components/common/DAM/hooks/ai-search/geminiService.js

/**
 * Service for interacting with Gemini
 */
import { getSemanticSearchPrompt } from './promptTemplates';
import env from '@/utils/env';
import apiFetch from '../../../../../utils/api';


const AI_SEARCH_URL = `${env.aiApi}/stream_response`;

/**
 * Call Gemini with streaming response
 * @param {string} query - Search query
 * @param {string|null} sessionId - Session ID for context
 * @returns {Promise<{response: string, sessionId: string}>}
 */
export const getAiSearchResults = async (query, sessionId = null) => {
    const aiInstructions = getSemanticSearchPrompt(query);


    const prompt = `${aiInstructions}\n\n Here is the user query: ${query}`;
    try {
        const response = await apiFetch(AI_SEARCH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, prompt, sessionId }),
        });

        if (!response.ok) {
            throw new Error('AI search failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        let fullResponse = '';
        let newSessionId = null;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);

            if (chunk.includes('SESSION:')) {
                const lines = chunk.split('\n');
                const sessionLine = lines.find((l) => l.startsWith('SESSION:'));
                if (sessionLine) {
                    newSessionId = sessionLine.replace('SESSION:', '').trim();
                    const remainingContent = lines
                        .filter((l) => !l.startsWith('SESSION:'))
                        .join('\n');
                    fullResponse += remainingContent;
                    continue;
                }
            }

            fullResponse += chunk;
        }

        return {
            response: fullResponse,
            sessionId: newSessionId,
        };
    } catch (error) {
        console.error('AI search error:', error);
        throw error;
    }
};
