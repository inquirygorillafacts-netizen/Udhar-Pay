'use client';

/**
 * @fileOverview Manages the AI assistant's conversation memory in localStorage.
 * This ensures that the conversation context is maintained across sessions and
 * between different AI interfaces (voice and text) without using backend storage.
 */

const MEMORY_KEY = 'ai-assistant-history';
const MAX_HISTORY_LENGTH = 20; // Keeps the last 10 pairs of user/AI messages

export interface ChatMessage {
  sender: 'user' | 'ai';
  text: string;
}

/**
 * Retrieves the current conversation history from localStorage.
 * @returns {ChatMessage[]} An array of chat messages.
 */
export function getHistory(): ChatMessage[] {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const historyJson = localStorage.getItem(MEMORY_KEY);
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error("Failed to retrieve AI history from localStorage:", error);
    return [];
  }
}

/**
 * Adds a new message to the conversation history and saves it to localStorage.
 * It also handles pruning the history to stay within the defined limit.
 * @param {ChatMessage} message - The message object to add.
 */
export function addMessage(message: ChatMessage) {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const history = getHistory();
    history.push(message);

    // Prune the history if it exceeds the max length
    if (history.length > MAX_HISTORY_LENGTH) {
      history.splice(0, history.length - MAX_HISTORY_LENGTH);
    }

    localStorage.setItem(MEMORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error("Failed to save AI message to localStorage:", error);
  }
}

/**
 * Clears the entire conversation history from localStorage.
 */
export function clearHistory() {
   if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.removeItem(MEMORY_KEY);
  } catch (error) {
     console.error("Failed to clear AI history from localStorage:", error);
  }
}