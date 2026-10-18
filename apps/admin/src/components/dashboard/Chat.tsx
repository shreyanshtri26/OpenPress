import React, { useState, useRef, useEffect } from 'react';
import { Send, Copy, Check, Pencil, X, ArrowLeft } from 'lucide-react';
import CustomButton from '../common/CustomButton';
import BackToDashboardButton from '../common/BackToDashboardButton';
import env from '@/utils/env';
import apiFetch from '../../utils/api';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  isEdited?: boolean;
}
interface ChatProps {
  onBack: () => void;
  initialQuery?: string | null;
}

const Chat = ({ onBack, initialQuery }: ChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const hasSentInitial = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (editTextareaRef.current) {
      editTextareaRef.current.style.height = 'auto';
      editTextareaRef.current.style.height = `${editTextareaRef.current.scrollHeight}px`;
    }
  }, [editText]);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  const handleStartEdit = (messageId: string, currentContent: string) => {
    setEditingMessageId(messageId);
    setEditText(currentContent);
    setHoveredMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditText('');
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!editText.trim()) return;

    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, content: editText.trim(), isEdited: true }
          : msg
      )
    );

    const editedIndex = messages.findIndex((msg) => msg.id === messageId);
    setMessages((prev) => prev.slice(0, editedIndex + 1));

    setEditingMessageId(null);
    setEditText('');
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, aiMessage]);

    await getStreamedResponse(editText.trim(), (chunk) => {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: msg.content + chunk }
            : msg
        )
      );
    });
  };

  async function getStreamedResponse(query: string, onChunk?: (chunk: string) => void) {
    const response = await apiFetch(
      `${env.aiApi}/stream_response`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, sessionId }),
      }
    );

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    let accumulatedText = '';
    let sessionReceived = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);

      if (!sessionReceived && chunk.includes('SESSION:')) {
        const lines = chunk.split('\n');
        const sessionLine = lines.find((l) => l.startsWith('SESSION:'));
        if (sessionLine) {
          const newSessionId = sessionLine.replace('SESSION:', '').trim();
          setSessionId(newSessionId);
          sessionReceived = true;

          const remainingContent = lines
            .filter((l) => !l.startsWith('SESSION:'))
            .join('\n');

          if (remainingContent) {
            accumulatedText += remainingContent;
            onChunk?.(remainingContent);
          }
          continue;
        }
      }

      accumulatedText += chunk;
      onChunk?.(chunk);
    }
  }

  const sendMessage = async (text: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      content: text,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: '',
      role: 'assistant',
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMessage]);

    await getStreamedResponse(text, (chunk) => {
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: msg.content + chunk }
            : msg
        )
      );
    });
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    const userInput = input.trim();
    setInput('');
    await sendMessage(userInput);
  };

  useEffect(() => {
    if (initialQuery && !hasSentInitial.current) {
      hasSentInitial.current = true;
      sendMessage(initialQuery);
    }
  }, [initialQuery]);

  return (
    <>
      <style>{`
        .chat-typing-indicator .dot {
          display: inline-block;
          width: 8px;
          height: 8px;
          background-color: #000;
          border-radius: 50%;
          animation: pulse 1.2s infinite ease-in-out;
        }

        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }
      `}</style>

      <div className="flex flex-col h-screen bg-white text-gray-900">
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 border-b border-gray-200 bg-white/95 backdrop-blur px-4">
          <BackToDashboardButton onClick={onBack} />
          <h1 className="text-lg font-semibold">OpenPress</h1>
          <div className="w-6" />
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-12 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
              >
                <div
                  className="relative group max-w-[85%] pb-10"
                  onMouseEnter={() =>
                    !editingMessageId && setHoveredMessageId(message.id)
                  }
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {editingMessageId === message.id ? (
                    <div className="w-full">
                      <textarea
                        ref={editTextareaRef}
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSaveEdit(message.id);
                          }
                        }}
                        className="w-full px-3 py-2 text-gray-900 border border-black text-base leading-relaxed resize-none focus:outline-none focus:ring-0"
                        rows={1}
                        autoFocus
                      />
                      <div className="flex gap-2 mt-2">
                        <CustomButton
                          onClick={() => handleSaveEdit(message.id)}
                          disabled={!editText.trim()}
                          variant="white"
                        >
                          Send
                        </CustomButton>
                        <CustomButton
                          onClick={handleCancelEdit}
                          variant="white"
                        >
                          Cancel
                        </CustomButton>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div
                        className={`px-3 py-2 ${message.role === 'user'
                          ? 'bg-gray-100 text-black rounded'
                          : 'bg-white text-black'
                          }`}
                      >
                        <p className="text-base leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                        {message.isEdited && (
                          <span className="text-base opacity-70 mt-1 block">
                            (edited)
                          </span>
                        )}
                      </div>

                      {/* {hoveredMessageId === message.id && (
                        <div className="absolute bottom-0 left-0 flex gap-2">
                          {message.role === 'user' && (
                            <CustomButton
                              onClick={() =>
                                handleStartEdit(message.id, message.content)
                              }
                              aria-label="Edit message"
                            >
                              <span>Edit</span>
                            </CustomButton>
                          )}
                        </div>
                      )} */}
                    </>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="mb-8 flex justify-start">
                <div className="max-w-3xl px-4 py-4">
                  <div className="chat-typing-indicator">
                    <span className="dot"></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        <footer className="sticky bottom-0 border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4">
            <form onSubmit={handleSend} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type here..."
                className="w-full text-gray-900 border border-black pl-5 pr-12 py-3.5 placeholder-gray-500 text-base transition-all focus:outline-none focus:ring-0
"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5"
                aria-label="Send message"
              >
                <img
                  src="/images/send-chat.svg"
                  alt="Send"
                  className="w-4 h-4 min-w-[16px] min-h-[16px] object-contain"
                />
              </button>
            </form>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Chat;
