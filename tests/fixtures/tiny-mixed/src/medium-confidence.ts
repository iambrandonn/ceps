// Medium confidence: Some documentation, basic implementation
export function processData(data: string) {
  const parts = data.split(',');
  return parts.map(p => p.trim());
}

// No JSDoc, but has type annotations
export function validateInput(input: string): boolean {
  return input.length > 0 && input.length < 100;
}
