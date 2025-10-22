import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

const Toaster = ({
  ...props
}) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-gradient-to-r group-[.toaster]:from-[#0d0d0d] group-[.toaster]:to-[#111] group-[.toaster]:text-gray-100 group-[.toaster]:border-yellow-500/30 group-[.toaster]:shadow-gold group-[.toaster]:rounded-xl",
          description: "group-[.toast]:text-gray-300",
          actionButton:
            "group-[.toast]:bg-gradient-to-r group-[.toast]:from-yellow-500 group-[.toast]:to-amber-600 group-[.toast]:text-black group-[.toast]:font-bold group-[.toast]:rounded-lg",
          cancelButton:
            "group-[.toast]:bg-gray-800 group-[.toast]:text-gray-200 group-[.toast]:rounded-lg",
          success: "group-[.toast]:border-green-500/40 group-[.toast]:shadow-[0_4px_20px_rgba(34,197,94,0.25)]",
          error: "group-[.toast]:border-red-500/40 group-[.toast]:shadow-[0_4px_20px_rgba(239,68,68,0.25)]",
          info: "group-[.toast]:border-blue-500/40 group-[.toast]:shadow-[0_4px_20px_rgba(59,130,246,0.25)]",
        },
      }}
      {...props} />
  );
}

export { Toaster }
