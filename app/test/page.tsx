export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Routing Test Page</h1>
      <p className="text-muted-foreground mb-4">
        If you see this page, routing is working correctly.
      </p>
      <p className="mb-4">
        Try navigating to:
      </p>
      <ul className="space-y-2 list-disc list-inside">
        <li><a href="/dashboard" className="text-blue-500 hover:underline">/dashboard</a></li>
        <li><a href="/dashboard/websites" className="text-blue-500 hover:underline">/dashboard/websites</a></li>
        <li><a href="/dashboard/domains" className="text-blue-500 hover:underline">/dashboard/domains</a></li>
      </ul>
    </div>
  );
}
