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
    PromptInputBody,
    PromptInputFooter,
    PromptInputSubmit,
    PromptInputTextarea,
} from '@/components/ai-elements/prompt-input';
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input';
import { DefaultChatTransport } from 'ai';
import { useMemo, useState } from 'react';
import {
    Source,
    Sources,
    SourcesContent,
    SourcesTrigger,
} from '@/components/ai-elements/sources';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ServerIcon } from 'lucide-react';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ai-elements/tabs';
import Visualisation from '@/components/taupo/visualisation';
import { AgentInfoNode } from '@taupo/ai';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { AgentHeadersSheet } from '@/components/taupo/agent-headers';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { SavedHeaders } from '@/lib/types';
import { AgentConversation } from '@/components/taupo/agent-conversation';
import { AgentGenerate } from '@/components/taupo/agent-generate';

const HEADER_STORAGE_KEY = 'taupo_headers';

export const Route = createFileRoute('/agents/$name')({
    component: AgentChat,
});

function AgentChat() {
    const { name: agentName } = Route.useParams();
    const [headers, setHeaders] = useLocalStorageState<SavedHeaders>(
        HEADER_STORAGE_KEY,
        {},
    );
    const { data, error, isLoading } = useSWR<AgentInfoNode & { key: string }>(
        `/api/agent/${agentName}/metadata`,
        fetcher,
    );

    return (
        <SidebarInset>
            <Tabs defaultValue="chat" className="w-full gap-0">
                <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10">
                    <SidebarTrigger className="-ml-1" />
                    <Separator orientation="vertical" className="mr-2 h-4" />
                    <h1 className="text-lg font-semibold">
                        {isLoading ? (
                            <span className="animate-pulse bg-gray-300 w-20 h-4">
                                Loading...
                            </span>
                        ) : (
                            data?.name
                        )}
                    </h1>

                    <TabsList className="ml-auto">
                        <TabsTrigger value="chat">Chat</TabsTrigger>
                        <TabsTrigger value="generate">Generate</TabsTrigger>
                        <TabsTrigger value="visualisation">
                            Visualisation
                        </TabsTrigger>
                    </TabsList>
                    <AgentHeadersSheet
                        agent={agentName}
                        headers={headers}
                        setHeaders={setHeaders}
                    >
                        <Tooltip>
                            <TooltipTrigger>
                                <Button variant="secondary" size="icon">
                                    <ServerIcon />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>Configure headers</TooltipContent>
                        </Tooltip>
                    </AgentHeadersSheet>
                </header>

                <div className="flex w-full h-[calc(100vh-4rem)]">
                    <TabsContent value="chat">
                        {isLoading ? null : (
                            <AgentConversation
                                agentName={agentName}
                                headers={headers}
                            />
                        )}
                    </TabsContent>
                    <TabsContent value="generate">
                        {isLoading ? null : (
                            <AgentGenerate
                                agentName={agentName}
                                headers={headers}
                            />
                        )}
                    </TabsContent>
                    <TabsContent
                        value="visualisation"
                        className="h-full w-full"
                    >
                        {isLoading || !data ? null : (
                            <Visualisation agentTree={data} />
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </SidebarInset>
    );
}
