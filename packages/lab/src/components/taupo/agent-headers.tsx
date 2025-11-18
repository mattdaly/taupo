import { Dispatch, SetStateAction } from 'react';
import { PlusIcon, TrashIcon } from 'lucide-react';
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Header, SavedHeaders } from '@/lib/types';

interface AgentHeadersSheetProps {
    agent: string;
    children: React.ReactNode;
    headers: SavedHeaders;
    setHeaders: Dispatch<SetStateAction<SavedHeaders>>;
}
export function AgentHeadersSheet(props: AgentHeadersSheetProps) {
    const { agent, children, headers, setHeaders } = props;

    function addHeader() {
        setHeaders(currentHeaders => ({
            ...currentHeaders,
            [agent]: [
                ...(currentHeaders[agent] || []),
                {
                    name: '',
                    value: '',
                    enabled: true,
                },
            ],
        }));
    }

    function updateHeader(name: string, updates: Partial<Header>) {
        setHeaders(currentHeaders => ({
            ...currentHeaders,
            [agent]: currentHeaders[agent]?.map(header =>
                header.name === name ? { ...header, ...updates } : header,
            ),
        }));
    }

    function deleteHeader(name: string) {
        setHeaders(currentHeaders => ({
            ...currentHeaders,
            [agent]: currentHeaders[agent]?.filter(
                header => header.name !== name,
            ),
        }));
    }

    return (
        <Sheet>
            <SheetTrigger>{children}</SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Configure headers</SheetTitle>
                    <SheetDescription>
                        Send headers along with agent requests.
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-3 px-4 overflow-y-auto">
                    {headers[agent]?.map(header => (
                        <Card key={header.name} className="p-3 border-grey-300">
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center text-xs">
                                        <Switch
                                            className="mr-2"
                                            checked={header.enabled}
                                            onCheckedChange={checked =>
                                                updateHeader(header.name, {
                                                    enabled: checked,
                                                })
                                            }
                                        />
                                        Enabled
                                    </div>
                                    <Button
                                        variant="destructive"
                                        size="icon"
                                        onClick={() =>
                                            deleteHeader(header.name)
                                        }
                                    >
                                        <TrashIcon />
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    <Input
                                        type="text"
                                        value={header.name}
                                        onChange={e =>
                                            updateHeader(header.name, {
                                                name: e.target.value,
                                            })
                                        }
                                        placeholder="Header name"
                                        className="text-sm"
                                    />
                                    <Input
                                        type="text"
                                        value={header.value}
                                        onChange={e =>
                                            updateHeader(header.name, {
                                                value: e.target.value,
                                            })
                                        }
                                        placeholder="Header value"
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
                <SheetFooter>
                    <Button
                        variant="secondary"
                        className="w-full"
                        onClick={addHeader}
                    >
                        Add header <PlusIcon />
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
