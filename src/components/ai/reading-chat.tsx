'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Loader2,
  Sparkles,
  BookOpen,
  BarChart3,
  HelpCircle,
  X
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SUGGESTED_PROMPTS = [
  { icon: BarChart3, text: "What are my reading stats this year?" },
  { icon: BookOpen, text: "What should I read next from my list?" },
  { icon: Sparkles, text: "What patterns do you see in my reading?" },
  { icon: HelpCircle, text: "Which of my books had the best ratings?" },
];

export function ReadingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', content: content.trim() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          history: messages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Include details in error message if available
        const errorMsg = data.details || data.error || 'Failed to get response';
        throw new Error(errorMsg);
      }

      const assistantMessage: Message = { role: 'assistant', content: data.reply };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestedPrompt = (text: string) => {
    sendMessage(text);
  };

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 p-4 bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-violet-500/25 hover:scale-105 transition-all group"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        <span className="absolute inset-0 rounded-full bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </button>
    );
  }

  // Chat panel when open
  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] animate-in slide-in-from-bottom-4 duration-300">
      <Card className="border-0 shadow-2xl overflow-hidden">
        {/* Header */}
        <CardHeader className="bg-gradient-to-r from-violet-500 to-purple-600 text-white p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              Ask About My Reading
            </CardTitle>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <p className="text-sm text-violet-100 mt-1">
            Chat about your books, stats, and reading journey
          </p>
        </CardHeader>

        <CardContent className="p-0">
          {/* Messages Area */}
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-muted/30">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="text-center text-muted-foreground text-sm py-4">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Ask me anything about your reading!</p>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground px-1">Try asking:</p>
                  {SUGGESTED_PROMPTS.map((prompt, index) => (
                    <button
                      key={index}
                      onClick={() => handleSuggestedPrompt(prompt.text)}
                      className="w-full flex items-center gap-2 p-2 text-sm text-left rounded-lg bg-card hover:bg-accent/50 transition-colors border border-border"
                    >
                      <prompt.icon className="h-4 w-4 text-violet-500 flex-shrink-0" />
                      <span className="text-foreground">{prompt.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-br-md'
                          : 'bg-card text-foreground rounded-bl-md shadow-sm border border-border'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-card p-3 rounded-2xl rounded-bl-md shadow-sm border border-border">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
                    </div>
                  </div>
                )}
                {error && (
                  <div className="text-center text-sm py-2 px-4">
                    <p className="text-red-500 dark:text-red-400">{error}</p>
                    {error.includes('quota') || error.includes('usage limit') ? (
                      <a 
                        href="https://platform.openai.com/settings/organization/billing/overview"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Check OpenAI Billing →
                      </a>
                    ) : null}
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-border bg-card">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your reading..."
                disabled={isLoading}
                className="flex-1 px-4 py-2 text-sm bg-input text-foreground rounded-full border-0 focus:ring-2 focus:ring-violet-500 focus:outline-none placeholder:text-muted-foreground"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!input.trim() || isLoading}
                className="rounded-full px-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
