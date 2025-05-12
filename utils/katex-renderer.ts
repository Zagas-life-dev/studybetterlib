/**
 * Utility function to render LaTeX math expressions using KaTeX
 */
export function renderMathWithKaTeX(content: string): string {
  if (!content) return ""

  try {
    // If we're running on the client and KaTeX is available
    if (typeof window !== "undefined" && window.katex) {
      // Process display math ($$...$$) first
      content = content.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
        try {
          return window.katex.renderToString(formula.trim(), {
            displayMode: true,
            throwOnError: false,
            errorColor: '#ff6b6b',
            strict: false,
            trust: true,
            macros: {
              "\\R": "\\mathbb{R}",
              "\\N": "\\mathbb{N}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
              "\\vec": "\\mathbf",
              "\\mat": "\\mathbf"
            }
          })
        } catch (error) {
          console.error("KaTeX display math error:", error)
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          return `<div class="katex-error" style="color: #ff6b6b; border-left: 3px solid #ff6b6b; padding-left: 10px; margin: 1em 0;">
            Error rendering math: ${errorMessage}<br>
            Original expression: ${formula}
          </div>`
        }
      })

      // Process inline math ($...$) with improved regex
      content = content.replace(/(?<!\\)\$(?!\s)((?:\\.|[^$\\])+?)(?<!\s)\$/g, (match, formula) => {
        try {
          const rendered = window.katex.renderToString(formula.trim(), {
            displayMode: false,
            throwOnError: false,
            errorColor: '#ff6b6b',
            strict: false,
            trust: true,
            macros: {
              "\\R": "\\mathbb{R}",
              "\\N": "\\mathbb{N}",
              "\\Z": "\\mathbb{Z}",
              "\\Q": "\\mathbb{Q}",
              "\\C": "\\mathbb{C}",
              "\\vec": "\\mathbf",
              "\\mat": "\\mathbf"
            }
          })
          return `<span class="katex-inline">${rendered}</span>`
        } catch (error) {
          console.error("KaTeX inline math error:", error)
          return `<span class="katex-error" style="color: #ff6b6b; padding: 0 3px;">
            <span class="katex-error-icon" style="margin-right: 3px;">⚠️</span>
            ${formula}
          </span>`
        }
      })
    }

    return content
  } catch (error) {
    console.error("Error rendering math:", error)
    return content
  }
}
