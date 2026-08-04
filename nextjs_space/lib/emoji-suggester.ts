/**
 * Emoji Suggester Utility
 * Suggests appropriate emoji based on article title and category
 */

interface EmojiSuggestion {
  emoji: string;
  reason: string;
}

const categoryEmojis: Record<string, string[]> = {
  'ai': ['🤖', '🧠', '🔮', '✨', '🎯'],
  'cybersecurity': ['🔐', '🛡️', '🔒', '🚨', '⚔️'],
  'cloud': ['☁️', '🌩️', '💾', '🌐', '📡'],
  'web-development': ['🌐', '💻', '⚡', '🚀', '🎨'],
  'mobile': ['📱', '📲', '🔵', '📳', '🎮'],
  'blockchain': ['⛓️', '💎', '🔗', '🪙', '🌟'],
  'data-science': ['📊', '📈', '🔬', '🧮', '📉'],
  'iot': ['🌐', '📡', '🔌', '💡', '🏠'],
  'devops': ['🔧', '⚙️', '🚀', '📦', '🔄'],
  'gaming': ['🎮', '🕹️', '🎯', '🏆', '👾'],
  'hardware': ['⚡', '🔌', '💻', '🖥️', '⚙️'],
  'software': ['💿', '📀', '💾', '🗃️', '📝'],
  'networking': ['🌐', '📡', '🔌', '🛜', '📶'],
  'quantum': ['🔬', '⚛️', '🌌', '✨', '🔮'],
};

const keywordEmojis: Record<string, string> = {
  // Technology
  'ai': '🤖',
  'artificial intelligence': '🤖',
  'machine learning': '🧠',
  'neural network': '🧠',
  'quantum': '⚛️',
  'blockchain': '⛓️',
  'crypto': '💎',
  'cloud': '☁️',
  'server': '🖥️',
  'database': '💾',
  'security': '🔐',
  'hack': '🚨',
  'vulnerability': '🛡️',
  'encrypt': '🔒',
  'password': '🔑',
  
  // Development
  'code': '💻',
  'programming': '💻',
  'software': '💿',
  'app': '📱',
  'mobile': '📱',
  'web': '🌐',
  'api': '🔌',
  'framework': '🏗️',
  'library': '📚',
  
  // Performance
  'fast': '⚡',
  'speed': '⚡',
  'performance': '🚀',
  'optimize': '🎯',
  'efficient': '✨',
  
  // Data
  'data': '📊',
  'analytics': '📈',
  'chart': '📊',
  'graph': '📉',
  'statistics': '🔢',
  
  // Network
  'network': '🌐',
  'internet': '🌐',
  'wifi': '📶',
  'connection': '🔌',
  '5g': '📡',
  
  // Science
  'research': '🔬',
  'experiment': '🧪',
  'discovery': '🔍',
  'innovation': '💡',
  'breakthrough': '🎉',
  
  // Business
  'money': '💰',
  'profit': '💵',
  'growth': '📈',
  'startup': '🚀',
  'business': '💼',
  
  // Social
  'social': '👥',
  'community': '🌍',
  'share': '📤',
  'collaborate': '🤝',
  
  // Media
  'video': '🎥',
  'audio': '🔊',
  'music': '🎵',
  'image': '🖼️',
  'photo': '📷',
  
  // Gaming
  'game': '🎮',
  'gaming': '🎮',
  'player': '🕹️',
  'esports': '🏆',
  
  // General
  'new': '🆕',
  'update': '🔄',
  'release': '🎉',
  'launch': '🚀',
  'alert': '🚨',
  'warning': '⚠️',
  'error': '❌',
  'success': '✅',
  'info': 'ℹ️',
  'future': '🔮',
  'trend': '📈',
  'breaking': '💥',
  'important': '⭐',
};

/**
 * Suggests an emoji based on article title and category
 */
export function suggestEmoji(title: string, categorySlug?: string): EmojiSuggestion {
  const lowerTitle = title.toLowerCase();
  
  // First, check for keyword matches in title
  for (const [keyword, emoji] of Object.entries(keywordEmojis)) {
    if (lowerTitle.includes(keyword)) {
      return {
        emoji,
        reason: `Contains keyword "${keyword}"`
      };
    }
  }
  
  // Then check category-based emojis
  if (categorySlug && categoryEmojis[categorySlug]) {
    const emojis = categoryEmojis[categorySlug];
    return {
      emoji: emojis[0],
      reason: `Category: ${categorySlug}`
    };
  }
  
  // Default fallback emojis
  const defaultEmojis = ['📰', '📝', '💡', '🔍', '📖'];
  return {
    emoji: defaultEmojis[0],
    reason: 'Default for general content'
  };
}

/**
 * Gets multiple emoji suggestions for the user to choose from
 */
export function getEmojiSuggestions(title: string, categorySlug?: string): string[] {
  const suggestions = new Set<string>();
  const lowerTitle = title.toLowerCase();
  
  // Add keyword-based suggestions
  for (const [keyword, emoji] of Object.entries(keywordEmojis)) {
    if (lowerTitle.includes(keyword)) {
      suggestions.add(emoji);
    }
  }
  
  // Add category-based suggestions
  if (categorySlug && categoryEmojis[categorySlug]) {
    categoryEmojis[categorySlug].forEach((emoji: string) => suggestions.add(emoji));
  }
  
  // Add some defaults if we have less than 5
  const defaults = ['📰', '📝', '💡', '🔍', '📖', '✨', '🎯', '🚀'];
  for (const emoji of defaults) {
    if (suggestions.size >= 8) break;
    suggestions.add(emoji);
  }
  
  return Array.from(suggestions).slice(0, 8);
}

/**
 * Calculates reading time in minutes based on word count
 */
export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return Math.max(1, minutes);
}
