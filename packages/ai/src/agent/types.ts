import { UIMessageStreamWriter } from 'ai';

export interface Writer {
    write: UIMessageStreamWriter['write'];
    status: (text: string) => void;
}
