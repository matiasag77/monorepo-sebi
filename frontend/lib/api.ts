import type { User, Conversation, ChatSuggestion } from "@/types"

const API_URL = process.env.NEXT_PUBLIC_API_URL

let token: string | null = null

export function setToken(newToken: string) {
  token = newToken
  if (typeof window !== "undefined") {
    localStorage.setItem("backend_token", newToken)
  }
}

export function clearToken() {
  token = null
  if (typeof window !== "undefined") {
    localStorage.removeItem("backend_token")
  }
}

function getToken(): string | null {
  if (token) return token
  if (typeof window !== "undefined") {
    return localStorage.getItem("backend_token")
  }
  return null
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const currentToken = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  }

  if (currentToken) {
    headers["Authorization"] = `Bearer ${currentToken}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    // Handle expired or invalid token
    if (res.status === 401) {
      clearToken()
      if (typeof window !== "undefined") {
        window.location.href = "/login"
      }
      throw new Error("Session expired. Please log in again.")
    }
    const error = await res.json().catch(() => ({ message: "Request failed" }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }

  return res.json()
}

// Users
export async function getUsers(): Promise<User[]> {
  return request<User[]>("/users")
}

export async function updateUser(
  id: string,
  updates: { isActive?: boolean; role?: string }
): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  })
}

export async function deleteUser(id: string): Promise<void> {
  return request<void>(`/users/${id}`, { method: "DELETE" })
}

export async function registerUser(formData: {
  name: string
  email: string
  password: string
  role: string
}): Promise<User> {
  return request<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify(formData),
  })
}

// Conversations
export async function getConversations(): Promise<Conversation[]> {
  return request<Conversation[]>("/conversations")
}

export async function getConversation(id: string): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`)
}

export async function createConversation(
  title: string
): Promise<{ _id: string }> {
  return request<{ _id: string }>("/conversations", {
    method: "POST",
    body: JSON.stringify({ title }),
  })
}

export async function updateConversation(
  id: string,
  updates: { title: string }
): Promise<Conversation> {
  return request<Conversation>(`/conversations/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  })
}

export async function deleteConversation(id: string): Promise<void> {
  return request<void>(`/conversations/${id}`, { method: "DELETE" })
}

// Chat
export interface SendMessageResponse {
  assistantMessage: { content: string; timestamp: string; role: string }
  table?: Record<string, unknown>[] | null
  chart?: Record<string, unknown> | null
  proactivo?: string | null
  context?: string | null
  intermediateSteps?: string[]
}

export async function sendMessage(
  conversationId: string,
  message: string
): Promise<SendMessageResponse> {
  return request(`/conversations/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content: message }),
  })
}

export async function getSuggestions(): Promise<ChatSuggestion[]> {
  const data = await request<{ suggestions: string[] }>("/chat/suggestions")
  return data.suggestions.map((text, i) => ({
    id: String(i),
    text,
    category: "general",
  }))
}

export async function registerPublic(formData: {
  name: string
  email: string
  password: string
}): Promise<{ access_token: string; user: { id: string; email: string; name: string; role: string; avatar?: string } }> {
  return request("/auth/register-public", {
    method: "POST",
    body: JSON.stringify(formData),
  })
}

// Tracking
export async function getTrackingEvents(
  page: number,
  limit: number
): Promise<{ events: { _id: string; userId: string; action: string; metadata?: Record<string, unknown>; createdAt: string }[] }> {
  return request(`/tracking/events?page=${page}&limit=${limit}`)
}
