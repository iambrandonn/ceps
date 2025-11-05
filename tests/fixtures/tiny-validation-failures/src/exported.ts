// This exported function will be detected by scanner/parser but deliberately
// won't have FactSets/Chunks to simulate coverage gap
export function uncoveredFunction() {
  return 'This function should fail coverage validation';
}
