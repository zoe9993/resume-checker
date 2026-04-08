export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'APIキーが設定されていません' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await req.json();
    const { text, options } = body;

    if (!text || !text.trim()) {
      return new Response(JSON.stringify({ error: 'テキストを入力してください' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const systemPrompt = `あなたは日本の人材紹介会社出身のプロキャリアアドバイザーです。
候補者の職務経歴書を以下の観点でチェックし、JSON形式で結果を返してください。

チェック観点：${(options || []).join('、')}

返却するJSONの形式：
{
  "score": 75,
  "issues": [
    {
      "type": "grammar|format|english|confirm",
      "original": "元の表現（問題箇所）",
      "fixed": "修正後の表現",
      "reason": "修正理由（簡潔に）"
    }
  ],
  "correctedText": "全体を修正したテキスト（元の構成を保ちつつ修正済み）",
  "summary": "全体の評価コメント（2〜3文）"
}

typeの定義：
- grammar: 日本語文法・表現の問題
- format: フォーマット・構成の問題
- english: 英語表記の大文字小文字・正式名称の問題
- confirm: 数字・規模感が不足していて候補者に確認が必要な箇所

重要ルール：
- JSONのみ返す。前置き・説明文は不要。
- issuesは重要な問題のみ最大15件。
- scoreは0〜100点（文法・表現・フォーマットの完成度）。
- 情報の創作・追加は絶対禁止。事実ベースのみ。
- 語尾は「〜した」体に統一されているかチェック。
- 職務要約は200〜250字が適切かチェック。
- 英語表記：Spring Boot、MySQL、PostgreSQL、TypeScript、JavaScript、GitHub、Docker、AWS など正しい表記かチェック。`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: `以下の職務経歴書をチェックしてください：\n\n${text}` }]
      })
    });

    if (!response.ok) {
      const err = await response.json();
      return new Response(JSON.stringify({ error: err.error?.message || 'APIエラー' }), {
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const data = await response.json();
    const raw = data.content[0].text.trim();
    const jsonStr = raw.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const result = JSON.parse(jsonStr);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
