"use client"

import {
	useMutation as _useMutation,
	useQuery as _useQuery,
	useSuspenseQuery as _useSuspenseQuery,
	type QueryKey,
	type UseMutationResult,
	type UseQueryResult,
	type UseSuspenseQueryOptions,
	type UseSuspenseQueryResult,
} from "@tanstack/react-query"
import { Cause, Effect, Either, Layer, ManagedRuntime } from "effect"
import React, { useEffect, useMemo, useRef } from "react"
import type { MutationOptions, QueryOptions } from "./options"
import { toMutationOptions, toQueryOptions } from "./options"

const memoMap = Effect.runSync(Layer.makeMemoMap)

export function make<R, E = never>(layer: Layer.Layer<R, E>) {
	const RuntimeContext = React.createContext<ManagedRuntime.ManagedRuntime<R, E> | null>(null)

	function useRuntime() {
		const runtime = React.useContext(RuntimeContext)

		if (!runtime) throw new Error("useRuntime must be used within a RuntimeProvider")

		return runtime
	}

	function useQuery<TData = unknown, TError = never, TQueryFnData = TData, TQueryKey extends QueryKey = QueryKey>(
		options: QueryOptions<TData, TError, TQueryFnData, TQueryKey, R>
	): UseQueryResult<TData, Cause.Cause<TError>> {
		const runtime = useRuntime()

		const queryOptions = useMemo(() => toQueryOptions(options, runtime), [options, runtime])

		return _useQuery(queryOptions) as UseQueryResult<TData, Cause.Cause<TError>>
	}

	function useSuspenseQuery<
		TData = unknown,
		TError = unknown,
		TQueryFnData = TData,
		TQueryKey extends QueryKey = QueryKey
	>(
		options: QueryOptions<TData, TError, TQueryFnData, TQueryKey, R>
	): Either.Either<UseSuspenseQueryResult<TData, Cause.Cause<TError>>, Cause.Cause<TError>> {
		const runtime = useRuntime()

		const queryOptions = useMemo(
			() =>
				toQueryOptions(options, runtime, true) as UseSuspenseQueryOptions<
					TQueryFnData,
					Cause.Cause<TError>,
					TData,
					TQueryKey
				>,
			[options, runtime]
		)

		try {
			// eslint-disable-next-line react-compiler/react-compiler
			const query = _useSuspenseQuery<TQueryFnData, Cause.Cause<TError>, TData, TQueryKey>(
				queryOptions
			) as UseSuspenseQueryResult<TData, Cause.Cause<TError>>
			return useMemo(() => Either.right(query), [query])
		} catch (e) {
			if (e instanceof Promise) throw e

			return useMemo(() => Either.left((Cause.isCause(e) ? e : Cause.die(e)) as Cause.Cause<TError>), [e])
		}
	}

	function useMutation<TData = unknown, TError = never, TVariables = void, TOnMutateResult = unknown>(
		options: MutationOptions<TData, TError, TVariables, TOnMutateResult, R>
	): UseMutationResult<TData, Cause.Cause<TError>, TVariables, TOnMutateResult> {
		const runtime = useRuntime()

		const mutationOptions = useMemo(() => toMutationOptions(options, runtime), [options, runtime])

		return _useMutation(mutationOptions) as UseMutationResult<
			TData,
			Cause.Cause<TError>,
			TVariables,
			TOnMutateResult
		>
	}

	function RuntimeProvider(props: { children: React.ReactNode }) {
		const runtime = useMemo(() => ManagedRuntime.make(layer, memoMap), [])

		const mountedRef = useRef(false)

		useEffect(() => {
			if (!mountedRef.current) {
				mountedRef.current = true
				return
			}

			return () => {
				runtime.dispose()
			}
		}, [runtime])

		return <RuntimeContext.Provider value={runtime}>{props.children}</RuntimeContext.Provider>
	}

	return {
		useRuntime,
		RuntimeProvider,
		toQueryOptions,
		useQuery,
		useSuspenseQuery,
		toMutationOptions,
		useMutation,
	} as const
}
