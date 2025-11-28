// AI服务集成 - 支持多个API端点
import { ENV_CONFIG } from '../config/environment';
export interface AIEndpoint {
  name: string;
  url: string;
  apiKey: string;
  priority: number;
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// 预设的AI端点配置
const AI_ENDPOINTS: AIEndpoint[] = [
  {
    name: 'laozhang',
    url: 'https://api.laozhang.ai/v1/chat/completions',
    apiKey: 'sk-zHKiyuo8GkU5BKyf50963cDf19Dd41B89aE6F31cAe73235a',
    priority: 1
  },
  {
    name: 'poe',
    url: 'https://api.poe.com/v1/chat/completions',
    apiKey: 'vckcyvATpucnNfNne4ESXS1bsAcn7Myff2E5xyce3v0',
    priority: 2
  },
  {
    name: 'yyds',
    url: 'https://ai-yyds.com/v1/chat/completions',
    apiKey: 'sk-KZw5hQpbZNAnRtAOB3Ba667264C64d1c9bBf7e2314E56fEd',
    priority: 3
  },
  {
    name: 'pro',
    url: 'https://pro.aiskt.com/v1/chat/completions',
    apiKey: 'sk-c2FPm9GKWVXVeJg7CdF64cF943784aA0858e2a7303380f20',
    priority: 4
  },
  {
    name: 'aihk',
    url: 'https://api.openai-hk.com/v1/chat/completions',
    apiKey: 'hk-y7nrnu1000047794311a7c3256c7755ced39bbd488913924',
    priority: 5
  },
  {
    name: 'duck',
    url: 'https://api.duckagi.com/v1/chat/completions',
    apiKey: 'sk-FdRrPSdKf3XxZtrRhQPHbR66nUsKmapmWK5lfofsOxmMxz3a',
    priority: 6
  },
  {
    name: 'us',
    url: 'https://www.gptapi.us/v1/chat/completions',
    apiKey: 'sk-jutGGILLVaOhy9fX14F90e19A42a49C1B12f115eEa6cD29a',
    priority: 7
  },
  {
    name: 'apiyi',
    url: 'https://www.apiyi.com/v1/chat/completions',
    apiKey: 'sk-nftGOS33m4ZNhPfu575984D2Ed6e4aB9B2627b1c799FcA3',
    priority: 8
  },
  {
    name: 'router',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey: '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',
    priority: 9
  }
];

// 每个模型的最大输出token上限（谨慎保守值，避免超限报错）
export const MODEL_COMPLETION_LIMIT: Record<string, number> = {
  'deepseek-r1': 32768,      // 官方常见生成上限 32,768（见下）
  'gpt-4o': 4096,            // 公开经验值，超过常报 4k 上限
  'gpt-4o-mini': 4096,       // 未有权威“输出上限”，按 4k 保守
  'gpt-4-turbo': 4096,       // 老款 4k 输出较稳
  'gpt-3.5-turbo': 2048,     // 一直较小
  'o1-mini': 4096,           // 推理模型隐藏推理令牌多，保守 4k
  'o1': 8192,                // 比  mini 放宽，但仍保守
  'o3': 8192,                // 同上
  'o3-mini': 8192,           // 兼容标注
  'gpt-5': 8192              // 官方说法很大，但为兼容先保守
};

class AIService {
  private endpoints: AIEndpoint[] = AI_ENDPOINTS;
  private maxRetries = 3;
  private delay = 1000; // 1秒
  private debug = ENV_CONFIG.DEBUG;
  // 最近一次请求/响应的调试信息
  public lastDebug: {
    request?: {
      endpoint: string;
      url: string;
      model: string;
      max_completion_tokens: number;
      messagesPreview: Array<{ role: string; content: string }>;
      timestamp: number;
    };
    response?: {
      usage?: any;
      model?: string;
      finish_reason?: string;
      contentPreview?: string;
      timestamp: number;
    };
  } = {};

  // 发送请求到指定端点
  private async sendRequestToEndpoint(
    endpoint: AIEndpoint, 
    messages: AIMessage[], 
    model: string = 'o3'
  ): Promise<AIResponse> {
    const headers = {
      'Authorization': `Bearer ${endpoint.apiKey}`,
      'Content-Type': 'application/json'
    };

    const maxCompletion = MODEL_COMPLETION_LIMIT[model] ?? 2000;
    const payload = {
      model,
      messages,
      max_completion_tokens: maxCompletion
    };

    const reqPreview = messages.map(m => ({ role: m.role, content: m.content.slice(0, 200) + (m.content.length > 200 ? '…' : '') }));
    if (this.debug) {
      console.debug('[AIService] Request payload:', {
        endpoint: endpoint.name,
        url: endpoint.url,
        model,
        max_completion_tokens: maxCompletion,
        messagesPreview: reqPreview,
      });
    }
    this.lastDebug.request = {
      endpoint: endpoint.name,
      url: endpoint.url,
      model,
      max_completion_tokens: maxCompletion,
      messagesPreview: reqPreview,
      timestamp: Date.now()
    };

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const respContent = data.choices?.[0]?.message?.content ?? '';
    const respMeta = {
      usage: data.usage,
      model: data.model,
      finish_reason: data.choices?.[0]?.finish_reason,
      contentPreview: typeof respContent === 'string' ? (respContent.slice(0, 200) + (respContent.length > 200 ? '…' : '')) : undefined,
      timestamp: Date.now()
    };
    if (this.debug) {
      console.debug('[AIService] Raw response meta:', respMeta);
    }
    this.lastDebug.response = respMeta;
    
    return {
      content: data.choices[0].message.content,
      usage: data.usage
    };
  }

  // 统一发送请求，支持自动重试和端点切换
  async sendRequest(
    messages: AIMessage[], 
    model: string = 'deepseek-r1',
    preferredEndpoint?: string
  ): Promise<AIResponse> {
    // 按优先级排序端点
    const sortedEndpoints = [...this.endpoints].sort((a, b) => a.priority - b.priority);
    
    // 如果指定了首选端点，将其移到最前面
    if (preferredEndpoint) {
      const preferred = sortedEndpoints.find(ep => ep.name === preferredEndpoint);
      if (preferred) {
        const index = sortedEndpoints.indexOf(preferred);
        sortedEndpoints.splice(index, 1);
        sortedEndpoints.unshift(preferred);
      }
    }

    let lastError: Error | null = null;

    for (const endpoint of sortedEndpoints) {
      for (let attempt = 0; attempt < this.maxRetries; attempt++) {
        try {
          // 添加随机延时，避免请求过快
          if (attempt > 0) {
            await new Promise(resolve => 
              setTimeout(resolve, this.delay * Math.pow(2, attempt) + Math.random() * 1000)
            );
          }

          if (this.debug) console.log(`[AIService] Trying endpoint ${endpoint.name}, attempt ${attempt + 1}`);
          const result = await this.sendRequestToEndpoint(endpoint, messages, model);
          if (this.debug) console.log(`[AIService] Endpoint ${endpoint.name} succeeded`);
          return result;
        } catch (error) {
          lastError = error as Error;
          if (this.debug) console.warn(`[AIService] Endpoint ${endpoint.name} failed (attempt ${attempt + 1}):`, error);
        }
      }
    }

    throw new Error(`All endpoints failed. Last error: ${lastError?.message}`);
  }

  // 估算文本tokens（启发式）：
  // - CJK字符按 1.2 字符 ≈ 1 token 近似
  // - 其他语言按 单词*1.3 + 标点近似
  estimateTokens(text: string): number {
    if (!text) return 0;
    const cjk = (text.match(/[\u4e00-\u9fa5\u3040-\u30ff\u3400-\u9fff]/g) || []).length;
    const nonCjk = text.length - cjk;
    const words = (text.match(/[A-Za-z0-9]+/g) || []).length;
    const approxCjkTokens = Math.ceil(cjk / 1.2);
    const approxLatinTokens = Math.ceil(words * 1.3 + Math.max(0, nonCjk - words) * 0.05);
    return approxCjkTokens + approxLatinTokens;
  }

  // 批量段落翻译：按段落数组输入，保证输出段落数一致，格式JSON
  async translateParagraphsInBatches(
    paragraphs: string[],
    targetLanguage: string,
    sourceLanguage?: string,
    options?: { maxTokensPerBatch?: number; model?: string; endpoint?: string; maxRetriesPerBatch?: number; concurrency?: number; onBatch?: (ev: 'start'|'success'|'retry'|'error', info: any) => void }
  ): Promise<Array<{ start: number; end: number; translations: string[] }>> {
    const maxTokensPerBatch = options?.maxTokensPerBatch ?? 2000;
    const model = options?.model ?? 'o3-mini';
    const preferredEndpoint = options?.endpoint ?? 'laozhang';
    const maxRetriesPerBatch = options?.maxRetriesPerBatch ?? 2;
    const concurrency = Math.max(1, options?.concurrency ?? 8);

    // 构建批次：贪心累加直至达到阈值
    const batches: Array<{ index: number; start: number; end: number; items: string[] }> = [];
    let i = 0;
    while (i < paragraphs.length) {
      const start = i;
      let accTokens = 200; // 预留system+指令开销
      const items: string[] = [];
      while (i < paragraphs.length) {
        const p = paragraphs[i] || '';
        const t = this.estimateTokens(p);
        if (items.length > 0 && accTokens + t > maxTokensPerBatch) break;
        items.push(p);
        accTokens += t;
        i++;
      }
      batches.push({ index: batches.length, start, end: i - 1, items });
    }

    const results: Array<{ start: number; end: number; translations: string[] } | undefined> = new Array(batches.length).fill(undefined);

    const runOne = async (bi: number) => {
      const batch = batches[bi];
      try { options?.onBatch?.('start', { index: bi, total: batches.length, start: batch.start, end: batch.end, items: batch.items.length }); } catch {}
      let attempt = 0;
      while (attempt <= maxRetriesPerBatch) {
        attempt++;
        try {
          const sys = `你是专业文学翻译。将给定段落列表逐段翻译成${targetLanguage}，严格保证输出的段落数量与输入完全一致，顺序一致。输出必须是标准JSON数组，每个元素为{"index": number, "translation": string}，index为相对批次内的段落序号（从0开始）。只返回JSON，不要任何解释、前缀或代码块标记。`;
          const usr = `源语言：${sourceLanguage || '未知'}\n目标语言：${targetLanguage}\n段落数量：${batch.items.length}\n段落列表（JSON）：${JSON.stringify(batch.items.map((t, idx) => ({ index: idx, text: t })))}\n请返回对应的JSON数组，元素数量必须为${batch.items.length}。`;
          const messages: AIMessage[] = [
            { role: 'system', content: sys },
            { role: 'user', content: usr }
          ];
          const resp = await this.sendRequest(messages, model, preferredEndpoint);
          let content = resp.content?.trim() || '';
          if (content.startsWith('```')) {
            const first = content.indexOf('\n');
            const last = content.lastIndexOf('```');
            if (first !== -1 && last !== -1) content = content.slice(first + 1, last).trim();
          }
          const parsed = JSON.parse(content);
          if (!Array.isArray(parsed) || parsed.length !== batch.items.length) {
            throw new Error(`段落数量不一致: got ${Array.isArray(parsed) ? parsed.length : 'non-array'} expected ${batch.items.length}`);
          }
          const arr: string[] = parsed
            .sort((a: any, b: any) => (a?.index ?? 0) - (b?.index ?? 0))
            .map((x: any) => (typeof x?.translation === 'string' ? x.translation : ''));
          if (arr.length !== batch.items.length || arr.some((s) => typeof s !== 'string')) {
            throw new Error('解析失败或翻译缺失');
          }
          results[bi] = { start: batch.start, end: batch.end, translations: arr };
          try { options?.onBatch?.('success', { index: bi, start: batch.start, end: batch.end, count: arr.length, translations: arr }); } catch {}
          break;
        } catch (e) {
          try { options?.onBatch?.('retry', { index: bi, attempt, error: String((e as any)?.message || e) }); } catch {}
          if (attempt > maxRetriesPerBatch) {
            const err = new Error(`批次(${batch.start}-${batch.end})翻译失败: ${String((e as any)?.message || e)}`);
            try { options?.onBatch?.('error', { index: bi, error: err.message }); } catch {}
            throw err;
          }
          await new Promise((r) => setTimeout(r, 500 * attempt));
        }
      }
      // 让出主线程，避免UI卡顿
      await new Promise((r) => setTimeout(r, 0));
    };

    let next = 0;
    const workers: Promise<void>[] = [];
    const spawn = () => {
      if (next >= batches.length) return;
      const bi = next++;
      const p = runOne(bi).then(spawn);
      workers.push(p);
    };
    for (let w = 0; w < Math.min(concurrency, batches.length); w++) spawn();
    await Promise.all(workers);

    return results.filter((x): x is { start: number; end: number; translations: string[] } => !!x);
  }

  // 翻译文本
  async translateText(
    text: string, 
    targetLanguage: string, 
    sourceLanguage?: string
  ): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的翻译助手。请将用户提供的文本翻译成${targetLanguage}。如果提供了源语言，请确保翻译的准确性。只返回翻译结果，不要添加任何解释。`
      },
      {
        role: 'user',
        content: `请翻译以下${sourceLanguage ? sourceLanguage + ' ' : ''}文本到${targetLanguage}：\n\n${text}`
      }
    ];

    const response = await this.sendRequest(messages);
    return response.content.trim();
  }

  // 生成句子总结
  async generateSentenceSummary(sentence: string, language: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个语言学习助手。请为用户提供的${language}句子生成简洁的总结，帮助理解句子的主要含义和语法结构。`
      },
      {
        role: 'user',
        content: `请为以下${language}句子生成总结：\n\n${sentence}`
      }
    ];

    const response = await this.sendRequest(messages);
    return response.content.trim();
  }

  // 生成书籍章节总结
  async generateChapterSummary(chapterContent: string, chapterTitle: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个专业的书籍总结助手。请为给定的章节内容生成简洁而全面的总结，包括主要观点、关键概念和重要信息。总结应该控制在3-5句话内。`
      },
      {
        role: 'user',
        content: `请为以下章节生成总结：\n\n章节标题：${chapterTitle}\n\n章节内容：\n${chapterContent}`
      }
    ];

    const response = await this.sendRequest(messages);
    return response.content.trim();
  }

  // 生成学习建议
  async generateLearningSuggestion(content: string, context: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个语言学习专家。基于给定的内容，为用户提供实用的学习建议，包括学习方法、练习建议和注意事项。`
      },
      {
        role: 'user',
        content: `基于以下内容，请提供学习建议：\n\n内容：${content}\n\n上下文：${context}`
      }
    ];

    const response = await this.sendRequest(messages);
    return response.content.trim();
  }

  // 生成日语假名标注
  async generateJapaneseFurigana(text: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个日语专家。请为文本中的汉字添加平假名标注，格式为：汉字（平假名）。只返回处理后的文本，不要添加任何解释。`
      },
      {
        role: 'user',
        content: `请为以下日语文本添加平假名标注：\n\n${text}`
      }
    ];

    const response = await this.sendRequest(messages);
    return response.content.trim();
  }

  // 分析句子难度
  async analyzeSentenceDifficulty(sentence: string, language: string): Promise<{
    level: 'beginner' | 'intermediate' | 'advanced';
    explanation: string;
    keyWords: string[];
  }> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: `你是一个语言学习专家。请分析给定句子的难度等级，并提供解释和关键词。返回JSON格式：{"level": "beginner|intermediate|advanced", "explanation": "解释", "keyWords": ["关键词1", "关键词2"]}`
      },
      {
        role: 'user',
        content: `请分析以下${language}句子的难度：\n\n${sentence}`
      }
    ];

    const response = await this.sendRequest(messages);
    try {
      return JSON.parse(response.content);
    } catch {
      return {
        level: 'intermediate',
        explanation: '无法解析难度分析结果',
        keyWords: []
      };
    }
  }

  getLastDebug(): typeof this.lastDebug {
    return this.lastDebug;
  }

  // 将选中的日文文本为每个包含汉字的词添加假名：返回带括注的文本
  async addJapaneseFuriganaInline(text: string): Promise<string> {
    const messages: AIMessage[] = [
      {
        role: 'system',
        content: '你是一个日语专家。请在给定文本中，仅对包含汉字的词添加平假名括注，格式为 词（かな）。不要改动纯假名/片假名、标点与空格，不要拆分词或改变顺序。只返回处理后的文本。'
      },
      {
        role: 'user',
        content: text
      }
    ];
    const resp = await this.sendRequest(messages, 'o3-mini', 'laozhang');
    return (resp.content || '').trim();
  }
}

// 导出单例实例
export const aiService = new AIService();
export default aiService;
