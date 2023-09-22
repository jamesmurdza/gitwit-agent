import { ChatOpenAI } from "langchain/chat_models/openai";
import { HumanMessage } from "langchain/schema";

// LLM API:

export type Completion = { text: string; id: string; model: string } | { error: string };

async function llmRequest(prompt: string, config: any): Promise<Completion> {

  const baseOptions = {
    headers: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      ...(process.env.OPENAI_CACHE_ENABLED && {
        "Helicone-Cache-Enabled": "true",
        "Helicone-Cache-Bucket-Max-Size": "1",
      }),
    },
  };

  const chat = new ChatOpenAI(
    {
      openAIApiKey: process.env.OPENAI_API_KEY,
      ...config
    },
    {
      basePath: process.env.OPENAI_BASE_URL,
      baseOptions: baseOptions,
    }
  );

  try {
    const result = await chat.generate([
      [new HumanMessage(prompt)]
    ]);

    return {
      text: result.generations[0][0].text,
      id: "", // This is currently unsupported by Langchain.
      model: result.llmOutput?.modelName || ""
    };
  } catch (error: any) {
    // When any other error occurs:
    throw new Error(`Failed to make request. Error message: ${error.message}`);
  }
}

export { llmRequest }
