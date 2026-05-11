export const stripPydanticPrefix = (msg: string): string =>
  msg.replace(/^Value error,\s*/i, "");

export const parseErrors = (
  data: any
): { global: string; fields: Record<string, string> } => {
  const result = { global: "", fields: {} as Record<string, string> };

  if (!data?.detail) {
    result.global = "Błąd serwera";
    return result;
  }

  if (typeof data.detail === "string") {
    result.global = data.detail;
    return result;
  }

  if (Array.isArray(data.detail)) {
    data.detail.forEach((err: any) => {
      const field = err.loc?.[1];
      const msg = stripPydanticPrefix(err.msg || "Błąd walidacji");

      if (field && typeof field === "string") {
        result.fields[field] = msg;
      } else {
        result.global += msg + " ";
      }
    });
    result.global = result.global.trim();
    return result;
  }

  result.global = JSON.stringify(data.detail);
  return result;
};
