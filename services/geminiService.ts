
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, AiInsight, Budget, InvestmentGoal, PaymentMethod } from "../types";


const getAiClient = () => {
  if (!process.env.API_KEY) {
    console.warn("API Key for Gemini is missing. some features will be disabled.");
    return null;
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};


export interface GeminiParsingResult {
  status: 'success' | 'need_clarification';
  transactions?: Omit<Transaction, 'id'>[];
  clarificationMessage?: string;
}

export const parseTransactionFromText = async (
  input: string,
  existingGoals: InvestmentGoal[] = [],
  paymentMethods: PaymentMethod[] = []
): Promise<GeminiParsingResult> => {
  if (!process.env.API_KEY) {
    console.error("API Key missing");
    return { status: 'success', transactions: [] };
  }

  const now = new Date();
  const currentDateString = now.toLocaleDateString('pt-BR');

  const goalsContext = existingGoals.length > 0
    ? `INVESTIMENTOS: [${existingGoals.map(g => g.name).join(', ')}]`
    : "";

  const paymentsContext = paymentMethods.length > 0
    ? `MEIOS DE PAGAMENTO DISPONÍVEIS: [${paymentMethods.map(p => p.name).join(', ')}]`
    : "";

  const systemInstruction = `
    Você é um assistente financeiro de elite.
    Hoje: ${currentDateString}. 
    
    ${goalsContext}
    ${paymentsContext}

    REGRAS DE INVESTIMENTO:
    - Se for aporte em investimento conhecido, use type: 'investment', category: 'Investimentos' e description: 'Aporte: [Nome Exato]'.

    REGRAS DE MEIOS DE PAGAMENTO:
    - Se o usuário mencionar um cartão específico (ex: "passei no Nubank"), use exatamente o nome que está na lista acima.
    - Se não souber o meio, use 'Pix' ou 'Cartão de Crédito' (como fallback genérico se não houver lista).

    REGRA DE CLARIFICAÇÃO:
    - Se faltar valor ou categoria óbvia, retorne status 'need_clarification'.

    REGRAS GERAIS:
    - Datas: ISO YYYY-MM-DD.
    - Categorias: Alimentação, Moradia, Transporte, Lazer, Saúde, Investimentos, Outros.
  `;

  const schema = {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, enum: ["success", "need_clarification"] },
      clarificationMessage: { type: Type.STRING, nullable: true },
      transactions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            type: { type: Type.STRING, enum: ["expense", "income", "investment"] },
            category: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            date: { type: Type.STRING },
            isReimbursable: { type: Type.BOOLEAN, nullable: true },
            debtorName: { type: Type.STRING, nullable: true }
          },
          required: ["description", "amount", "type", "category", "paymentMethod", "date"]
        },
        nullable: true
      }
    },
    required: ["status"]
  };

  try {
    const ai = getAiClient();
    if (!ai) return { status: 'success', transactions: [] };
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: input,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) return { status: 'success', transactions: [] };
    return JSON.parse(text);
  } catch (error) {
    console.error("Error parsing with Gemini:", error);
    throw error;
  }
};

export const getFinancialInsights = async (transactions: Transaction[], budget: Budget): Promise<AiInsight | null> => {
  if (!process.env.API_KEY) return null;
  if (transactions.length === 0) return null;
  const prompt = `Analise financeiramente os dados: Budget ${JSON.stringify(budget)}, Transações recentes: ${JSON.stringify(transactions.slice(0, 30))}. Retorne JSON com prediction, remainingBudgetAnalysis, anomalies (array), advice.`;
  try {
    const ai = getAiClient();
    if (!ai) return null;
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "null");
  } catch (error) {
    return null;
  }
};
