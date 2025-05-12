declare global {
  interface Window {
    MathJax?: any
    katex?: {
      render: (expression: string, element: HTMLElement, options?: any) => void
      renderToString: (expression: string, options?: any) => string
    }
    renderMathInElement?: (element: HTMLElement, options: any) => void
    chatFunctions?: {
      addUserMessage: (content: string) => void
      addAiLoadingMessage: () => void
      updateLoadingMessageWithError: (errorMessage: string) => void
      handleStreamingResponse: (content: string) => void
      forceRefresh: () => Promise<void>
    }
  }
}

export {}
