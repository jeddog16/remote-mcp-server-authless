import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Pig Latin logic (plain TypeScript)
// ---------------------------------------------------------------------------
const VOWELS = "aeiou";

function isAlpha(word: string): boolean {
  return /^[a-zA-Z]+$/.test(word);
}

function wordToPigLatin(word: string): string {
  if (!isAlpha(word)) return word; // leave numbers/punctuation alone
  const lower = word.toLowerCase();

  let pig: string;
  if (VOWELS.includes(lower[0])) {
    pig = lower + "way";
  } else {
    let i = 0;
    while (i < lower.length && !VOWELS.includes(lower[i])) i++;
    pig = lower.slice(i) + lower.slice(0, i) + "ay";
  }

  // preserve capitalization of the original first letter
  const wasUpper = word[0] === word[0].toUpperCase();
  return wasUpper ? pig.charAt(0).toUpperCase() + pig.slice(1) : pig;
}

function wordFromPigLatin(word: string): string {
  if (!isAlpha(word)) return word;
  const lower = word.toLowerCase();

  let result = word;
  if (lower.endsWith("way")) {
    result = word.slice(0, -3);
  } else if (lower.endsWith("ay") && word.length > 2) {
    const body = word.slice(0, -2);            // drop trailing "ay"
    result = body.slice(-1) + body.slice(0, -1); // move last letter to front
  }

  const wasUpper = word[0] === word[0].toUpperCase();
  return wasUpper
    ? result.charAt(0).toUpperCase() + result.slice(1).toLowerCase()
    : result.toLowerCase();
}

function toPigLatin(text: string): string {
  return text.split(" ").map(wordToPigLatin).join(" ");
}

function fromPigLatin(text: string): string {
  return text.split(" ").map(wordFromPigLatin).join(" ");
}

// ---------------------------------------------------------------------------
// MCP server definition
// ---------------------------------------------------------------------------
export class MyMCP extends McpAgent {
  server = new McpServer({
    name: "Pig Latin",
    version: "1.0.0",
  });

  async init() {
    this.server.tool(
      "to_pig_latin",
      "Translate ordinary English text into Pig Latin, word by word. " +
        "Punctuation and numbers are left unchanged.",
      { text: z.string() },
      async ({ text }) => ({
        content: [{ type: "text", text: toPigLatin(text) }],
      })
    );

    this.server.tool(
      "from_pig_latin",
      "Translate Pig Latin text back into approximate English. Best-effort: " +
        "words ending in 'way' decode reliably; others assume one moved consonant.",
      { text: z.string() },
      async ({ text }) => ({
        content: [{ type: "text", text: fromPigLatin(text) }],
      })
    );
  }
}

// ---------------------------------------------------------------------------
// Worker entry point — routes /mcp (and /sse) to the MCP server
// ---------------------------------------------------------------------------
export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    const url = new URL(request.url);

    if (url.pathname === "/sse" || url.pathname === "/sse/message") {
      return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
    }

    if (url.pathname === "/mcp") {
      return MyMCP.serve("/mcp").fetch(request, env, ctx);
    }

    return new Response("Pig Latin MCP server. Connect an MCP client to /mcp", {
      status: 200,
    });
  },
};
