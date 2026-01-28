# effect-react-query

Type-safe integration between [Effect](https://effect.website/) and [TanStack React Query](https://tanstack.com/query/latest).

## Installation

```bash
npm install effect-tanstack-query
```

## Quick Start

```ts
import { make } from "effect-tanstack-query"
import { ApiClient } from "./api/client"

// Create runtime and hooks from a layer
const eq = make(ApiClient.Default)

// Wrap your app
function Root() {
	return <eq.RuntimeProvider>{children}</eq.RuntimeProvider>
}

// Create typed query options
import { makeOptions } from "effect-tanstack-query"
const options = makeOptions<ApiClient>()
```

## Main APIs

### `make(layer)`

Creates a runtime provider and React hooks from a layer. Returns:

-   `RuntimeProvider` - React component to wrap your app
-   `useQuery` - Standard query hook
-   `useSuspenseQuery` - Suspense query hook (returns `Either`)
-   `useMutation` - Mutation hook
-   `toQueryOptions` - Convert to regular `QueryOptions`

```ts
const eq = make(ApiClient.Default)
```

### `makeOptions<R>()`

Creates typed helpers for building query and mutation options.

```ts
const options = makeOptions<ApiClient>()

const todosQueryOptions = options.queryOptions({
	queryKey: ["todos"],
	queryFn: () => ApiClient.pipe(Effect.flatMap((client) => client.todos.getAll())),
	schema: Schema.Array(Todo),
})
```

### Hooks

**`useQuery`** - Standard queries with loading/error states

**`useSuspenseQuery`** - Suspense queries that return `Either` for error handling:

```ts
const todos = eq.useSuspenseQuery(todosQueryOptions).pipe(
	Either.map(({ data }) => data),
	Either.getOrElse(() => [] as Todo[])
)
```

**`useMutation`** - Mutations with Effect-based mutationFn

### `toQueryOptions`

Convert to regular QueryOptions for use with a queryClient:

```ts
async loader({ context }) {
  await context.queryClient.prefetchQuery(
    eq.toQueryOptions(todosQueryOptions, runtime)
  )
}
```

## Complete Example

This is an example with [Tanstack Start](https://tanstack.com/start/latest)

```ts
// 1. Setup (lib/effect-react-query/index.ts)
import { make } from "effect-tanstack-query"
import { ApiClient } from "../api/client"

export const eq = make(ApiClient.Default)

// 2. Wrap app (routes/__root.tsx)
function Root() {
	return <eq.RuntimeProvider>{children}</eq.RuntimeProvider>
}

// 3. Create query options (routes/index.tsx)
import { makeOptions } from "effect-tanstack-query"
import { Effect, Schema } from "effect"

const options = makeOptions<ApiClient>()
const todosQueryOptions = options.queryOptions({
	queryKey: ["todos"],
	queryFn: () => ApiClient.pipe(Effect.flatMap((client) => client.todos.getAll())),
	schema: Schema.Array(Todo),
})

// 4. Prefetch in loader
export const Route = createFileRoute("/")({
	async loader({ context }) {
		await context.queryClient.prefetchQuery(eq.toQueryOptions(todosQueryOptions, runtime))
	},
	component: App,
})

// 5. Use in component
function App() {
	const todos = eq.useSuspenseQuery(todosQueryOptions).pipe(
		Either.map(({ data }) => data),
		Either.getOrElse(() => [] as Todo[])
	)

	return <div>{/* render todos */}</div>
}
```

## Features

-   Effectful hooks with full type safety
-   Schema support for encode/decode
-   Abort signal handling
-   OpenTelemetry tracing via `Effect.withSpan`
-   Automatic runtime disposal
