import { createFileRoute, useNavigate } from '@tanstack/react-router';
import useSWR from 'swr';
import { fetcher } from '@/lib/utils';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { AgentInfoNode } from '@taupo/ai';
import { Badge } from '@/components/ui/badge';

type AgentInfoNodeWithKey = AgentInfoNode & { key: string };

export const Route = createFileRoute('/agents/')({
    component: Agents,
});

function Agents() {
    const navigate = useNavigate();
    const { data, error, isLoading } = useSWR<{
        agents: AgentInfoNodeWithKey[];
    }>(`/api/agents`, fetcher);

    return (
        <SidebarInset>
            <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <h1 className="text-lg font-semibold">Agents</h1>
            </header>

            <div className="flex-1 p-6">
                {error ? (
                    <div className="text-center text-muted-foreground">
                        {error.message}
                    </div>
                ) : isLoading ? (
                    <div className="text-center text-muted-foreground">
                        Loading agents...
                    </div>
                ) : data?.agents.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                        No agents available
                    </div>
                ) : (
                    <div className="w-full overflow-auto border rounded-md">
                        <table className="w-full caption-bottom text-sm text-left">
                            <thead className="[&_tr]:border-b bg-muted/50">
                                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                        Name
                                    </th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                        Capabilities
                                    </th>
                                    <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                                        Model
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="[&_tr:last-child]:border-0">
                                {data?.agents.map(agent => (
                                    <tr
                                        key={agent.key}
                                        className="border-b transition-colors hover:bg-muted/50 cursor-pointer"
                                        onClick={() =>
                                            navigate({
                                                to: '/agents/$name',
                                                params: { name: agent.key },
                                            })
                                        }
                                    >
                                        <td className="p-4 align-middle font-medium">
                                            {agent.name}
                                        </td>
                                        <td className="p-4 align-middle text-muted-foreground">
                                            {agent.capabilities || '-'}
                                        </td>
                                        <td className="p-4 align-middle">
                                            <Badge variant="outline">
                                                {agent.model}
                                            </Badge>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </SidebarInset>
    );
}
