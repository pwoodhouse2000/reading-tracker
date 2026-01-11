// Media types with labels and icons
export const MEDIA_TYPES = [
  { value: 'PAPER', label: 'Paper Book', emoji: '📖' },
  { value: 'AUDIOBOOK', label: 'Audiobook', emoji: '🎧' },
  { value: 'EBOOK', label: 'E-book', emoji: '📱' },
] as const;

// Sub-categories with emojis
export const SUB_CATEGORIES = {
  FICTION: [
    { value: 'Science Fiction', emoji: '🚀' },
    { value: 'Fantasy', emoji: '🧙' },
    { value: 'Mystery', emoji: '🔍' },
    { value: 'Thriller', emoji: '🔪' },
    { value: 'Romance', emoji: '💕' },
    { value: 'Historical Fiction', emoji: '🏛️' },
    { value: 'Literary Fiction', emoji: '📚' },
    { value: 'Horror', emoji: '👻' },
    { value: 'Adventure', emoji: '🗺️' },
    { value: 'Other', emoji: '📖' },
  ],
  NON_FICTION: [
    { value: 'Biography', emoji: '👤' },
    { value: 'Memoir', emoji: '✍️' },
    { value: 'History', emoji: '🦕' },
    { value: 'Science', emoji: '🔬' },
    { value: 'Philosophy', emoji: '🤔' },
    { value: 'Psychology', emoji: '🧠' },
    { value: 'Self-Help', emoji: '💪' },
    { value: 'Health', emoji: '🏥' },
    { value: 'Business', emoji: '💼' },
    { value: 'Technology', emoji: '💻' },
    { value: 'Travel', emoji: '✈️' },
    { value: 'Food & Cooking', emoji: '🍳' },
    { value: 'Art & Design', emoji: '🎨' },
    { value: 'Politics', emoji: '⚖️' },
    { value: 'Religion & Spirituality', emoji: '🕉️' },
    { value: 'Other', emoji: '📚' },
  ],
} as const;

// Get all sub-categories as a flat list
export function getAllSubCategories() {
  return [
    ...SUB_CATEGORIES.FICTION,
    ...SUB_CATEGORIES.NON_FICTION,
  ];
}

// Get sub-categories for a specific category
export function getSubCategoriesForCategory(category: 'FICTION' | 'NON_FICTION') {
  return SUB_CATEGORIES[category] || [];
}

// Helper to parse media types from comma-separated string
export function parseMediaTypes(mediaTypesString: string): string[] {
  if (!mediaTypesString) return ['PAPER'];
  return mediaTypesString.split(',').filter(Boolean);
}

// Helper to serialize media types to comma-separated string
export function serializeMediaTypes(mediaTypes: string[]): string {
  if (!mediaTypes || mediaTypes.length === 0) return 'PAPER';
  return mediaTypes.join(',');
}
