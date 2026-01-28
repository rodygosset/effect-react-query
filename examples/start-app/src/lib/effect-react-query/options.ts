import { makeOptions } from "effect-tanstack-query"
import { ApiClient } from "../api/client"

export const options = makeOptions<ApiClient>()
