import OpenAI from 'openai';

/**
 * AI Client Configuration
 * Configured for Trend Micro AI Endpoint
 */

let aiClient: OpenAI | null = null;

/**
 * Initialize AI client with environment variables
 */
export function getAIClient(): OpenAI {
  if (!aiClient) {
    const baseURL = process.env.OPENAI_BASE_URL;
    const apiKey = process.env.OPENAI_API_KEY;

    if (!baseURL || !apiKey) {
      throw new Error('Missing AI configuration. Check OPENAI_BASE_URL and OPENAI_API_KEY in .env');
    }

    aiClient = new OpenAI({
      baseURL,
      apiKey,
      defaultHeaders: {
        'Content-Type': 'application/json',
      },
    });
  }

  return aiClient;
}

/**
 * Get configured model name
 */
export function getModelName(): string {
  return process.env.OPENAI_MODEL || 'claude-4-sonnet';
}

/**
 * Stream completion from AI
 */
export async function streamCompletion(
  systemPrompt: string,
  userPrompt: string,
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    const client = getAIClient();
    const model = getModelName();

    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }

    onComplete?.();
  } catch (error) {
    onError?.(error as Error);
    throw error;
  }
}

/**
 * Get non-streaming completion from AI
 */
export async function getCompletion(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const client = getAIClient();
  const model = getModelName();

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    stream: false,
    max_tokens: 2000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Conversation history for chat interface
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Get completion with conversation history
 */
export async function getChatCompletion(
  messages: ChatMessage[]
): Promise<string> {
  const client = getAIClient();
  const model = getModelName();

  const response = await client.chat.completions.create({
    model,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
    stream: false,
    max_tokens: 2000,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Stream chat completion
 */
export async function streamChatCompletion(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onComplete?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    const client = getAIClient();
    const model = getModelName();

    const stream = await client.chat.completions.create({
      model,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      stream: true,
      max_tokens: 2000,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        onChunk(content);
      }
    }

    onComplete?.();
  } catch (error) {
    onError?.(error as Error);
    throw error;
  }
}
