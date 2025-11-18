import { Dispatch, SetStateAction, useMemo, useState } from 'react';
import { DefaultChatTransport } from 'ai';
import { useChat } from '@ai-sdk/react';
import { Conversation } from '@/components/ai-elements/conversation';
import {
    Message,
    MessageContent,
    MessageResponse,
} from '@/components/ai-elements/message';
import {
    PromptInput,
    PromptInputBody,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from '@/components/ai-elements/sources';
import { SavedHeaders } from '@/lib/types';

interface AgentChatProps {
    agentName?: string;
    headers: SavedHeaders;
}

export function AgentConversation(props: AgentChatProps) {
    const { agentName, headers } = props;

    const transport = useMemo(() => {
        if (!agentName) return undefined;

        const enabledHeaders =
            headers[agentName]
                ?.filter(h => h.enabled && h.name && h.value)
                .reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}) ?? {};

        return new DefaultChatTransport({
            api: `/api/agent/${agentName}/chat`,
            headers: enabledHeaders,
        });
    }, [agentName, headers]);

    const { messages, sendMessage, status } = useChat({
        transport,
        onError: (error: Error) => {
            console.error('Chat error:', error);
        },
    });

    const isStreaming = status === 'submitted' || status === 'streaming';

    const [text, setText] = useState('');

    const handleSubmit = (message: PromptInputMessage) => {
        const hasText = Boolean(message.text);
        const hasAttachments = Boolean(message.files?.length);

        if (!(hasText || hasAttachments)) {
            return;
        }

        sendMessage(message);
        setText('');
    };

    return (
        <div className="flex flex-1 flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4">
                <Conversation>
                    {messages.map(message => (
                        <Message key={message.id} from={message.role}>
                            <MessageContent>
                                {(() => {
                                    const sourceParts = message.parts.filter(
                                        part => part.type === 'source-url',
                                    );
                                    const otherParts = message.parts.filter(
                                        part => part.type !== 'source-url',
                                    );
                                    const hasSources = sourceParts.length > 0;

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
                                                            (part, index) => (
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
                                            {otherParts.map((part, index) => {
                                                switch (part.type) {
                                                    case 'text':
                                                        return (
                                                            <MessageResponse
                                                                key={index}
                                                            >
                                                                {part.text}
                                                            </MessageResponse>
                                                        );

                                                    default:
                                                        return null;
                                                }
                                            })}
                                        </>
                                    );
                                })()}
                            </MessageContent>
                        </Message>
                    ))}

                    {isStreaming && <Message from="assistant" children="..." />}
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
    );
}
