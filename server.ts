import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Body parser for JSON with large base64 camera image support (up to 25mb)
app.use(express.json({ limit: "25mb" }));
app.use(express.urlencoded({ extended: true, limit: "25mb" }));

// Lazy initialization of Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint: OCR de Hodômetro / Conta-Giro por Câmera do Celular com Gemini Vision
app.post("/api/ocr-odometer", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg", turnstileInfo } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ 
        success: false, 
        error: "Imagem não fornecida. Envie a foto capturada pela câmera do celular." 
      });
    }

    // Clean base64 string if data URL prefix exists
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const ai = getGeminiClient();

    if (!ai) {
      // Fallback gracioso se não houver chave do Gemini configurada
      return res.json({
        success: true,
        odometerNumber: null,
        confidence: "manual_review",
        rawText: "",
        notes: "Chave GEMINI_API_KEY não configurada no servidor. Por favor, confirme o número manualmente na imagem capturada.",
        fallbackMode: true
      });
    }

    const prompt = `OCR ultra-rápido de precisão para hodômetro/contador mecânico da ${turnstileInfo || 'Catraca do Refeitório'}.
Identifique a sequência principal de dígitos do contador/mostrador de giros (exemplo: 14920, 028450).
Descarte reflexos, marcas de fabricante e números de série.
Retorne ESTRITAMENTE em JSON:
{"odometerNumber": 14920, "rawText": "014920", "confidence": "high", "notes": "OK"}
Se os dígitos não forem visíveis:
{"odometerNumber": null, "rawText": "", "confidence": "low", "notes": "Ilegível"}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: mimeType || "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        temperature: 0.0,
        maxOutputTokens: 90
      }
    });

    const responseText = response.text || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(responseText);
    } catch {
      // Extrair números do texto se não for JSON puro
      const match = responseText.match(/\d{3,8}/);
      parsedResult = {
        odometerNumber: match ? parseInt(match[0], 10) : null,
        rawText: match ? match[0] : "",
        confidence: match ? "medium" : "low",
        notes: "Extraído do resultado da análise visual."
      };
    }

    return res.json({
      success: true,
      odometerNumber: typeof parsedResult.odometerNumber === 'number' ? parsedResult.odometerNumber : (parsedResult.rawText ? parseInt(parsedResult.rawText.replace(/\D/g, ''), 10) : null),
      rawText: parsedResult.rawText || (parsedResult.odometerNumber !== null ? String(parsedResult.odometerNumber) : ""),
      confidence: parsedResult.confidence || "medium",
      notes: parsedResult.notes || "Leitura do hodômetro processada com sucesso via câmera do celular."
    });

  } catch (error: any) {
    console.error("Erro no OCR do hodômetro com Gemini:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Falha ao processar a imagem do hodômetro",
      odometerNumber: null
    });
  }
});

// Inicia o servidor com Vite Middleware em desenvolvimento ou Static em produção
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`GiroFlow Server rodando na porta ${PORT}`);
  });
}

startServer();
