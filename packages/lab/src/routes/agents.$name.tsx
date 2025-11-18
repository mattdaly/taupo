import { createFileRoute } from '@tanstack/react-router';
import { useChat } from '@ai-sdk/react';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Conversation } from '@/components/ai-elements/conversation';
import {
    Message,
    MessageContent,
    MessageResponse,
} from '@/components/ai-elements/message';
import {
    PromptInput,
    PromptInputAttachment,
    PromptInputAttachments,
    PromptInputBody,
    PromptInputFooter,
    PromptInputHeader,
    PromptInputSubmit,
    PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { DefaultChatTransport } from 'ai';
import { useState } from 'react';
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from '@/components/ai-elements/sources';

export const Route = createFileRoute('/agents/$name')({
    component: AgentChat,
});

function AgentChat() {
    const { name: agentName } = Route.useParams();
    const { messages, sendMessage, status } = useChat({
        transport: new DefaultChatTransport({
            api: `/api/agent/${agentName}/chat`,
        }),
        onError: (error: Error) => {
            console.error('Chat error:', error);
        },
    });

    const isLoading = status === 'submitted' || status === 'streaming';

    const [text, setText] = useState('');

    const handleSubmit = (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);

        if (!(hasText || hasAttachments)) {
            return;
        }

        sendMessage(message);
    };

    return (
        <SidebarInset>
            <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <h1 className="text-lg font-semibold">{agentName}</h1>
            </header>

            <div className="flex flex-1 flex-col h-[calc(100vh-4rem)]">
                <div className="flex-1 overflow-y-auto p-4">
                    <Conversation>
                        {messages.map(message => (
                            <Message key={message.id} from={message.role}>
                                <MessageContent>
                                    {(() => {
                                        const sourceParts =
                                            message.parts.filter(
                                                part =>
                                                    part.type === 'source-url',
                                            );
                                        const otherParts = message.parts.filter(
                                            part => part.type !== 'source-url',
                                        );
                                        const hasSources =
                                            sourceParts.length > 0;

                                        return (
                                            <>
                                                {hasSources && (
                                                    <Sources
                                                        key={`${message.id}-sources`}
                                                    >
                                                        <SourcesTrigger
                                                            count={
                                                                sourceParts.length
                                                            }
                                                        />
                                                        <SourcesContent>
                                                            {sourceParts.map(
                                                                (
                                                                    part,
                                                                    index,
                                                                ) => (
                                                                    <Source
                                                                        key={`${message.id}-source-${index}`}
                                                                        href={
                                                                            part.url
                                                                        }
                                                                        title={
                                                                            part.title ||
                                                                            part.url
                                                                        }
                                                                    />
                                                                ),
                                                            )}
                                                        </SourcesContent>
                                                    </Sources>
                                                )}
                                                {otherParts.map(
                                                    (part, index) => {
                                                        switch (part.type) {
                                                            case 'text':
                                                                return (
                                                                    <MessageResponse
                                                                        key={
                                                                            index
                                                                        }
                                                                    >
                                                                        {
                                                                            part.text
                                                                        }
                                                                    </MessageResponse>
                                                                );

                                                            default:
                                                                return null;
                                                        }
                                                    },
                                                )}
                                            </>
                                        );
                                    })()}
                                </MessageContent>
                            </Message>
                        ))}

                        {isLoading && (
                            <Message from="assistant" children="..." />
                        )}
                    </Conversation>
                </div>

                <div className="border-t p-4">
                    <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                        <PromptInputBody>
                            <PromptInputTextarea
                                onChange={event => setText(event.target.value)}
                                value={text}
                            />
                        </PromptInputBody>
                        <PromptInputFooter>
                            <PromptInputSubmit
                                disabled={
                                    !(text.trim() || status) ||
                                    status === 'streaming'
                                }
                                className="ml-auto"
                                status={status}
                            />
                        </PromptInputFooter>
                    </PromptInput>
                </div>
            </div>
        </SidebarInset>
    );
}
