interface EmptyStateProps {
  message: string;
  description?: string;
}

export function EmptyState({ message, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-lg font-medium text-gray-400">{message}</p>
      {description && <p className="mt-2 text-sm text-gray-500">{description}</p>}
    </div>
  );
}
