import { Configuration, OpenAIApi } from 'openai'

// OpenAI API:

async function simpleOpenAIRequest(prompt: string, config: any) {

    const configuration = new Configuration({
        apiKey: process.env.OPENAI_API_KEY,
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
    return completion.data.choices[0]!.message!.content;
}

export { simpleOpenAIRequest }
