
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { GreetingDetails, GeneratedCard } from "./types";

export const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

export const generateCardData = async (details: GreetingDetails): Promise<GeneratedCard> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Generate 3 Personalized Message Options in JSON
  const textPrompt = `Generate 3 distinct, creative, and heartfelt greeting card message options for:
    Recipient: ${details.recipientName}
    Sender: ${details.senderName}
    Relationship: ${details.relationship}
    Occasion: ${details.occasion}
    Date: ${details.date}
    Context: ${details.additionalDetails}
    
    The messages should vary in tone: one Poetic, one Modern & Bright, one Warm & Deeply Personal.`;

  const textResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: textPrompt,
    config: {
      systemInstruction: "You are a world-class creative writer. Return a JSON array of 3 strings named 'options'.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        },
        required: ["options"]
      }
    }
  });

  let messages: string[] = ["Wishing you a wonderful day!"];
  try {
    const json = JSON.parse(textResponse.text || "{}");
    if (Array.isArray(json.options)) messages = json.options;
  } catch (e) {
    console.error("Failed to parse options", e);
  }

  // 2. Generate Image - Enhanced to use user photo as subject
  let imageUrl = "";
  const base64Data = details.photoBase64 ? (details.photoBase64.split(',')[1] || details.photoBase64) : null;
  const mimeType = details.photoBase64 ? (details.photoBase64.match(/data:(.*?);/)?.[1] || 'image/jpeg') : 'image/jpeg';

  const imagePrompt = details.photoBase64
  ? `Create a premium, high-vibrancy portrait for a ${details.occasion}.
     SUBJECT: Use the provided photo as the absolute identity reference.
     IDENTITY LOCK: Face, skin tone, and expression must match exactly. 
     ENVIRONMENT: Reimagine them in a stunning, cinematic ${details.occasion} setting.
     STYLE: Professional editorial photography, lush lighting, rose and gold palette. No text.`
  : `Design a premium, high-vibrancy background for a ${details.occasion} greeting.
     STYLE: Cinematic, abstract or symbolic elements with rose, gold, and warm highlights. No text.`;     

  const imageParts: any[] = [{ text: imagePrompt }];
  if (base64Data) {
    imageParts.unshift({
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    });
  }

  const imageResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: imageParts },
    config: {
        imageConfig: { aspectRatio: "4:3" }
    }
  });

  for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      imageUrl = `data:image/png;base64,${part.inlineData.data}`;
      break;
    }
  }

  // 3. Optional Video - Enhanced to use user photo as starting image
  let videoUrl = undefined;
  if (details.includeVideo) {
    const videoConfig: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: `A cinematic 5-second video of the person in the image. High-quality animation where the subject in the ${details.occasion} scene comes to life with graceful, fluid motion and magical lighting transitions.`,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    };

    if (base64Data) {
        videoConfig.image = {
            imageBytes: base64Data,
            mimeType: mimeType
        };
    }

    let operation = await ai.models.generateVideos(videoConfig);
    
    // Increased polling for Veo (up to 4 minutes)
    let attempts = 0;
    while (!operation.done && attempts < 25) {
        await new Promise(resolve => setTimeout(resolve, 10000)); // 10s wait
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
    }
    
    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        videoUrl = `${operation.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}`;
    } else if (!operation.done) {
        throw new Error("Cinematic rendering is taking longer than usual. Please check back in a moment or try again.");
    }
  }

  return { messages, imageUrl, videoUrl };
};

export const generateAudioForMessage = async (message: string): Promise<string | undefined> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say warmly and with emotional depth: ${message.substring(0, 500)}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
      }
    }
  });
  return ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};
