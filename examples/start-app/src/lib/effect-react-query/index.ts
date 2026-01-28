import { make } from "effect-tanstack-query"
import { ApiClient } from "../api/client"

export const eq = make(ApiClient.Default)
