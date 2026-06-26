// lib/ai-utils.ts

/**
 * Converts AI response text into clean, formatted HTML
 * Handles markdown from Gemini: bold, italic, lists, code, links, etc.
 */
export function formatAIResponse(text: string): string {
    if (!text) return "";

    let formatted = text;

    // Escape HTML first to prevent injection
    formatted = formatted
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Bold: **text** or __text__
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/__(.+?)__/g, "<strong>$1</strong>");

    // Italic: *text* or _text_
    formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");
    formatted = formatted.replace(/_(.+?)_/g, "<em>$1</em>");

    // Inline code: `text`
    formatted = formatted.replace(/`(.+?)`/g, "<code class='bg-slate-200 px-1 py-0.5 rounded text-sm font-mono text-slate-800'>$1</code>");

    // Code blocks: ```text```
    formatted = formatted.replace(/```([\s\S]*?)```/g, "<pre class='bg-slate-800 text-slate-100 p-4 rounded-xl overflow-x-auto my-3 text-sm'><code>$1</code></pre>");

    // Headers: ### text
    formatted = formatted.replace(/^### (.+)$/gm, "<h4 class='text-sm font-semibold text-slate-800 mt-4 mb-2'>$1</h4>");
    formatted = formatted.replace(/^## (.+)$/gm, "<h3 class='text-base font-semibold text-slate-800 mt-4 mb-2'>$1</h3>");
    formatted = formatted.replace(/^# (.+)$/gm, "<h2 class='text-lg font-bold text-slate-800 mt-4 mb-2'>$1</h2>");

    // Unordered lists: - item or * item
    formatted = formatted.replace(/^[\-\*] (.+)$/gm, "<li class='ml-4 list-disc text-slate-700'>$1</li>");

    // Ordered lists: 1. item
    formatted = formatted.replace(/^\d+\. (.+)$/gm, "<li class='ml-4 list-decimal text-slate-700'>$1</li>");

    // Wrap consecutive list items in ul/ol
    formatted = formatted.replace(/(<li class='ml-4 list-disc[^']*'>.*?<\/li>)\n(?=<li class='ml-4 list-disc')/g, "$1");
    formatted = formatted.replace(/(<li class='ml-4 list-decimal[^']*'>.*?<\/li>)\n(?=<li class='ml-4 list-decimal')/g, "$1");

    // Horizontal rules
    formatted = formatted.replace(/^---$/gm, "<hr class='my-3 border-slate-200' />");

    // Links: [text](url)
    formatted = formatted.replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' target='_blank' class='text-blue-600 hover:underline'>$1</a>");

    // Paragraphs: double line breaks
    const paragraphs = formatted.split("\n\n");
    formatted = paragraphs.map(p => {
        const trimmed = p.trim();
        if (!trimmed) return "";
        // Skip if already wrapped in HTML block elements
        if (trimmed.startsWith("<pre") || trimmed.startsWith("<h") || trimmed.startsWith("<li") || trimmed.startsWith("<hr")) {
            return trimmed;
        }
        // Wrap remaining lines in paragraphs
        return `<p class='text-slate-700 leading-relaxed'>${trimmed.replace(/\n/g, "<br />")}</p>`;
    }).join("");

    // Clean up empty paragraphs
    formatted = formatted.replace(/<p class='text-slate-700 leading-relaxed'><\/p>/g, "");

    return formatted;
}

/**
 * Simple version - just handles line breaks and basic formatting
 * Use this if you want a lighter version
 */
export function formatAIResponseSimple(text: string): string {
    if (!text) return "";

    let formatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // Bold
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

    // Italic
    formatted = formatted.replace(/\*(.+?)\*/g, "<em>$1</em>");

    // Line breaks
    formatted = formatted.replace(/\n\n/g, "<br /><br />");
    formatted = formatted.replace(/\n/g, "<br />");

    return formatted;
}