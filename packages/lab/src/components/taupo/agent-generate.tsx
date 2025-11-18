import {
    type ChangeEvent,
    type DragEvent,
    type FormEvent,
    useState,
} from 'react';
import { type SavedHeaders } from '@/lib/types';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ai-elements/tabs';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import {
    CheckIcon,
    CopyIcon,
    Loader2Icon,
    TrashIcon,
    UploadIcon,
} from 'lucide-react';

interface AgentChatProps {
    agentName: string;
    headers: SavedHeaders;
}

export function AgentGenerate(props: AgentChatProps) {
    const { agentName, headers } = props;
    const agentUrl = `/api/agent/${agentName}/generate`;

    const enabledHeaders =
        headers[agentName]
            ?.filter(h => h.enabled && h.name && h.value)
            .reduce((acc, h) => ({ ...acc, [h.name]: h.value }), {}) ?? {};

    const [inputMode, setInputMode] = useState<string>('json');
    const [jsonInput, setJsonInput] = useState(`{
    "prompt": ""
}`);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [response, setResponse] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleJsonChange(e: ChangeEvent<HTMLTextAreaElement>) {
        setJsonInput(e.target.value);
    }

    function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    }

    function handleDragOver(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(true);
    }

    function handleDragLeave(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
        e.preventDefault();
        setIsDragging(false);

        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
        }
    }

    function clearFile() {
        setSelectedFile(null);
    }

    function clearResponse() {
        setResponse(null);
        setError(null);
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (!agentUrl) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            let fetchOptions: RequestInit;

            if (inputMode === 'json') {
                if (!jsonInput.trim()) {
                    throw new Error('Please enter JSON data');
                }

                // Validate JSON
                try {
                    JSON.parse(jsonInput);
                } catch {
                    throw new Error('Invalid JSON format');
                }

                fetchOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...enabledHeaders,
                    },
                    body: jsonInput,
                };
            } else {
                if (!selectedFile) {
                    throw new Error('Please select a file');
                }

                const formData = new FormData();
                formData.append('file', selectedFile);

                fetchOptions = {
                    method: 'POST',
                    headers: enabledHeaders,
                    body: formData,
                };
            }

            const res = await fetch(agentUrl, fetchOptions);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error || `Request failed with status ${res.status}`,
                );
            }

            setResponse(JSON.stringify(data, null, 2));
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'An unknown error occurred',
            );
        } finally {
            setIsLoading(false);
        }
    }

    async function copyResponse() {
        if (!response) return;

        try {
            await navigator.clipboard.writeText(response);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    }

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left Panel - Input */}
            <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="p-4 flex-1 flex flex-col min-h-0">
                    <form
                        onSubmit={handleSubmit}
                        className="flex-1 flex flex-col min-h-0"
                    >
                        <Tabs
                            defaultValue="chat"
                            className="w-full gap-0"
                            value={inputMode}
                            onValueChange={setInputMode}
                        >
                            <TabsList className="ml-auto mb-4">
                                <TabsTrigger value="json">JSON</TabsTrigger>
                                <TabsTrigger value="file">File</TabsTrigger>
                            </TabsList>
                            <TabsContent value="json">
                                <textarea
                                    value={jsonInput}
                                    onChange={handleJsonChange}
                                    className="flex-1 w-full p-4 text-sm font-mono border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring min-h-[200px]"
                                    disabled={isLoading}
                                />
                            </TabsContent>
                            <TabsContent value="file">
                                {!selectedFile ? (
                                    <div
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors w-full ${
                                            isDragging
                                                ? 'border-primary bg-primary/5'
                                                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                                        }`}
                                    >
                                        <UploadIcon className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                                        <p className="text-sm text-muted-foreground mb-2">
                                            Drag and drop a file here, or click
                                            to browse
                                        </p>
                                        <input
                                            type="file"
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="file-upload"
                                            disabled={isLoading}
                                        />
                                        <Button
                                            type="button"
                                            onClick={() =>
                                                document
                                                    .getElementById(
                                                        'file-upload',
                                                    )
                                                    ?.click()
                                            }
                                            disabled={isLoading}
                                        >
                                            Browse Files
                                        </Button>
                                    </div>
                                ) : (
                                    <Card className="p-4 w-full">
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {(
                                                        selectedFile.size / 1024
                                                    ).toFixed(2)}{' '}
                                                    KB •{' '}
                                                    {selectedFile.type ||
                                                        'Unknown type'}
                                                </p>
                                            </div>
                                            <Button
                                                type="button"
                                                onClick={clearFile}
                                                disabled={isLoading}
                                                size="icon"
                                                variant="destructive"
                                            >
                                                <TrashIcon />
                                            </Button>
                                        </div>
                                    </Card>
                                )}
                            </TabsContent>
                        </Tabs>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full mt-4"
                        >
                            {isLoading ? 'Sending...' : 'Send'}
                        </Button>
                    </form>
                </div>
            </div>

            <div className="w-1/2 flex flex-col overflow-hidden">
                <div className="p-4 flex-1 flex flex-col min-h-0">
                    {error ? (
                        <div className="bg-red-50 border border-red-200 h-full w-full rounded-sm p-4 overflow-auto relative">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="text-sm font-semibold text-destructive mb-1">
                                        Error
                                    </div>
                                    <div className="text-sm text-destructive/90">
                                        {error}
                                    </div>
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={clearResponse}
                                >
                                    <TrashIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 border border-gray-200 h-full w-full rounded-sm p-4 overflow-auto relative">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center my-8">
                                    <Loader2Icon className="h-8 w-8 animate-spin mx-auto mb-2" />
                                    <p className="text-sm">
                                        Awaiting response...
                                    </p>
                                </div>
                            ) : response ? (
                                <>
                                    <div className="flex gap-2 absolute top-2 right-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={copyResponse}
                                        >
                                            {copied ? (
                                                <CheckIcon className="h-4 w-4" />
                                            ) : (
                                                <CopyIcon className="h-4 w-4" />
                                            )}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            onClick={clearResponse}
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <pre className="text-xs font-mono rounded-md whitespace-pre-wrap break-all">
                                        {response}
                                    </pre>
                                </>
                            ) : (
                                <p className="text-sm my-8 text-center text-gray-900">
                                    Response will appear here
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
