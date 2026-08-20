import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-AE', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-AE', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

export function isOverdue(dueDate: Date | string): boolean {
  return new Date(dueDate) < new Date()
}
