
export interface GreetingDetails {
  recipientName: string;
  senderName: string;
  relationship: string;
  occasion: string;
  date: string;
  additionalDetails: string;
  photoBase64?: string;
  includeAudio: boolean;
  includeVideo: boolean;
}

export interface GeneratedCard {
  messages: string[]; // Changed from 'message' to an array of options
  selectedMessage?: string;
  imageUrl: string;
  audioBase64?: string;
  videoUrl?: string;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SELECTING = 'SELECTING',
  RESULT = 'RESULT'
}
