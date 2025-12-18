
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
  // Fresh instance for text and image
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // 1. Generate 3 Personalized Message Options
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
    const responseText = textResponse.text;
    if (responseText) {
      const json = JSON.parse(responseText);
      if (Array.isArray(json.options)) messages = json.options;
    }
  } catch (e) {
    console.error("Failed to parse options", e);
  }

  // 2. Generate Fallback/Primary Image
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

  // 3. Optional Video - Enhanced handling for Veo specific behaviors
  let videoUrl: string | undefined = undefined;

  if (details.includeVideo) {
    // Identity-preserving motion prompt
    const videoPrompt = details.photoBase64
        ? `Cinematic motion bringing the person in the provided image to life for a ${details.occasion}. Subtle, graceful movements only. Maintain facial structure exactly. Soft focus background, warm cinematic lighting.`
        : `A breathtaking cinematic scene for a ${details.occasion}. Soft bokeh, rose and gold atmosphere, elegant slow-motion movement.`;

    const videoRequest: any = {
        model: 'veo-3.1-fast-generate-preview',
        prompt: videoPrompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    };

    if (base64Data) {
        videoRequest.image = {
            imageBytes: base64Data,
            mimeType: mimeType
        };
    }

    try {
        // ALWAYS create a fresh instance before the generation call
        const videoAiStart = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let operation = await videoAiStart.models.generateVideos(videoRequest);
        
        let attempts = 0;
        // Increase limit slightly for complex image-to-video processing
        while (!operation.done && attempts < 40) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            // Fresh instance for polling to ensure no stale token issues
            const videoAiPoll = new GoogleGenAI({ apiKey: process.env.API_KEY });
            operation = await videoAiPoll.operations.getVideosOperation({ operation: operation }); 
            
            if (operation.error) {
              throw new Error(`Video generation error: ${operation.error.message || 'Operation failed'}`);
            }
            attempts++;
        }
        
        if (operation.done) {
            const hasVideos = operation.response?.generatedVideos && operation.response.generatedVideos.length > 0;
            const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;

            if (videoUri) {
                videoUrl = `${videoUri}&key=${process.env.API_KEY}`;
            } else if (hasVideos && !videoUri) {
                throw new Error("Video was generated but the retrieval link is missing. This may be a temporary network issue.");
            } else {
                // This is the most common cause for empty results in Veo (Safety Filtering)
                throw new Error("The cinematic video was blocked by safety filters. This often happens if a face or specific detail is flagged. Try using a different photo or changing the occasion description.");
            }
        } else {
            throw new Error("Video generation is taking longer than expected. Please try again with a different image or simpler details.");
        }
    } catch (videoError: any) {
        console.error("Veo Engine Failure:", videoError);
        // Explicitly re-throw to ensure App.tsx handles the error instead of silently falling back
        throw videoError;
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
