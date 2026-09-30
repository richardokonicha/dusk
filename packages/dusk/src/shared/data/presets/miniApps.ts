/**
 * Builtin (preset) miniapp definitions
 *
 * Single source of truth for all built-in miniApps.
 * Both renderer (UI display) and main process (DB merge logic) import from here.
 */
import type { LocalizedText } from '@shared/types/miniAppManifest'

export interface MiniAppPreset {
  id: string
  name: string
  nameKey?: string
  logo?: string
  url: string
  bordered?: boolean
  background?: string
  style?: { padding?: number }
}

export const PRESETS_MINI_APPS: MiniAppPreset[] = [
  {
    id: 'radeon-cloud',
    name: 'AMD GPU Cloud',
    url: 'https://developer.amd.com.cn/radeon/',
    logo: 'radeon-cloud',
    bordered: true
  },
  {
    id: 'openai',
    name: 'ChatGPT',
    url: 'https://chatgpt.com/',
    logo: 'openai',
    bordered: true
  },
  {
    id: 'gemini',
    name: 'Gemini',
    url: 'https://gemini.google.com/',
    logo: 'gemini',
    bordered: true
  },
  {
    id: 'silicon',
    name: 'SiliconFlow',
    url: 'https://cloud.siliconflow.cn/playground/chat',
    logo: 'silicon'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    url: 'https://chat.deepseek.com/',
    logo: 'deepseek'
  },
  {
    id: 'yi',
    name: 'Wanzhi',
    nameKey: 'miniApps.wanzhi',
    url: 'https://www.wanzhi.com/',
    logo: 'zeroone',
    bordered: true
  },
  {
    id: 'zhipu',
    name: 'ChatGLM',
    nameKey: 'miniApps.chatglm',
    url: 'https://chatglm.cn/main/alltoolsdetail',
    logo: 'zhipu',
    bordered: true
  },
  {
    id: 'moonshot',
    name: 'Kimi',
    url: 'https://kimi.moonshot.cn/',
    logo: 'Moonshot'
  },
  {
    id: 'baichuan',
    name: 'Baichuan',
    nameKey: 'miniApps.baichuan',
    url: 'https://ying.baichuan-ai.com/chat',
    logo: 'baichuan'
  },
  {
    id: 'dashscope',
    name: 'Qwen',
    nameKey: 'miniApps.qwen',
    url: 'https://www.qianwen.com',
    logo: 'qwen'
  },
  {
    id: 'stepfun',
    name: 'Stepfun',
    nameKey: 'miniApps.stepfun',
    url: 'https://stepfun.com',
    logo: 'step',
    bordered: true
  },
  {
    id: 'cici',
    name: 'Cici',
    url: 'https://www.cici.com/chat/',
    logo: 'bytedance'
  },
  {
    id: 'hailuo',
    name: 'Hailuo',
    nameKey: 'miniApps.hailuo',
    url: 'https://hailuoai.com/',
    logo: 'hailuo',
    bordered: true
  },
  {
    id: 'minimax-agent',
    name: 'Minimax Agent',
    nameKey: 'miniApps.minimax-agent',
    url: 'https://agent.minimaxi.com/',
    logo: 'minimax',
    bordered: true
  },
  {
    id: 'minimax-agent-global',
    name: 'Minimax Agent',
    nameKey: 'miniApps.minimax-global',
    url: 'https://agent.minimax.io/',
    logo: 'minimax',
    bordered: true
  },
  {
    id: 'groq',
    name: 'Groq',
    url: 'https://chat.groq.com/',
    logo: 'groq'
  },
  {
    id: 'anthropic',
    name: 'Claude',
    url: 'https://claude.ai/',
    logo: 'claude'
  },
  {
    id: 'google',
    name: 'Google',
    url: 'https://google.com/',
    logo: 'google',
    bordered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'baidu-ai-chat',
    name: 'Wenxin',
    nameKey: 'miniApps.wenxin',
    logo: 'wenxin',
    url: 'https://yiyan.baidu.com/'
  },
  {
    id: 'baidu-ai-search',
    name: 'Baidu AI Search',
    nameKey: 'miniApps.baidu-ai-search',
    logo: 'baidu',
    url: 'https://chat.baidu.com/',
    bordered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'tencent-yuanbao',
    name: 'Tencent Yuanbao',
    nameKey: 'miniApps.tencent-yuanbao',
    logo: 'yuanbao',
    url: 'https://yuanbao.tencent.com/chat',
    bordered: true
  },
  {
    id: 'sensetime-chat',
    name: 'Sensechat',
    nameKey: 'miniApps.sensechat',
    logo: 'sensetime',
    url: 'https://chat.sensetime.com/wb/chat',
    bordered: true
  },
  {
    id: 'spark-desk',
    name: 'SparkDesk',
    logo: 'xinghuo',
    url: 'https://xinghuo.xfyun.cn/desk'
  },
  {
    id: 'metaso',
    name: 'Metaso',
    nameKey: 'miniApps.metaso',
    logo: 'metaso',
    url: 'https://metaso.cn/'
  },
  {
    id: 'poe',
    name: 'Poe',
    logo: 'poe',
    url: 'https://poe.com'
  },
  {
    id: 'perplexity',
    name: 'Perplexity',
    logo: 'perplexity',
    url: 'https://www.perplexity.ai/'
  },
  {
    id: 'devv',
    name: 'DEVV_',
    logo: 'devv',
    url: 'https://devv.ai/'
  },
  {
    id: 'tiangong-ai',
    name: 'Tiangong AI',
    nameKey: 'miniApps.tiangong-ai',
    logo: 'tng',
    url: 'https://www.tiangong.cn/',
    bordered: true
  },
  {
    id: 'Felo',
    name: 'Felo',
    logo: 'felo',
    url: 'https://felo.ai/',
    bordered: true
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo',
    logo: 'duck',
    url: 'https://duck.ai'
  },
  {
    id: 'bolt',
    name: 'bolt',
    logo: 'bolt',
    url: 'https://bolt.new/',
    bordered: true
  },
  {
    id: 'nm',
    name: 'Nami AI',
    nameKey: 'miniApps.nami-ai',
    logo: 'namiai',
    url: 'https://bot.n.cn/',
    bordered: true
  },
  {
    id: 'thinkany',
    name: 'ThinkAny',
    logo: 'thinkany',
    url: 'https://thinkany.ai/',
    bordered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'github-copilot',
    name: 'GitHub Copilot',
    logo: 'githubcopilot',
    url: 'https://github.com/copilot'
  },
  {
    id: 'genspark',
    name: 'Genspark',
    logo: 'genspark',
    url: 'https://www.genspark.ai/'
  },
  {
    id: 'grok',
    name: 'Grok',
    logo: 'grok',
    url: 'https://grok.com',
    bordered: true
  },
  {
    id: 'grok-x',
    name: 'Grok / X',
    logo: 'twitter',
    url: 'https://x.com/i/grok',
    bordered: true
  },
  {
    id: 'qwenlm',
    name: 'QwenChat',
    logo: 'qwen',
    url: 'https://chat.qwen.ai'
  },
  {
    id: 'flowith',
    name: 'Flowith',
    logo: 'flowith',
    url: 'https://www.flowith.io/',
    bordered: true
  },
  {
    id: '3mintop',
    name: '3MinTop',
    logo: 'mintop3',
    url: 'https://3min.top',
    bordered: false
  },
  {
    id: 'aistudio',
    name: 'AI Studio',
    logo: 'aistudio',
    url: 'https://aistudio.google.com/'
  },
  {
    id: 'xiaoyi',
    name: 'Xiaoyi',
    nameKey: 'miniApps.xiaoyi',
    logo: 'xiaoyi',
    url: 'https://xiaoyi.huawei.com/chat/',
    bordered: true
  },
  {
    id: 'notebooklm',
    name: 'NotebookLM',
    logo: 'notebooklm',
    url: 'https://notebooklm.google.com/'
  },
  {
    id: 'coze',
    name: 'Coze',
    logo: 'coze',
    url: 'https://www.coze.com/space',
    bordered: true
  },
  {
    id: 'dify',
    name: 'Dify',
    logo: 'dify',
    url: 'https://cloud.dify.ai/apps',
    bordered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'wpslingxi',
    name: 'WPS AI',
    nameKey: 'miniApps.wps-copilot',
    logo: 'lingxi',
    url: 'https://copilot.wps.cn/',
    bordered: true
  },
  {
    id: 'lechat',
    name: 'LeChat',
    logo: 'mistral',
    url: 'https://chat.mistral.ai/chat',
    bordered: true
  },
  {
    id: 'abacus',
    name: 'Abacus',
    logo: 'abacus',
    url: 'https://apps.abacus.ai/chatllm',
    bordered: true
  },
  {
    id: 'lambdachat',
    name: 'Lambda Chat',
    logo: 'lambda',
    url: 'https://lambda.chat/',
    bordered: true
  },
  {
    id: 'monica',
    name: 'Monica',
    logo: 'monica',
    url: 'https://monica.im/home/',
    bordered: true
  },
  {
    id: 'you',
    name: 'You',
    logo: 'you',
    url: 'https://you.com/'
  },
  {
    id: 'zhihu',
    name: 'Zhihu Zhida',
    nameKey: 'miniApps.zhihu',
    logo: 'zhida',
    url: 'https://zhida.zhihu.com/',
    bordered: true
  },
  {
    id: 'dangbei',
    name: 'Dangbei AI',
    nameKey: 'miniApps.dangbei',
    logo: 'dangbei',
    url: 'https://ai.dangbei.com/',
    bordered: true
  },
  {
    id: `zai`,
    name: `Z.ai`,
    logo: 'zai',
    url: `https://chat.z.ai/`,
    bordered: true
  },
  {
    id: 'n8n',
    name: 'n8n',
    logo: 'n8n',
    url: 'https://app.n8n.cloud/',
    bordered: true,
    style: {
      padding: 5
    }
  },
  {
    id: 'longcat',
    name: 'LongCat',
    logo: 'longcat',
    url: 'https://longcat.chat/',
    bordered: true
  },
  {
    id: 'ling',
    name: 'Ant Ling',
    nameKey: 'miniApps.ant-ling',
    url: 'https://ling.tbox.cn/chat',
    logo: 'ling',
    bordered: true,
    style: {
      padding: 6
    }
  },
  {
    id: 'huggingchat',
    name: 'HuggingChat',
    url: 'https://huggingface.co/chat/',
    logo: 'huggingface',
    bordered: true,
    style: {
      padding: 6
    }
  }
]

/**
 * A mini app that ships inside the Dusk package, listed for the launcher BEFORE it
 * is installed. Display data only — `resources/builtin-mini-apps/<appId>/manifest.json`
 * is the source of truth, re-read and fully validated at install time. Permissions,
 * network and version are never taken from here.
 */
export interface BuiltinMiniApp {
  appId: string
  /** The manifest field verbatim — the CI test asserts equality with the shipped package. */
  name: LocalizedText
  /** Package-relative path to a build-time 128x128 WebP. See the catalog test. */
  icon: string
}

/** Empty on purpose: this release ships the slot, not the contents. */
export const BUILTIN_MINI_APPS: BuiltinMiniApp[] = []
