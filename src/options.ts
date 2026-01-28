import type { QueryKey, UseMutationOptions, UseQueryOptions } from "@tanstack/react-query"
import { mutationOptions as _mutationOptions, queryOptions as _queryOptions } from "@tanstack/react-query"
import { Cause, Effect, Exit, ManagedRuntime, Schema } from "effect"
import type { Prettify } from "./utils"

export interface QueryOptions<
	TData = unknown,
	TError = never,
	TQueryFnData = TData,
	TQueryKey extends QueryKey = QueryKey,
	R = never
> extends Prettify<
		Omit<UseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, "queryFn"> & {
			queryFn: () => Effect.Effect<TData, TError, R>
			schema?: Schema.Schema<TData, TQueryFnData>
			consumeAbortSignal?: boolean
		}
	> {}

const makeQueryOptions =
	<R>() =>
	<TQueryFnData = unknown, TError = never, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(
		options: QueryOptions<TQueryFnData, TError, TData, TQueryKey, R>
	) =>
		options

export interface MutationOptions<
	TData = unknown,
	TError = never,
	TVariables = void,
	TOnMutateResult = unknown,
	R = never
> extends Prettify<
		Omit<UseMutationOptions<TData, Cause.Cause<TError>, TVariables, TOnMutateResult>, "mutationFn"> & {
			mutationFn: (variables: TVariables) => Effect.Effect<TData, TError, R>
		}
	> {}

const makeMutationOptions =
	<R>() =>
	<TData = unknown, TError = never, TVariables = void, TOnMutateResult = unknown>(
		options: MutationOptions<TData, TError, TVariables, TOnMutateResult, R>
	) =>
		options

export const makeOptions = <R>() => ({
	queryOptions: makeQueryOptions<R>(),
	mutationOptions: makeMutationOptions<R>(),
})

const runAbortablePromiseExit =
	<A, E, R, RE>(runtime: ManagedRuntime.ManagedRuntime<R, RE>, signal?: AbortSignal) =>
	(effect: Effect.Effect<A, E, R>) =>
		runtime.runPromiseExit(effect, { signal })

export function toQueryOptions<
	TData = unknown,
	TError = never,
	TQueryFnData = TData,
	TQueryKey extends QueryKey = QueryKey,
	R = never,
	RE = never
>(
	options: QueryOptions<TData, TError, TQueryFnData, TQueryKey, R>,
	runtime: ManagedRuntime.ManagedRuntime<R, RE>,
	suspense: boolean = false
): UseQueryOptions<TQueryFnData, Cause.Cause<TError>, TData, TQueryKey> {
	return _queryOptions({
		...options,
		queryFn: (ctx) =>
			options
				.queryFn()
				.pipe(
					Effect.withSpan(suspense ? "useSuspenseQuery" : "useQuery", {
						attributes: { queryKey: options.queryKey },
					}),
					!!options.consumeAbortSignal ? runAbortablePromiseExit(runtime, ctx.signal) : runtime.runPromiseExit
				)
				.then(
					Exit.match({
						onSuccess: (data): TQueryFnData =>
							options.schema
								? Schema.encodeSync(options.schema)(data)
								: (data as unknown as TQueryFnData),
						onFailure: (cause): TQueryFnData => {
							throw cause
						},
					})
				),
		select: (data) => (options.schema ? Schema.decodeSync(options.schema)(data) : data),
	}) as UseQueryOptions<TQueryFnData, Cause.Cause<TError>, TData, TQueryKey>
}

export function toMutationOptions<
	TData = unknown,
	TError = never,
	TVariables = void,
	TOnMutateResult = unknown,
	R = never,
	RE = never
>(
	options: MutationOptions<TData, TError, TVariables, TOnMutateResult, R>,
	runtime: ManagedRuntime.ManagedRuntime<R, RE>
): UseMutationOptions<TData, Cause.Cause<TError>, TVariables, TOnMutateResult> {
	return _mutationOptions({
		...options,
		mutationFn: (vars) =>
			options
				.mutationFn(vars)
				.pipe(
					Effect.withSpan("useMutation", {
						attributes: { mutationKey: options.mutationKey },
					}),
					runtime.runPromiseExit
				)
				.then(
					(exit) =>
						Exit.match(exit, {
							onSuccess: (data) => data,
							onFailure(cause) {
								throw cause
							},
						}) as TData
				),
	}) as UseMutationOptions<TData, Cause.Cause<TError>, TVariables, TOnMutateResult>
}
