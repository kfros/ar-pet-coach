'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'AIza_placeholder_key');

export async function analyzeBark(formData) {
    try {
        const audioFile = formData.get('audio');
        const intensity = parseFloat(formData.get('intensity') || '0');
        const barkCount = parseInt(formData.get('barkCount') || '0');
        // Intensity and BarkCount are useful context for the LLM!

        console.log(`Analyzing Audio via Gemini Flash: ${audioFile.size} bytes`);

        // Check for key
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY.includes('placeholder')) {
            throw new Error("Missing GEMINI_API_KEY in .env.local");
        }

        // Convert Blob to Base64
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64Audio = buffer.toString('base64');
        const mimeType = audioFile.type || 'audio/webm'; // Default webm from MediaRecorder

        // Model: gemini-2.5-flash
        // Available per user screenshot: gemini-2.5-flash-lite, gemini-2.5-flash, gemini-3-flash
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        Analyze this dog bark audio for separation anxiety.
        
        Context Telemetry:
        - Max Intensity (0-1): ${intensity}
        - Bark Count (approx): ${barkCount}

        Goal: Determine the Anxiety Level (1-10) and provide a nature of barking (alert, panic, playful, angry, etc.) short Tip.
        
        Scoring Guide:
        - 1-3: Normal behavior, playful barking, or silence.
        - 4-6: Mild stress, alert barking, occasional whining.
        - 7-8: High anxiety, repetitive barking, howling, sustained whining.
        - 9-10: Severe panic, frantic barking/panting, distress.

        Return ONLY valid JSON in this format:
        {
            "score": number, 
            "tip": "string advice (max 15 words)",
            "details": "string reasoning"
        }
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Audio
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // Clean markdown JSON if present
        const jsonStr = text.replace(/```json|```/g, '').trim();
        const data = JSON.parse(jsonStr);

        return {
            score: data.score || 0,
            tip: data.tip || "Analysis complete.",
            details: data.details || "Gemini Flash analysis."
        };

    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        return {
            score: 0,
            tip: "Analysis failed.",
            details: `Error: ${error.message}. Ensure GEMINI_API_KEY is valid.`
        };
    }
}
