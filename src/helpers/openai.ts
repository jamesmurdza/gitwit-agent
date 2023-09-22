import { Configuration, OpenAIApi } from 'openai'

// OpenAI API:

export type Completion = { text: string; id: string; model: string } | { error: string };

async function simpleOpenAIRequest(prompt: string, config: any): Promise<Completion> {

  const baseOptions = {
    headers: {
      "Helicone-Auth": `Bearer ${process.env.HELICONE_API_KEY}`,
      ...(process.env.OPENAI_CACHE_ENABLED && {
        "Helicone-Cache-Enabled": "true",
        "Helicone-Cache-Bucket-Max-Size": "1",
      }),
    },
  };

  const configuration = new Configuration({
    apiKey: process.env.OPENAI_API_KEY,
    basePath: process.env.OPENAI_BASE_URL,
    baseOptions: baseOptions,
  })
  const openai = new OpenAIApi(configuration)

  try {
    const completion = await openai.createChatCompletion({
      ...config,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })
    // When the API returns an error:
    const data: any = completion.data;
    if (data.error) {
      throw new Error(`OpenAI error: (${data.error.type}) ${data.error.message}`)
    }
    return {
      text: completion.data.choices[0]!.message!.content,
      id: completion.data.id,
      model: completion.data.model
    };
  } catch (error: any) {
    // When any other error occurs:
    throw new Error(`Failed to make request. Error message: ${error.message}`);
  }
}

export { simpleOpenAIRequest }
