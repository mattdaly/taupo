import { useState, type Dispatch, type SetStateAction } from 'react';

export function useLocalStorageState<TType = unknown>(
    key: string,
    initialState?: TType,
): [TType, Dispatch<SetStateAction<TType>>] {
    const [state, setState] = useState<TType>(() => {
        try {
            const localStorageValue = localStorage.getItem(key);

            if (localStorageValue) {
                return JSON.parse(localStorageValue || 'null');
            }

            return initialState;
        } catch {
            // If user is in private mode or has storage restriction
            // localStorage can throw. JSON.parse can throw, too.
            return initialState;
        }
    });

    function set(value: TType | ((prevState: TType) => TType)) {
        try {
            const setter = value as (prevState: TType) => TType;
            const nextValue =
                typeof value === 'function' ? setter(state) : value;
            localStorage.setItem(key, JSON.stringify(nextValue));
            setState(nextValue);
        } catch {
            // If user is in private mode or has storage restriction
            // localStorage can throw. JSON.stringify can throw, too.
        }
    }

    return [state, set];
}
