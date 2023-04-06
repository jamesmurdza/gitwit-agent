import { Configuration, OpenAIApi } from 'openai'

// OpenAI API:

export type Completion = { text: string; id: string; model: string };

async function simpleOpenAIRequest(prompt: string, config: any): Promise<Completion> {

  const baseOptions = process.env.OPENAI_CACHE_ENABLED ? {
    headers: {
      "Helicone-Cache-Enabled": "true",
      "Helicone-Cache-Bucket-Max-Size": "1"
    },
  } : {};

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    basePath: process.env.OPENAI_BASE_URL,
    baseOptions: baseOptions,
  })
  const openai = new OpenAIApi(configuration)

  let completion = await openai.createChatCompletion({
    ...config,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  })

  return {
    text: completion.data.choices[0]!.message!.content,
    id: completion.data.id,
    model: completion.data.model
  };
}

export { simpleOpenAIRequest }
