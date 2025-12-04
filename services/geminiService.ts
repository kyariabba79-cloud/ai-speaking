import { GoogleGenAI, Modality } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please set REACT_APP_GEMINI_API_KEY.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to decode base64 to Uint8Array
const decodeBase64 = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const writeString = (view: DataView, offset: number, string: string) => {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
};

// Helper to add WAV header to raw PCM data
const addWavHeader = (pcmData: Uint8Array, sampleRate: number, numChannels: number): ArrayBuffer => {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  
  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true); // ChunkSize
  writeString(view, 8, 'WAVE');
  
  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, sampleRate * numChannels * 2, true); // ByteRate
  view.setUint16(32, numChannels * 2, true); // BlockAlign
  view.setUint16(34, 16, true); // BitsPerSample
  
  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true); // Subchunk2Size
  
  // Concatenate header and data
  const wavBuffer = new Uint8Array(header.byteLength + pcmData.length);
  wavBuffer.set(new Uint8Array(header), 0);
  wavBuffer.set(pcmData, header.byteLength);
  
  return wavBuffer.buffer;
};

export const generateSpeech = async (
  text: string,
  voiceName: string
): Promise<ArrayBuffer> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data returned from Gemini.");
    }

    const pcmData = decodeBase64(base64Audio);
    // Gemini 2.5 Flash TTS typically returns 24kHz mono PCM
    return addWavHeader(pcmData, 24000, 1);
  } catch (error) {
    console.error("TTS Generation Error:", error);
    throw error;
  }
};

export const analyzeVoiceSample = async (file: File): Promise<string> => {
  const ai = getClient();
  
  // Convert file to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:audio/mp3;base64, prefix
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
  });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Use flash for fast analysis
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: file.type,
              data: base64Data,
            },
          },
          {
            text: "Analyze this voice sample. Describe the gender, tone (e.g., cheerful, serious), pitch, and suggested speaking style in one short sentence.",
          },
        ],
      },
    });

    return response.text || "Voice analysis failed.";
  } catch (error) {
    console.error("Voice Analysis Error:", error);
    return "Could not analyze voice sample.";
  }
};