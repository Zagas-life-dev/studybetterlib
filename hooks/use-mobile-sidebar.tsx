import { useState, useEffect } from "react"

export function useMobileSidebar() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const sidebar = document.getElementById("mobile-sidebar")
    const toggle = document.getElementById("mobile-sidebar-toggle")
    const chatList = document.querySelector(".chat-list-container")

    function updateSidebar() {
      if (sidebar && chatList) {
        if (isOpen) {
          sidebar.classList.remove("-translate-x-full")
          // Move the chat list into the mobile sidebar
          sidebar.appendChild(chatList)
        } else {
          sidebar.classList.add("-translate-x-full")
          // Move the chat list back to its original container when sidebar is closed
          const originalContainer = document.querySelector(".chat-list-wrapper")
          if (originalContainer) {
            originalContainer.appendChild(chatList)
          }
        }
      }
    }

    function handleToggle() {
      setIsOpen(!isOpen)
    }

    function handleClickOutside(event: MouseEvent) {
      if (isOpen && sidebar && !sidebar.contains(event.target as Node) && event.target !== toggle) {
        setIsOpen(false)
      }
    }

    toggle?.addEventListener("click", handleToggle)
    document.addEventListener("click", handleClickOutside)

    updateSidebar()

    return () => {
      toggle?.removeEventListener("click", handleToggle)
      document.removeEventListener("click", handleClickOutside)
    }
  }, [isOpen])

  return { isOpen, setIsOpen }
}