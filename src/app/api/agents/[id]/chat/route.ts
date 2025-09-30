import { NextRequest, NextResponse } from 'next/server';
import {
  query,
  type Options,
  type SDKMessage,
} from '@anthropic-ai/claude-code';
import { promises as fs } from 'fs';
import * as path from 'path';

async function loadAgent(agentId: string) {
  const agentPath = path.join(
    process.cwd(),
    'config',
    'agents',
    'instances',
    `${agentId}.json`
  );
  try {
    const content = await fs.readFile(agentPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatRequestBody = {
  messages: ChatMessage[];
  sessionId?: string;
  options?: {
    maxTurns?: number;
    continue?: boolean;
  };
};

const encoder = new TextEncoder();

function sendChunk(
  controller: ReadableStreamDefaultController,
  payload: unknown
) {
  controller.enqueue(encoder.encode(JSON.stringify(payload) + '\n'));
}

async function getLLMConfig() {
  const configPath = path.join(
    process.cwd(),
    'config',
    'settings',
    'llm-providers.json'
  );
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    return config.providers.claude;
  } catch {
    return {
      name: 'Anthropic Claude',
      models: ['claude-sonnet-4-20250514', 'claude-haiku-20250514'],
      defaultModel: 'claude-sonnet-4-20250514',
    };
  }
}

async function getAppConfig() {
  const configPath = path.join(
    process.cwd(),
    'config',
    'settings',
    'app-config.json'
  );
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const body = (await request.json()) as ChatRequestBody;

    if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '请求参数无效，缺少 messages 数组' },
        },
        { status: 400 }
      );
    }

    const lastMessage = body.messages[body.messages.length - 1];
    if (lastMessage.role !== 'user' || !lastMessage.content?.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '最后一条消息必须是用户输入' },
        },
        { status: 400 }
      );
    }

    const agent = await loadAgent(params.id);
    if (!agent) {
      return NextResponse.json(
        {
          success: false,
          error: { message: 'Agent 不存在' },
        },
        { status: 404 }
      );
    }

    const llmConfig = await getLLMConfig();
    const appConfig = await getAppConfig();

    const baseUrl =
      agent.llmConfig?.baseUrl || 'https://api-inference.modelscope.cn';
    const apiKey =
      agent.llmConfig?.apiKey || 'ms-defc617b-6145-4153-98f9-f93f3d224803';
    const model =
      agent.llmConfig?.model || 'Qwen/Qwen3-Coder-480B-A35B-Instruct';

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: { message: '未找到 API Key，请先在配置中设置' },
        },
        { status: 400 }
      );
    }

    const abortController = new AbortController();
    const resumeSessionId =
      body.options?.continue === false ? undefined : body.sessionId?.trim() || undefined;

    const stream = new ReadableStream({
      async start(controller) {
        let assistantText = '';
        let activeSessionId = resumeSessionId;

        const pushChunk = (payload: Record<string, unknown>) => {
          if (activeSessionId) {
            sendChunk(controller, { ...payload, sessionId: activeSessionId });
          } else {
            sendChunk(controller, payload);
          }
        };

        // 使用简单的字符串prompt，符合单消息输入模式
        const userPrompt = lastMessage.content;

        const options: Options = {
          model,
          maxTurns: body.options?.maxTurns ?? 6,
          env: {
            ANTHROPIC_BASE_URL: baseUrl,
            ANTHROPIC_AUTH_TOKEN: apiKey,
            ANTHROPIC_MODEL: model,
          },
          abortController,
        };

        if (resumeSessionId) {
          options.resume = resumeSessionId;
        }

        if (typeof body.options?.continue === 'boolean') {
          options.continue = body.options.continue;
        }

        console.log('Starting query with options:', { options, promptLength: userPrompt.length });

        try {
          // 使用单消息输入模式，避免AsyncGenerator类型问题
          for await (const event of query({ prompt: userPrompt, options })) {
            console.log('Received event:', event.type);

            if (!activeSessionId && typeof (event as any).session_id === 'string') {
              activeSessionId = (event as any).session_id;
            }

            // 处理不同类型的事件
            switch (event.type) {
              case 'assistant':
                console.log('Assistant message received');
                if (event.message?.content) {
                  const content = event.message.content;
                  if (Array.isArray(content)) {
                    for (const block of content) {
                      if (block.type === 'text' && block.text) {
                        const text = block.text;
                        console.log('Text block received, length:', text.length);
                        assistantText += text;
                        pushChunk({ type: 'delta', text });
                      }
                    }
                  }
                }
                break;

              case 'result':
                // 处理最终结果 - 在收到result事件时结束流
                console.log('Result event received, finishing stream');
                pushChunk({ type: 'done', text: assistantText });
                controller.close();
                return;

              case 'system':
                // 系统消息，记录但不发送给客户端
                console.log('System event:', event.subtype || 'system', event);
                break;

              default:
                console.log('Other event type:', event.type);
                // 对于其他未知事件类型，如果有text属性则处理
                if ('text' in event && typeof event.text === 'string') {
                  assistantText += event.text;
                  pushChunk({ type: 'delta', text: event.text });
                }
            }
          }

          // 如果流正常结束
          pushChunk({ type: 'done', text: assistantText });
          controller.close();
        } catch (error: any) {
          console.error('Query error:', error);
          pushChunk({
            type: 'error',
            message: error?.message || '查询失败',
          });
          controller.close();
        }
      },
      cancel() {
        abortController.abort();
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-cache, no-transform',
        Connection: 'keep-alive',
        'Transfer-Encoding': 'chunked',
      },
    });
  } catch (error) {
    console.error('Agent chat route error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          message: error instanceof Error ? error.message : '对话请求失败',
        },
      },
      { status: 500 }
    );
  }
}

