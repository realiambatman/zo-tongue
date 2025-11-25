# Cost Analysis: Monthly Token Usage & Pricing

## Pricing (from Gemini 3 Pro)

- **Input tokens**: $2.00 per 1M tokens (for prompts ≤ 200k tokens)
- **Output tokens** (including thinking tokens): $12.00 per 1M tokens (for prompts ≤ 200k tokens)

## System Instructions Token Count

**YES, system instructions ARE counted as input tokens on every message** in a chat session. This is because:

- System instructions must be included in the context window for each API call
- Each message in a conversation includes the full context (system + conversation history)

### Current System Instruction Size

Looking at `createChatSession()`:

- System instruction: ~400 characters ≈ **~150 tokens** (estimated)
- This is included in input tokens for every message

## Token Estimates Per Message

### Input Tokens (per message):

- System instruction: **150 tokens** (counted every time)
- User message: **50 tokens** (average, assuming short messages)
- Conversation history: **0 tokens** (assuming fresh session per message, or minimal)
- **Total Input per message: ~200 tokens**

### Output Tokens (per message):

- Response text: **200 tokens** (average moderate response)
- Thinking tokens (LOW level): **50-100 tokens** (with `ThinkingLevel.LOW`)
- **Total Output per message: ~275 tokens**

## Daily Usage (100 messages/day)

- **Input**: 100 × 200 = **20,000 tokens/day**
- **Output**: 100 × 275 = **27,500 tokens/day**

## Monthly Usage (30 days)

- **Input**: 20,000 × 30 = **600,000 tokens/month** = **0.6M tokens**
- **Output**: 27,500 × 30 = **825,000 tokens/month** = **0.825M tokens**

## Monthly Cost Per User

- **Input cost**: 0.6M × $2.00 = **$1.20**
- **Output cost**: 0.825M × $12.00 = **$9.90**
- **Total per user per month: $11.10**

## Cost Breakdown Summary

| Component                             | Tokens/Month | Cost/Month |
| ------------------------------------- | ------------ | ---------- |
| Input (including system instructions) | 0.6M         | $1.20      |
| Output (including thinking)           | 0.825M       | $9.90      |
| **Total**                             | **1.425M**   | **$11.10** |

## Notes

1. **System instructions are expensive**: At 150 tokens per message, they account for 75% of input tokens in this estimate
2. **Output is more expensive**: Output costs 6x more than input ($12 vs $2 per 1M tokens)
3. **Thinking tokens are included**: With `ThinkingLevel.LOW`, thinking tokens are minimal but still counted in output
4. **Conversation history**: If you maintain conversation history across messages, input tokens will be higher
5. **Variable message length**: Actual costs will vary based on:
   - Message length (user input and responses)
   - Conversation history retention
   - Thinking level usage

## Optimization Recommendations

1. **Reduce system instruction size**: Shorten the system prompt if possible
2. **Use context caching**: For repeated system instructions (if available)
3. **Limit conversation history**: Only include recent messages in context
4. **Monitor actual usage**: Track real token counts to refine estimates
