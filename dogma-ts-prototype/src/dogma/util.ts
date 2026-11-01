// Go types that need a solution for port...

//------------------------------------------------------------------------------

// Context (Go `context.Context`)

// Gemini gave this example:

// const controller = new AbortController();
// const signal = controller.signal;
//
// function fetchData(signal: AbortSignal) {
//     return fetch('some-api-endpoint', { signal });
// }
//
// Later, to cancel
// controller.abort();

// TODO
export type Context = string;

//------------------------------------------------------------------------------

// Error (Go `error`)

// An error type? Could use something like one of those Result<T> or Optional<T> things?
// Throwing `Error` types is pretty standard in TS though...
//
// export type Err = {
//   error(): string;
// };
//
// Or maybe like this?
// export type Err = string | undefined;

//------------------------------------------------------------------------------
