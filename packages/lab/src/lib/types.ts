export interface Header {
    name: string;
    value: string;
    enabled: boolean;
}

export interface SavedHeaders {
    [name: string]: Header[];
}
