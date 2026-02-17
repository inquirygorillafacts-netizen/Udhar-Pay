export type ChatMessage = {
  role: string;
  content: string;
};

export function getHistory(): ChatMessage[] {
  return [];
}

export function addMessage(_msg: ChatMessage) {
  return true;
}
