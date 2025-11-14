import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const getDailyQuestion = async (): Promise<string> => { 
    const prompt = "Provide a thought-provoking question for daily reflection.";
    try {
        const completion = await openai.chat.completions.create({
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
        });
        return completion.choices[0].message.content ?? "";
    } catch (error) {
        console.error("Error generating response:", error);
        throw new Error("Failed to generate response");
    }
};