import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
} from '@/components/ui/card';

interface Agent {
    key: string;
    name: string;
    capabilities: string;
    type: string;
    model?: string;
}

export const Route = createFileRoute('/agents/')({
    component: Agents,
});

function Agents() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetch('/api/agents')
            .then(res => res.json())
            .then(data => {
                if (data.agents) {
                    setAgents(data.agents);
                }
                setIsLoading(false);
            })
            .catch(err => {
                console.error('Failed to load agents:', err);
                setIsLoading(false);
            });
    }, []);

    return (
        <SidebarInset>
            <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <h1 className="text-lg font-semibold">Agents</h1>
            </header>

            <div className="flex-1 p-6">
                {isLoading ? (
                    <div className="text-center text-muted-foreground">
                        Loading agents...
                    </div>
                ) : agents.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                        No agents available
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {agents.map(agent => (
                            <Card
                                key={agent.key}
                                className="cursor-pointer hover:bg-accent transition-colors"
                                onClick={() =>
                                    navigate({ to: '/agents/$name', params: { name: agent.key } })
                                }
                            >
                                <CardHeader>
                                    <CardTitle>{agent.name}</CardTitle>
                                    <CardDescription>
                                        {agent.model && (
                                            <div className="text-xs mb-2">
                                                Model: {agent.model}
                                            </div>
                                        )}
                                        <div className="text-xs mb-1">
                                            Type: {agent.type}
                                        </div>
                                        {agent.capabilities && (
                                            <div className="text-xs mt-2">
                                                <div className="font-medium mb-1">
                                                    Capabilities:
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {agent.capabilities}
                                                </div>
                                            </div>
                                        )}
                                    </CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </SidebarInset>
    );
}

