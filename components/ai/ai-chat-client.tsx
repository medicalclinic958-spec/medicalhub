// components/ai/ai-chat-client.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import axios from "axios";
import { Send, Trash2, X, Image as ImageIcon, Sparkles, User } from "lucide-react";
import { Button } from "@/components/ui";
import { useSession } from "next-auth/react";
import { formatAIResponse } from "@/lib/ai/ai-utils";
import { toast } from "sonner";

interface Message {
    role: "user" | "assistant";
    content: string;
    imageBase64?: string;
}

export function AIChatClient() {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const userId = session?.user?.id || "anonymous";
    const storageKey = `ai_chat_${userId}`;
    const userName = session?.user?.fullName || "User";

    useEffect(() => {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
            } catch { }
        }
    }, [storageKey]);

    useEffect(() => {
        if (messages.length > 0) localStorage.setItem(storageKey, JSON.stringify(messages));
    }, [messages, storageKey]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const chatMutation = useMutation({
        mutationFn: (data: { messages: Message[]; imageBase64?: string }) =>
            axios.post("/api/ai/chat", data).then(r => r.data),
        onSuccess: (data) => {
            setMessages(prev => [...prev, { role: "assistant", content: data.data.response }]);
        },
        onError: () => {
            setMessages(prev => [...prev, { role: "assistant", content: "Sorry, I'm having trouble responding. Please try again." }]);
            toast.error("Failed to get response. Please try again.");
        },
    });

    const handleSend = () => {
        if (!input.trim() && !imageBase64) return;
        const userMessage: Message = {
            role: "user",
            content: input.trim() || "Analyze this image",
            ...(imageBase64 && { imageBase64 }),
        };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setImagePreview(null);
        setImageBase64(null);
        chatMutation.mutate({ messages: updatedMessages, ...(imageBase64 && { imageBase64 }) });
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new window.Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement("canvas");
                const maxSize = 800;
                let { width, height } = img;
                if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
                else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d");
                ctx?.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL("image/jpeg", 0.3);
                const base64Data = compressedBase64.split(",")[1];
                setImageBase64(base64Data);
                setImagePreview(compressedBase64);
            };
        };
        reader.readAsDataURL(file);
    };

    const clearChat = () => {
        setMessages([]);
        localStorage.removeItem(storageKey);
    };

    return (
        <div className="space-y-4 h-[calc(100vh-110px)] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
                    <p className="text-xs text-gray-500 mt-0.5">Your intelligent clinic companion</p>
                </div>
                <Button variant="secondary" size="sm" onClick={clearChat}>
                    <Trash2 className="w-3.5 h-3.5" /> New Chat
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mb-3">
                            <Sparkles className="w-6 h-6 text-teal-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-700">
                            Hey {userName}, how can I help you?
                        </p>
                        <p className="text-xs text-gray-400 mt-1 max-w-sm">
                            Ask me about patient records, appointments, prescriptions, or any clinic-related queries.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : ""}`}>
                        {msg.role === "assistant" && (
                            <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mt-1">
                                <Sparkles className="w-3 h-3 text-white" />
                            </div>
                        )}
                        <div className={`max-w-[80%] rounded-lg px-3 py-2 text-xs ${
                            msg.role === "user"
                                ? "bg-teal-600 text-white"
                                : "bg-gray-100 text-gray-700"
                        }`}>
                            {msg.imageBase64 && (
                                <img
                                    src={`data:image/jpeg;base64,${msg.imageBase64}`}
                                    alt="Uploaded"
                                    className="max-w-[200px] rounded mb-2"
                                />
                            )}
                            {msg.role === "assistant" ? (
                                <div className="ai-response" dangerouslySetInnerHTML={{ __html: formatAIResponse(msg.content) }} />
                            ) : (
                                <p className="whitespace-pre-wrap">{msg.content}</p>
                            )}
                        </div>
                        {msg.role === "user" && (
                            <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center shrink-0 mt-1">
                                <User className="w-3 h-3 text-gray-500" />
                            </div>
                        )}
                    </div>
                ))}

                {chatMutation.isPending && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-teal-600 flex items-center justify-center shrink-0 mt-1">
                            <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <div className="bg-gray-100 rounded-lg px-3 py-2">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" />
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.1s]" />
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]" />
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Image Preview */}
            {imagePreview && (
                <div className="relative inline-block">
                    <img src={imagePreview} alt="Preview" className="h-14 rounded-lg border border-gray-300" />
                    <button
                        onClick={() => { setImagePreview(null); setImageBase64(null); }}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center cursor-pointer"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}

            {/* Input */}
            <div className="flex items-end gap-2 bg-white border border-gray-300 rounded-lg p-2">
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-1.5 text-gray-400 rounded cursor-pointer"
                >
                    <ImageIcon className="w-4 h-4" />
                </button>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                />
                <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 resize-none outline-none text-xs py-1.5 max-h-32 text-gray-700 placeholder:text-gray-400"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() && !imageBase64}
                    className="p-1.5 bg-teal-600 text-white rounded-lg disabled:opacity-50 cursor-pointer"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}