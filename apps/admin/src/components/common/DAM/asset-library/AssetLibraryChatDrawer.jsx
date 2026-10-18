import { useState, useRef, useEffect, useContext } from 'react';
import { X, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import PropTypes from 'prop-types';
import env from '@/utils/env';
import apiFetch from '../../../../utils/api';
import { UserContext } from '@/context/UserContext';

const AssetLibraryChatDrawer = ({
  isOpen,
  onClose,
  initialQuery = null,
  onAssetClick,
}) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);


  const messagesEndRef = useRef(null);
  const hasSentInitial = useRef(false);

  const userContext = useContext(UserContext);
  const user = userContext?.user;

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-send initial query
  useEffect(() => {
    if (initialQuery && !hasSentInitial.current && isOpen) {
      hasSentInitial.current = true;
      sendMessage(initialQuery);
    }
  }, [initialQuery, isOpen]);

  // Reset when drawer closes
  useEffect(() => {
    if (!isOpen) {
      hasSentInitial.current = false;
    }
  }, [isOpen]);

  const sendMessage = async (text) => {
    const userMessage = {
      id: Date.now().toString(),
      content: text,
      role: 'user',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all assets from your existing API
      const response = await apiFetch(
        `${env.backendApi}/api/fetchAsset`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(user?.token && { Authorization: `Bearer ${user.token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch assets');
      }

      const data = await response.json();
      const allAssets = data.data || [];

      // Extract keywords from query
      const keywords = extractKeywords(text);

      // Search and score assets
      const matchedAssets = searchAssets(allAssets, keywords);

      // Create AI response message
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        content: matchedAssets.length > 0
          ? `Found ${matchedAssets.length} asset${matchedAssets.length !== 1 ? 's' : ''} matching your search.`
          : 'No assets found matching your search. Try different keywords.',
        role: 'assistant',
        timestamp: new Date(),
        assets: matchedAssets.slice(0, 20), // Show top 20 results
      };

      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('Search error:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to search assets';
      setError(errorMessage);
      toast.error(errorMessage);

      // Add error message to chat
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        content: 'Sorry, I encountered an error while searching. Please try again.',
        role: 'assistant',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to extract keywords
  const extractKeywords = (query) => {
    const words = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2);

    const stopWords = [
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
      'can', 'her', 'was', 'one', 'our', 'out', 'show', 'pics',
      'images', 'photos', 'with', 'wearing', 'from', 'about'
    ];

    return words.filter((word) => !stopWords.includes(word));
  };

  // Helper function to search assets
  const searchAssets = (assets, keywords) => {
    if (keywords.length === 0) return [];

    const scoredAssets = assets
      .map((asset) => ({
        ...asset,
        relevanceScore: calculateRelevance(asset, keywords),
      }))
      .filter((asset) => asset.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);

    // Transform to match expected format
    return scoredAssets.map((asset) => ({
      id: asset.assetId,
      name: asset.fileName,
      url: asset.url,
      thumbnail: asset.previewUrl || asset.url,
      tags: [
        ...(asset.tags?.aiTags || []),
        ...(asset.tags?.customTags || []),
      ],
      summary: asset.summary,
      fileType: asset.type,
      uploadDate: asset.createdAt,
      relevanceScore: asset.relevanceScore,
    }));
  };

  // Helper function to calculate relevance score
  const calculateRelevance = (asset, keywords) => {
    let score = 0;

    keywords.forEach((keyword) => {
      const lowerKeyword = keyword.toLowerCase();

      // Check AI tags (high weight)
      if (asset.tags?.aiTags) {
        asset.tags.aiTags.forEach((tag) => {
          if (tag.toLowerCase().includes(lowerKeyword)) {
            score += 10;
          }
        });
      }

      // Check custom tags (highest weight)
      if (asset.tags?.customTags) {
        asset.tags.customTags.forEach((tag) => {
          if (tag.toLowerCase().includes(lowerKeyword)) {
            score += 15;
          }
        });
      }

      // Check summary (medium weight)
      if (asset.summary && asset.summary.toLowerCase().includes(lowerKeyword)) {
        score += 5;
      }

      // Check filename (low weight)
      if (asset.fileName && asset.fileName.toLowerCase().includes(lowerKeyword)) {
        score += 3;
      }

      // Check searchable content (low weight)
      if (asset.searchableContent && asset.searchableContent.toLowerCase().includes(lowerKeyword)) {
        score += 2;
      }

      // Check Rekognition labels (medium weight)
      if (asset.rekognitionAnalysis?.labels?.labels) {
        asset.rekognitionAnalysis.labels.labels.forEach((label) => {
          if (label.name.toLowerCase().includes(lowerKeyword)) {
            score += 7;
          }
        });
      }

      // Check detected text (low weight)
      if (asset.rekognitionAnalysis?.text?.fullText) {
        if (asset.rekognitionAnalysis.text.fullText.toLowerCase().includes(lowerKeyword)) {
          score += 4;
        }
      }

      // Check celebrities (highest weight for exact matches) - removed: celebrity detection feature deprecated
      // if (asset.celebrities && asset.celebrities.length > 0) {
      //   asset.celebrities.forEach((celeb) => {
      //     if (celeb.toLowerCase().includes(lowerKeyword)) {
      //       score += 20;
      //     }
      //   });
      // }
    });

    return score;
  };


  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userInput = input.trim();
    setInput('');
    sendMessage(userInput);
  };

  const handleAssetCardClick = (asset) => {
    onAssetClick(asset);
    // Optionally close chat drawer after clicking an asset
    // onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 right-0 w-full md:w-[500px] lg:w-[600px] bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between h-14 px-4 border-b border-gray-200 bg-white">
          <button
            onClick={onClose}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-semibold">AI Asset Search</h2>
          <button
            onClick={onClose}
            className="text-gray-600 hover:text-gray-900 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-sm">Ask me to find assets...</p>
              <p className="text-xs mt-2 text-gray-400">
                Example: &quot;show me images of Modi wearing red&quot;
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-6 flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              <div
                className={`max-w-[85%] ${message.role === 'user' ? 'text-right' : 'text-left'
                  }`}
              >
                {/* Message Content */}
                <div
                  className={`inline-block px-4 py-2 rounded-lg ${message.role === 'user'
                    ? 'bg-gray-100 text-black'
                    : 'bg-white text-black'
                    }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                    {message.content}
                  </p>
                </div>

                {/* Asset Results Grid */}
                {message.assets && message.assets.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {message.assets.map((asset) => (
                      <div
                        key={asset.id}
                        onClick={() => handleAssetCardClick(asset)}
                        className="cursor-pointer group relative overflow-hidden rounded border border-gray-200 hover:border-gray-400 transition-all"
                      >
                        <div className="aspect-square relative bg-gray-100">
                          <img
                            src={asset.thumbnail || asset.url}
                            alt={asset.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            onError={(e) => {
                              e.target.src = '/placeholder-image.png';
                            }}
                          />
                        </div>
                        <div className="p-2 bg-white">
                          <p className="text-xs font-medium truncate">
                            {asset.name}
                          </p>
                          {asset.tags && asset.tags.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {asset.tags.slice(0, 2).map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-1.5 py-0.5 bg-gray-100 rounded"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Results Message */}
                {message.role === 'assistant' &&
                  message.assets &&
                  message.assets.length === 0 && (
                    <div className="mt-2 text-xs text-gray-500 italic">
                      No assets found. Try different keywords.
                    </div>
                  )}
              </div>
            </div>
          ))}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="mb-8 flex justify-start">
              <div className="px-4 py-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">Searching...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Footer */}
        <div className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about assets..."
              className="w-full text-gray-900 border border-black pl-4 pr-12 py-3 placeholder-gray-500 text-sm transition-all focus:outline-none focus:ring-0"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 disabled:opacity-40"
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
      </div>
    </>
  );
};

AssetLibraryChatDrawer.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialQuery: PropTypes.string,
  onAssetClick: PropTypes.func.isRequired,
};

export default AssetLibraryChatDrawer;
