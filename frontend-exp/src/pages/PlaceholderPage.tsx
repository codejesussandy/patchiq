import { Construction } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

interface PlaceholderPageProps {
  title: string
  description?: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">{title}</h1>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>

      <Card variant="elevated">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/20 text-warning mb-4">
            <Construction className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-semibold text-text mb-2">Coming Soon</h2>
          <p className="text-sm text-text-secondary text-center max-w-md">
            This page is currently under development. Check back soon for updates!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
