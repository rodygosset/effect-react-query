import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { ApiClient } from "@/lib/api/client"
import { Todo, TodoId } from "@/lib/api/schemas"
import { eq } from "@/lib/effect-react-query"
import { options } from "@/lib/effect-react-query/options"
import { runtime } from "@/lib/effect-react-query/runtime"
import { cn } from "@/lib/utils"
import { useQueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { Effect, Either, Schema } from "effect"
import { Search, Trash2 } from "lucide-react"
import { useState } from "react"

const todosQueryOptions = options.queryOptions({
	queryKey: ["todos"],
	queryFn: () => ApiClient.pipe(Effect.flatMap((client) => client.todos.getAll())),
	schema: Schema.Array(Todo),
})

export const Route = createFileRoute("/")({
	async loader({ context }) {
		await new Promise((resolve) => setTimeout(resolve, 1000))
		await context.queryClient.prefetchQuery(eq.toQueryOptions(todosQueryOptions, runtime))
	},
	component: App,
	pendingComponent: Pending,
})

function Header(props: { completedCount: number; totalCount: number }) {
	return (
		<header className="mb-10">
			<h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Todos</h1>
			<p className="mt-2 text-muted-foreground">
				{props.completedCount} of {props.totalCount} completed
			</p>
		</header>
	)
}

function HeaderSkeleton() {
	return (
		<header className="mb-10">
			<h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">Todos</h1>
			<p className="mt-2 text-muted-foreground">
				<Skeleton className="h-4 w-16" /> of <Skeleton className="h-4 w-16" /> completed
			</p>
		</header>
	)
}

function SearchBar(props: { value: string; onValueChange: (value: string) => void }) {
	return (
		<div className="relative mb-6">
			<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search todos..."
				value={props.value}
				onChange={(e) => props.onValueChange(e.target.value)}
				className="h-11 bg-card pl-10 text-foreground placeholder:text-muted-foreground"
			/>
		</div>
	)
}

function TodoItem(props: { todo: Todo; onToggle: (id: TodoId) => void; onDelete: (id: TodoId) => void }) {
	const [isHovered, setIsHovered] = useState(false)

	return (
		<div
			className={cn(
				"group flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3.5 transition-all duration-200",
				"hover:border-muted-foreground/30 hover:bg-secondary/50"
			)}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
		>
			<Checkbox
				id={props.todo.id.toString()}
				checked={props.todo.completed}
				onCheckedChange={() => props.onToggle(props.todo.id)}
				className="h-5 w-5 rounded-full border-muted-foreground/50 data-[state=checked]:border-foreground data-[state=checked]:bg-foreground data-[state=checked]:text-background"
			/>
			<div className="flex-1 min-w-0">
				<label
					htmlFor={props.todo.id.toString()}
					className={cn(
						"block cursor-pointer truncate text-sm font-medium transition-all duration-200",
						props.todo.completed ? "text-muted-foreground line-through" : "text-foreground"
					)}
				>
					{props.todo.title}
				</label>
				<span className="text-xs text-muted-foreground/70">ID: {props.todo.id}</span>
			</div>
			<button
				onClick={() => props.onDelete(props.todo.id)}
				className={cn(
					"p-1.5 rounded-md text-muted-foreground transition-all duration-200",
					"hover:bg-destructive/10 hover:text-destructive",
					isHovered ? "opacity-100" : "opacity-0"
				)}
				aria-label={`Delete task: ${props.todo.title}`}
			>
				<Trash2 className="h-4 w-4" />
			</button>
		</div>
	)
}

function TodoItemSkeleton() {
	return <Skeleton className="h-10 w-full" />
}

function TodoListSkeleton() {
	return (
		<div className="space-y-2">
			<TodoItemSkeleton />
			<TodoItemSkeleton />
			<TodoItemSkeleton />
			<TodoItemSkeleton />
		</div>
	)
}

function TodoList(props: {
	filteredTodos: Todo[]
	searchQuery: string
	onToggle: (todoId: TodoId) => void
	onDelete: (todoId: TodoId) => void
}) {
	return (
		<div className="space-y-2">
			{props.filteredTodos.length === 0 ? (
				<div className="py-12 text-center">
					<p className="text-muted-foreground">{props.searchQuery ? "No todos found" : "No todos yet"}</p>
				</div>
			) : (
				props.filteredTodos.map((todo) => (
					<TodoItem
						key={todo.id}
						todo={todo}
						onToggle={props.onToggle}
						onDelete={props.onDelete}
					/>
				))
			)}
		</div>
	)
}

function Pending() {
	return (
		<main className="min-h-screen bg-background dark">
			<div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
				<HeaderSkeleton />
				<SearchBar
					value=""
					onValueChange={() => {}}
				/>
				<TodoListSkeleton />
			</div>
		</main>
	)
}

function App() {
	const todos = eq.useSuspenseQuery(todosQueryOptions).pipe(
		Either.map(({ data }) => data),
		Either.getOrElse(() => [] as Todo[])
	)

	const [searchQuery, setSearchQuery] = useState("")

	const filteredTodos = todos.filter((todo) => todo.title.toLowerCase().includes(searchQuery.toLowerCase()))

	const completedCount = todos.filter((todo) => todo.completed).length

	const queryClient = useQueryClient()

	function onToggle(todoId: TodoId) {
		queryClient.setQueryData(todosQueryOptions.queryKey, (old: (typeof Todo.Encoded)[]) =>
			old?.map((todo) =>
				todo.id === todoId ? ({ ...todo, completed: !todo.completed } satisfies typeof Todo.Encoded) : todo
			)
		)
	}

	function onDelete(todoId: TodoId) {
		queryClient.setQueryData(todosQueryOptions.queryKey, (old: (typeof Todo.Encoded)[]) =>
			old?.filter((todo) => todo.id !== todoId)
		)
	}

	return (
		<main className="min-h-screen bg-background dark">
			<div className="mx-auto max-w-2xl px-4 py-12 md:py-20">
				<Header
					completedCount={completedCount}
					totalCount={todos.length}
				/>
				<SearchBar
					value={searchQuery}
					onValueChange={setSearchQuery}
				/>
				<TodoList
					filteredTodos={filteredTodos}
					searchQuery={searchQuery}
					onToggle={onToggle}
					onDelete={onDelete}
				/>
			</div>
		</main>
	)
}
