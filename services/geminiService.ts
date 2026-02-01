import { GoogleGenAI } from "@google/genai";
import { CellData } from "../types";

export const getSmartHint = async (board: CellData[][]): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key missing");

    const ai = new GoogleGenAI({ apiKey });
    
    // Construct a simple string representation
    let boardStr = "Current Board State (0 is empty):\n";
    board.forEach(row => {
      boardStr += row.map(c => c.value || 0).join(" ") + "\n";
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      config: {
        systemInstruction: "You are a Sudoku Grandmaster. Analyze the board and identify ONE logical next step. Explain the logic simply (e.g., 'In the top-left block...'). Keep it brief (max 2 sentences). Do not give the full solution.",
      },
      contents: {
        parts: [
            { text: boardStr }
        ]
      },
    });

    return response.text || "Try looking at the rows and columns with the most numbers filled in.";
  } catch (error) {
    console.error("Gemini Hint Error:", error);
    return "Could not connect to AI Grandmaster. Try looking for 'Naked Singles'.";
  }
};