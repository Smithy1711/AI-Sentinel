export function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function formatCategoryLabel(value: string) {
  switch (value) {
    case "weak_authz":
      return "Weak Authz";
    case "rag_data_exposure":
      return "RAG Data Exposure";
    case "abuse_controls":
      return "Abuse Controls";
    case "secrets_exposure":
      return "Secrets Exposure";
    case "prompt_leakage":
      return "Prompt Leakage";
    default:
      return formatEnumLabel(value);
  }
}

export function getInitials(value: string | null | undefined) {
  if (!value) {
    return "AR";
  }

  const parts = value.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}
