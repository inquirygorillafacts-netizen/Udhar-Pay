'use client';

/**
 * @fileOverview Manages the AI assistant's conversation memory in-memory.
 * This ensures that the conversation context is maintained within a single session
 * on the AI assistant page. The history resets when the user leaves the page.
 */

const MAX_HISTORY_LENGTH = 20; // Keeps the last 10 pairs of user/AI messages

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

// Use an in-memory array instead of localStorage.
let conversationHistory: ChatMessage[] = [];

/**
 * Retrieves the current conversation history from memory.
 * @returns {ChatMessage[]} An array of chat messages.
 */
export function getHistory(): ChatMessage[] {
  return conversationHistory;
}

/**
 * Adds a new message to the in-memory conversation history.
 * It also handles pruning the history to stay within the defined limit.
 * @param {ChatMessage} message - The message object to add.
 */
export function addMessage(message: ChatMessage) {
  conversationHistory.push(message);

  // Prune the history if it exceeds the max length
  if (conversationHistory.length > MAX_HISTORY_LENGTH) {
    conversationHistory = conversationHistory.slice(conversationHistory.length - MAX_HISTORY_LENGTH);
  }
}

/**
 * Clears the entire in-memory conversation history.
 */
export function clearHistory() {
  conversationHistory = [];
}
