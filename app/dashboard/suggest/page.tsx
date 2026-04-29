import SuggestionJar from '../SuggestionJar'

export default function SuggestPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-serif text-2xl font-semibold mb-2">Suggestion Jar</h1>
      <p className="text-sm text-muted-foreground mb-6">Got an idea? Drop it in.</p>
      <SuggestionJar />
    </div>
  )
}
