// app/api/ai/chat/route.ts
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import { apiSuccess, apiError } from "@/lib/utils";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NEXT_PUBLIC_CLINIC_NAME } from "@/constants/ClinicDetails";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export async function POST(req: NextRequest) {
    const session = await auth();
    if (!session) return apiError("Unauthorized", 401);

    try {
        const body = await req.json();
        const { messages, imageBase64 } = body as {
            messages: ChatMessage[];
            imageBase64?: string;
        };

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return apiError("Messages are required", 400);
        }

        // Build dynamic system prompt from session
        const userName = session.user.fullName || session.user.name || "User";
        const userRole = session.user.role || "Staff";
        const systemPrompt = `You are a helpful AI assistant in a clinic or hospital management system ${NEXT_PUBLIC_CLINIC_NAME || 'ClinicHms'}.

Current User Information:
- Name: ${userName}
- Role: ${userRole}
- Permissions: ${(session.user.permissions as string[])?.join(", ") || "None"}

Adapt your responses based on the user's role:
- Doctor/Nurse: Provide professional medical information, clinical guidelines, differential diagnoses, and treatment considerations. Always include a disclaimer.
- Pharmacist: Focus on pharmaceutical information, drug interactions, dosage, and pharmacy management.
- Lab Staff: Help with laboratory procedures, test interpretation concepts, and quality control.
- Receptionist: Assist with patient communication, scheduling, and front-desk tasks. Keep responses non-medical.
- Accountant: Provide financial and billing-related guidance.
- Admin: Provide full system assistance across all domains.

Guidelines:
- Be concise, professional, and helpful.
- Match the user's expertise level based on their role.
- Never prescribe medications directly.
- For medical queries, always remind to verify with clinical judgment.
- Format with bullet points for lists and clear structure.`;

        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
        });

        // Build conversation history (last 20 messages)
        const history = messages.slice(-20).map(msg => ({
            role: msg.role === "assistant" ? "model" : "user",
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({ history: history.slice(0, -1) });

        let result;
        const lastMessage = messages[messages.length - 1];

        if (imageBase64 && lastMessage.role === "user") {
            const imageParts = [
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: imageBase64,
                    },
                },
            ];
            result = await chat.sendMessage([
                { text: lastMessage.content },
                ...imageParts,
            ]);
        } else {
            result = await chat.sendMessage(lastMessage.content);
        }

        const response = result.response.text();

        return apiSuccess({ response });
    } catch (error: any) {
        console.error("AI Chat Error:", error);
        return apiError(
            error?.message || "AI service temporarily unavailable. Please try again.",
            500
        );
    }
}