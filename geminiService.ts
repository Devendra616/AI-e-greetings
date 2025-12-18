
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

/*   const imagePrompt = details.photoBase64 
    ? `A high-vibrancy, artistic ${details.occasion} portrait of the EXACT person in the provided photo. 
       IDENTITY PRESERVATION: The face and likeness MUST be 100% identical to the reference image. 
       ENVIRONMENT: Reimagine them in a stunning, lush, cinematic world with symbolic lighting and an ethereal atmosphere. 
       STYLE: Artisanal, professional editorial photography. Deep rose, gold, and warm amber tones. No text.`
    : `A stunning, high-vibrancy, artistic background for a ${details.occasion} greeting card. 
       Theme: ${details.relationship}. 
       Style: Lush, cinematic, abstract or symbolic. Use bold colors like rose, gold, and deep teal. No text.`;

 */

  const imagePrompt = details.photoBase64
  ? `
Create a premium, high-vibrancy portrait for a ${details.occasion}.
SUBJECT: Use the provided photo as the sole identity reference.
IDENTITY LOCK: Facial features, skin tone, age, and expression must match exactly. Do not stylize or alter the face.
POSE & FRAMING: Natural, flattering, editorial-style composition.
ENVIRONMENT: Reimagine the subject in a cinematic, visually rich setting inspired by the occasion.
MOOD & LIGHTING: Soft dramatic lighting, warm glow, depth, and atmosphere.
COLOR PALETTE: Rose, gold, warm amber, and complementary tones.
STYLE: Professional editorial photography, ultra-realistic, artistic enhancement only.
QUALITY: Sharp focus, high detail, premium finish.
RESTRICTIONS: No text, no logos, no distortions, no extra faces.
`
  : `
Design a premium, high-vibrancy background for a ${details.occasion} greeting.
THEME: Emotionally aligned with ${details.relationship}.
COMPOSITION: Balanced, visually engaging, suitable for cards or social media.
STYLE: Cinematic, abstract or symbolic elements.
COLOR PALETTE: Rose, gold, deep teal, and warm highlights.
MOOD: Celebratory, elegant, and timeless.
QUALITY: High detail, smooth gradients, artistic depth.
RESTRICTIONS: no people, no logos.
`;     

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
        prompt: `Cinematic 5-second fluid motion of the person in the photo. Gently animate the subject in the ${details.occasion} scene, creating a magical, high-quality aesthetic transition with slow-motion grace.`,
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
    
    let attempts = 0;
    while (!operation.done && attempts < 25) {
        await new Promise(resolve => setTimeout(resolve, 8000));
        operation = await ai.operations.getVideosOperation({ operation });
        attempts++;
    }
    
    if (operation.response?.generatedVideos?.[0]?.video?.uri) {
        videoUrl = `${operation.response.generatedVideos[0].video.uri}&key=${process.env.API_KEY}`;
    } else if (!operation.done) {
        throw new Error("Video generation timed out. Your request is still processing on our artistic servers.");
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
