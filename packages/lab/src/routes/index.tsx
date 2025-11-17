import { createFileRoute, Link } from '@tanstack/react-router';
import { SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/')({
    component: Home,
});

function Home() {
    return (
        <SidebarInset>
            <header className="bg-background sticky top-0 flex h-16 shrink-0 items-center gap-2 border-b px-4 z-10">
                <SidebarTrigger className="-ml-1" />
                <Separator orientation="vertical" className="mr-2 h-4" />
                <h1 className="text-lg font-semibold">Home</h1>
            </header>
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
                <div className="flex flex-col gap-3 text-center max-w-md">
                    <h2 className="text-3xl font-bold">Welcome to Taupo Lab</h2>
                    <p className="text-muted-foreground">
                        Your development environment for building and testing AI
                        agents
                    </p>
                </div>

                <Link to="/agents">
                    <Button size="lg">View Agents</Button>
                </Link>
            </div>
        </SidebarInset>
    );
}
