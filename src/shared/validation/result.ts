export type Result<T, E extends Error = Error> =
    | { readonly ok: true; readonly value: T }
    | { readonly ok: false; readonly error: E };

export function ok<T>(value: T): Result<T> {
    return { ok: true, value };
}

export function err<E extends Error>(error: E): Result<never, E> {
    return { ok: false, error };
}
