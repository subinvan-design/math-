import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy-initialized Gemini client
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI | null {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY" || key === "") {
      console.warn("GEMINI_API_KEY is not configured or in placeholder state. Operating with high-quality local generator.");
      return null;
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Built-in premium localized math problems for beautiful offline experience or sandbox mode
const FALLBACK_PROBLEMS = [
  {
    story: "다람쥐 토리가 숲속 나무에서 버섯을 15개 땄어요. 그런데 도중에 아기 토끼를 만나서 버섯 6개를 선물로 나누어 주었답니다.",
    question: "착한 토리에게 남은 버섯은 모두 몇 개일까요?",
    choices: ["7개", "8개", "9개", "10개"],
    answerIndex: 2,
    explanation: "전체 원래 있던 15개에서 아기 토끼에게 준 6개를 빼면 15 - 6 = 9가 돼요! 토리는 양보할 줄 아는 정말 멋진 다람쥐군요! 🌰"
  },
  {
    story: "우주 탐험가 초코가 탄 로켓이 연료 빵을 얻으려고 해요. 로켓 엔진 3개를 모두 가동해야 하는데, 엔진 하나당 초코 빵 4개씩이 필요하다고 하네요.",
    question: "우주선이 멋지게 날아가기 위해 필요한 초코 빵은 총 몇 개일까요?",
    choices: ["8개", "12개", "14개", "16개"],
    answerIndex: 1,
    explanation: "엔진 3개에 각각 4개씩 필요하므로, 3 × 4 = 12예요! 구구단을 멋지게 풀었네요! 로켓이 밤하늘로 슝 날아갑니다! 🚀"
  },
  {
    story: "맛있는 치즈 피자 한 판을 초록 요정 4명이 똑같이 나누어 가지려고 합니다. 각 요정은 원래 하트 모양 피자 도우의 반쪽을 기대하고 있었지만, 골고루 나누어 받았어요.",
    question: "요정 한 명이 가지고 간 피자 조각은 전체 피자 한 판의 몇 분의 몇일까요?",
    choices: ["2분의 1 (1/2)", "3분의 1 (1/3)", "4분의 1 (1/4)", "8분의 1 (1/8)"],
    answerIndex: 2,
    explanation: "둥그렇고 맛있는 피자 한 판을 똑같이 4개로 조각내면 그중 하나는 '4분의 1'이 돼요! 숫자로 쓰면 1/4이랍니다. 피자를 공평하게 맛볼 수 있겠어요! 🍕"
  },
  {
    story: "비밀의 숲 속 요정의 방 자물쇠 부근에 '8보다 크고 16보다 작은 홀수이며, 십의 자리 수와 일의 자리 수를 더하면 4가 되는 마법의 나이'라는 수수께끼 쪽지가 붙어 있습니다.",
    question: "성문을 열 수 있는 마법의 암호는 무엇일까요?",
    choices: ["9", "11", "13", "15"],
    answerIndex: 2,
    explanation: "8과 16 사이의 홀수 중에서 십의 자리(1)와 일의 자리(3)를 더하면 1 + 3 = 4가 되므로 암호는 13이에요! 셜록 대원처럼 추리해 내다니 정말 대단해요! 🔑"
  },
  {
    story: "바다요정 메아리가 예쁜 조개껍데기를 수집하고 있어요. 어제 조개껍데기 24개를 모았는데, 오늘 오전에는 파도에 밀려온 조개 12개를 추가로 얻었고, 오후에 친구에게 5개를 나누어주었습니다.",
    question: "지금 메아리가 가지고 있는 조개껍데기는 모두 몇 개일까요?",
    choices: ["31개", "35개", "36개", "41개"],
    answerIndex: 0,
    explanation: "어제 있던 24개에 오늘 얻은 12개를 더하면 36개가 되고, 거기서 친구에게 준 5개를 빼면 36 - 5 = 31개가 됩니다! 친구를 생각하는 마음씨가 정말 따뜻하네요! 🐚"
  },
  {
    story: "귀여운 마법사 포리가 수수께끼 상자를 열려고 합니다. '나를 5글자로 표현해봐! 35의 약수이면서 7과 곱하면 35가 되는 바로 그 숫자야!' 상자에서 목소리가 나옵니다.",
    question: "수수께끼 상자가 말하는 마법의 숫자 '다섯'은 무엇일까요?",
    choices: ["1", "5", "7", "35"],
    answerIndex: 1,
    explanation: "35의 약수 중에서 7과 곱해 35가 되는 숫자는 바로 '5'입니다! 5 × 7 = 35가 맞죠! 아주 멋지게 상자의 비밀을 풀었군요! 🎁"
  }
];

// 1. Generate Math Problem utilizing Gemini AI
app.post("/api/math/generate", async (req, res) => {
  try {
    const { category, difficulty, theme } = req.body;

    const ai = getAi();
    if (!ai) {
      // Return a dynamic randomized problem from our premium collection when Gemini is not connected yet
      const filtered = FALLBACK_PROBLEMS;
      const index = Math.floor(Math.random() * filtered.length);
      const chosen = filtered[index];
      return res.json({
        ...chosen,
        source: "local-handcrafted",
        message: "로컬 수학 발전소에서 정교하게 생성된 문제입니다!"
      });
    }

    const systemPrompt = `당신은 초등학생 및 미취학 아동들을 가르치는 매우 다정하고, 격려를 가득 전해주는 AI 초등 수학선생님 '토리'입니다. 
아이들이 수학을 재미있는 이야기책처럼 주도적으로 경험할 수 있도록 다채롭고 직관적인 비주얼의 스토리를 입혀서 문제를 만듭니다.

수학 범위 가이드:
- 덧셈과 뺄셈: 99 이하의 도합, 혹은 문장제 받아올림/내림
- 곱셈과 구구단: 실생활 응용 문제 및 곱셈표 기본
- 분수와 도형: 분수의 개념(피자, 쿠키 나누기), 사각형/삼각형/원의 성질
- 수수께끼/추리: 약수와 배수, 숫자 퀴즈, 암호 풀이식 흥미진진한 탐정 퀴즈

난이도 가이드:
- '쉬움 (초등 저학년)': 기본 단문 덧뺄셈, 쉬운 일상 대화 숫자
- '보통 (초등 중학년)': 1자리수 곱셈, 간단한 나눗셈, 기본 도형과 분수 분할
- '어려움 (초등 고학년)': 복합 연산(두 단계 풀이), 세자리수 덧뺄셈, 약수/배수 규칙 추리

아이들이 너무 신나할 수 있게 정답을 고르고 난 뒤 보게 되는 'explanation(해설)'에는 무조건 폭풍 칭찬과 재미있는 리액션(예: "와아아아! 엄청나!", "토리의 하트 도토리 선물!", "로켓 엔진 폭발적 가동!")을 포함해 주세요.`;

    const instructions = `요청받은 테마('${theme || "동물 친구들"}'), 카테고리('${category || "덧셈과 뺄셈"}'), 난이도('${difficulty || "쉬움"}')에 꼭 맞는 한 개의 수학 문장제 문제를 완전히 한글(Korean)로 생성해 주세요.

반드시 정답 인덱스(answerIndex: 0~3)는 choices 배열 안의 정답의 위치와 엄격하게 100% 일치해야 하며, Choices 배열에는 반드시 정답 한 개만이 포함되어야 합니다.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: instructions,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            story: {
              type: Type.STRING,
              description: "재미있고 흥미진진한 상황이 묘사된 2~3줄의 한글 동화/에피소드 스토리"
            },
            question: {
              type: Type.STRING,
              description: "이야기에 기반하여 아이가 풀어야 할 직관적이고 친근한 한글 수학 질문"
            },
            choices: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "답과 직관적인 단위가 붙어 있는 4개의 구체적인 한글 보기 배열 (예: ['5개', '8개', '12개', '14개'])"
            },
            answerIndex: {
              type: Type.INTEGER,
              description: "choices 배열에서 핵심 정답이 위치하는 정확한 인덱스 번호 (0, 1, 2, 3 중 하나)"
            },
            explanation: {
              type: Type.STRING,
              description: "아이가 맞췄을 때 또는 틀렸을 때 읽게 되는 사랑스럽고 알기 쉬운 한글 단계별 문제 풀이와 따뜻한 축하 칭찬"
            }
          },
          required: ["story", "question", "choices", "answerIndex", "explanation"]
        }
      }
    });

    if (response && response.text) {
      const data = JSON.parse(response.text.trim());
      return res.json({
        ...data,
        source: "gemini-api"
      });
    } else {
      throw new Error("Empty response from Gemini API");
    }

  } catch (error: any) {
    console.error("Gemini problem generation error:", error);
    // Fallback on error to ensure smooth playing
    const filtered = FALLBACK_PROBLEMS;
    const index = Math.floor(Math.random() * filtered.length);
    const chosen = filtered[index];
    return res.json({
      ...chosen,
      source: "local-handcrafted",
      error: error.message || "Unknown error occurred"
    });
  }
});

// 2. Chat with friendly companion '토리' or '로비'
app.post("/api/math/chat", async (req, res) => {
  try {
    const { message, history } = req.body;
    const ai = getAi();
    
    if (!ai) {
      // Local delightful responses based on typical kids' messages
      const lower = (message || "").toLowerCase();
      let reply = "안녕! 나는 수학 탐험대의 영리한 도우미🐿️ 다람쥐 '토리'야! 무엇이든 물어봐! 수학에 관한 이야기도 좋고 일상 이야기도 좋아!";
      
      if (lower.includes("안녕") || lower.includes("하이") || lower.includes("반가워")) {
        reply = "야호! 반가워 친구야! 😊 오늘 나랑 재미있는 도토리 모험하면서 수학을 즐겁게 풀어보자! 너를 보니까 기분이 슝 맑아졌어!";
      } else if (lower.includes("귀여워") || lower.includes("이름")) {
        reply = "헤헤 고마워! 나는 머리에 도토리 모자를 쓴 수학 다람쥐 토리야! 혹시 어려운 수학 퀴즈가 있다면 토리가 도토리 크기만큼 알기 쉽게 알려줄게! 🌰";
      } else if (lower.includes("더하기") || lower.includes("빼기") || lower.includes("수학") || lower.includes("어려워")) {
        reply = "수학이 조금 낯설고 어렵게 느껴질 수 있어! 하지만 숲속 맛있는 사과 개수를 세는 놀이라고 생각하면 진짜 재미있어! 토리와 함께 한 단계씩 해볼까? 우린 할 수 있어! 🌟";
      } else if (lower.includes("구구단") || lower.includes("곱셈") || lower.includes("구구단 외우")) {
        reply = "와! 곱셈 구구단은 놀라운 마법 상자야! 예를 들어 '2마리의 토끼가 각각 양손에 당근 3개씩' 들고 있으면 2 × 3 = 6! 하하 참 신기하지? 토리가 재미있는 곱셈 놀이판도 가득 채웠어!";
      } else if (lower.includes("100점") || lower.includes("이겼어") || lower.includes("클리어")) {
        reply = "와아아아 대단해! 🌟🎉 우리 친구 수학 지능이 우주 끝까지 자란 것 같아! 토리가 보물 상자에 있는 특급 황금 도토리를 가득 선물해줄게! 최고야 최고!";
      }
      return res.json({ reply, source: "local-handcrafted" });
    }

    const messages = [
      {
        role: "user",
        parts: [{ text: "안녕 토리! 친구가 되어줘." }]
      },
      {
        role: "model",
        parts: [{ text: "안녕! 나는 언제나 너를 응원하는 수학 탐험대 가이드 다람쥐 '토리'야! 귀찮거나 헷갈리는 수학 원리부터 칭찬 일기까지 언제든 너의 이야기를 듣고 기분 좋게 리액션해줄게! 반가워 친구야! 🌰✨" }]
      }
    ];

    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        messages.push({
          role: h.role === "user" ? "user" : "model",
          parts: [{ text: h.text }]
        });
      });
    }

    messages.push({
      role: "user",
      parts: [{ text: message }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: JSON.stringify(messages),
      config: {
        systemInstruction: "당신은 아이들이 열렬히 사랑하는 숲속 수학 다람쥐 '토리'입니다. 항상 말괄량이처럼 귀엽고 신나며 사랑스럽고 격려어린 말투를 쓰고, 이모지(🌰, 🐿️, 🌟, 🚀, 🍕, 🎨)를 엄청 즐겨 쓰고, 설명은 7살에서 10살 아이의 눈높이로 기적같이 쉬우면서도 흥미진진하게 풀어줘야 합니다.",
      }
    });

    return res.json({
      reply: response.text || "미안해 친구야, 도토리가 굴러 떨어져서 다시 한번 얘기해 줄래?",
      source: "gemini-api"
    });

  } catch (error: any) {
    console.error("Gemini companion chat error:", error);
    return res.json({
      reply: "우와! 방금 엄청난 번개가 쳐서 마법 에너지 충전이 필요해! 하지만 괜찮아! 토리는 언제나 널 믿고 있어! 잠시 후에 다시 말해줘! 👍",
      source: "local-handcrafted"
    });
  }
});


// Handle Vite serving assets or static files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Math Adventure Server] Running smoothly on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start math adventure server:", err);
});
